/**
 * 身份驗證相關控制器
 */

const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../middlewares/auth');

// 註冊新用戶
const register = (db) => async (req, res) => {
  try {
    const { name, email, password, role = 'patient', username, phone } = req.body;
    
    // 使用 email 或 username 作為用戶 email
    const userEmail = email || username;

    console.log('[Auth] 開始處理註冊請求:', { name, email: userEmail, role });

    // 驗證必填欄位
    if (!name || !userEmail || !password) {
      console.log('[Auth] 註冊錯誤: 缺少必填欄位');
      return res.status(400).json({ success: false, error: '姓名、電子郵件和密碼都是必填的' });
    }

    // 檢查郵箱是否已經註冊 - 修改: 更明確地檢查email和username欄位
    const checkQuery = 'SELECT * FROM users WHERE email = ? OR username = ?';
    console.log('[Auth] 執行重複用戶檢查:', checkQuery, [userEmail, userEmail]);
    
    db.get(checkQuery, [userEmail, userEmail], async (err, user) => {
      if (err) {
        console.error('[Auth] 查詢用戶時發生錯誤:', err.message);
        return res.status(500).json({ success: false, error: '伺服器錯誤' });
      }

      if (user) {
        // 更詳細的日誌，顯示哪個字段匹配
        if (user.email === userEmail) {
          console.log('[Auth] 註冊錯誤: 電子郵件已存在', user.email);
          return res.status(400).json({ success: false, error: '此電子郵件已被註冊' });
        }
        if (user.username === userEmail) {
          console.log('[Auth] 註冊錯誤: 用戶名已存在', user.username);
          return res.status(400).json({ success: false, error: '此用戶名已被註冊' });
        }
        
        console.log('[Auth] 註冊錯誤: 用戶已存在', user);
        return res.status(400).json({ success: false, error: '此電子郵件或用戶名已被註冊' });
      }

      try {
        // 加密密碼
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);

        // 準備插入數據，包括可選的電話號碼
        const fields = ['name', 'email', 'username', 'password', 'role'];
        const values = [name, userEmail, userEmail, hashedPassword, role];
        let placeholders = '?, ?, ?, ?, ?';
        
        // 如果提供了電話號碼，加入到查詢中
        if (phone) {
          fields.push('phone');
          values.push(phone);
          placeholders += ', ?';
        }
        
        // 構建動態查詢
        const fieldsStr = fields.join(', ');
        const query = `
          INSERT INTO users (${fieldsStr}, created_at)
          VALUES (${placeholders}, datetime('now'))
        `;
        
        console.log('[Auth] 準備創建新用戶:', { name, email: userEmail, role });
        
        // 插入新用戶
        db.run(query, values, function(err) {
          if (err) {
            console.error('[Auth] 創建用戶時發生錯誤:', err.message);
            
            // 檢查是否為唯一性約束錯誤
            if (err.message.includes('UNIQUE constraint failed')) {
              if (err.message.includes('users.email')) {
                return res.status(400).json({ success: false, error: '此電子郵件已被註冊' });
              }
              if (err.message.includes('users.username')) {
                return res.status(400).json({ success: false, error: '此用戶名已被註冊' });
              }
              return res.status(400).json({ success: false, error: '此電子郵件或用戶名已被註冊' });
            }
            
            return res.status(500).json({ success: false, error: '無法創建用戶' });
          }

          console.log('[Auth] 用戶創建成功, ID:', this.lastID);

          // 生成JWT令牌
          const token = jwt.sign(
            { id: this.lastID, name, email: userEmail, role },
            JWT_SECRET,
            { expiresIn: '24h' }
          );

          console.log('[Auth] 用戶註冊成功，設置 Cookie:', this.lastID, userEmail, role);

          // 更安全的 cookie 設置
          const cookieOptions = {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            maxAge: 24 * 60 * 60 * 1000, // 24小時
            sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
            path: '/' // 確保整個網站都能訪問 cookie
          };
          
          console.log('[Auth] 設置 cookie 選項:', JSON.stringify(cookieOptions));
          res.cookie('token', token, cookieOptions);

          // 回傳成功信息，添加token到回應中，讓前端可以存入localStorage
          res.status(201).json({
            success: true,
            message: '註冊成功',
            user: {
              id: this.lastID,
              name,
              email: userEmail,
              role,
              phone: phone || null
            },
            token: token // 明確提供 token 供前端存儲在 localStorage
          });
        });
      } catch (err) {
        console.error('[Auth] 密碼加密錯誤:', err.message);
        res.status(500).json({ success: false, error: '註冊過程中發生錯誤' });
      }
    });
  } catch (error) {
    console.error('[Auth] 註冊過程中發生錯誤:', error.message);
    res.status(500).json({ success: false, error: '註冊失敗，請稍後再試' });
  }
};

// 用戶登入
const login = (db) => async (req, res) => {
  try {
    console.log('[Auth] 開始處理登入請求:', req.body);
    
    // 修改：使用 email 或 username
    const { email, username, password } = req.body;
    const userEmail = email || username; // 優先使用 email，若沒有則使用 username

    // 驗證必填欄位
    if (!userEmail || !password) {
      return res.status(400).json({ success: false, error: '電子郵件和密碼都是必填的' });
    }

    // 查詢用戶
    db.get('SELECT * FROM users WHERE email = ? OR username = ?', [userEmail, userEmail], async (err, user) => {
      if (err) {
        console.error('查詢用戶時發生錯誤:', err.message);
        return res.status(500).json({ success: false, error: '伺服器錯誤' });
      }

      if (!user) {
        return res.status(401).json({ success: false, error: '無效的電子郵件或密碼' });
      }

      try {
        // 驗證密碼
        const match = await bcrypt.compare(password, user.password);
        
        if (!match) {
          return res.status(401).json({ success: false, error: '無效的電子郵件或密碼' });
        }

        // 生成JWT令牌
        const token = jwt.sign(
          { id: user.id, name: user.name, email: user.email, role: user.role },
          JWT_SECRET,
          { expiresIn: '24h' }
        );

        console.log('[Auth] 登入成功，設置 Cookie:', user.id, user.email, user.role);

        // 更安全的 cookie 設置
        const cookieOptions = {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production', // 在生產環境中必須為 true
          maxAge: 24 * 60 * 60 * 1000, // 24小時
          sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax', // 生產環境使用 none 以支持跨站點
          path: '/' // 確保整個網站都能訪問 cookie
        };
        
        console.log('[Auth] 設置 cookie 選項:', JSON.stringify(cookieOptions));
        res.cookie('token', token, cookieOptions);

        // 回傳成功信息，包括token用於前端存儲
        res.json({
          success: true,
          message: '登入成功',
          user: {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role
          },
          token: token // 明確提供 token 供前端存儲在 localStorage
        });
      } catch (error) {
        console.error('密碼驗證錯誤:', error.message);
        res.status(500).json({ success: false, error: '登入過程中發生錯誤' });
      }
    });
  } catch (error) {
    console.error('登入過程中發生錯誤:', error.message);
    res.status(500).json({ success: false, error: '登入失敗，請稍後再試' });
  }
};

// 登出
const logout = (req, res) => {
  console.log('[Auth] 處理登出請求');
  
  const cookieOptions = {
    path: '/',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax'
  };
  
  console.log('[Auth] 清除 cookie 選項:', JSON.stringify(cookieOptions));
  res.clearCookie('token', cookieOptions);
  
  res.json({
    success: true,
    message: '已成功登出'
  });
};

// 獲取當前用戶
const getCurrentUser = (req, res) => {
  try {
    console.log('[Auth] 獲取當前用戶: ', req.user ? req.user.id : 'No user');
    
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: '未授權，請先登入'
      });
    }

    // 注意：我們不回傳密碼
    res.json({
      success: true,
      user: {
        id: req.user.id,
        name: req.user.name,
        email: req.user.email,
        role: req.user.role
      }
    });
  } catch (error) {
    console.error('[Auth] 獲取當前用戶時發生錯誤:', error);
    res.status(500).json({
      success: false,
      error: '獲取用戶資訊時發生錯誤'
    });
  }
};

module.exports = (db) => ({
  register: register(db),
  login: login(db),
  logout,
  getCurrentUser
}); 