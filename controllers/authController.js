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
      return res.status(400).json({ error: '姓名、電子郵件和密碼都是必填的' });
    }

    // 檢查郵箱是否已經註冊 - 修改: 同時檢查email和username欄位
    const checkQuery = 'SELECT * FROM users WHERE email = ? OR username = ?';
    console.log('[Auth] 執行重複用戶檢查:', checkQuery, [userEmail, userEmail]);
    
    db.get(checkQuery, [userEmail, userEmail], async (err, user) => {
      if (err) {
        console.error('[Auth] 查詢用戶時發生錯誤:', err.message);
        return res.status(500).json({ error: '伺服器錯誤' });
      }

      if (user) {
        console.log('[Auth] 註冊錯誤: 用戶已存在', user);
        return res.status(400).json({ error: '此電子郵件或用戶名已被註冊' });
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
            return res.status(500).json({ error: '無法創建用戶' });
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
        res.status(500).json({ error: '註冊過程中發生錯誤' });
      }
    });
  } catch (error) {
    console.error('[Auth] 註冊過程中發生錯誤:', error.message);
    res.status(500).json({ error: '註冊失敗，請稍後再試' });
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
      return res.status(400).json({ error: '電子郵件和密碼都是必填的' });
    }

    // 查詢用戶
    db.get('SELECT * FROM users WHERE email = ?', [userEmail], async (err, user) => {
      if (err) {
        console.error('查詢用戶時發生錯誤:', err.message);
        return res.status(500).json({ error: '伺服器錯誤' });
      }

      if (!user) {
        return res.status(401).json({ error: '無效的電子郵件或密碼' });
      }

      try {
        // 驗證密碼
        const match = await bcrypt.compare(password, user.password);
        
        if (!match) {
          return res.status(401).json({ error: '無效的電子郵件或密碼' });
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
        res.status(500).json({ error: '登入過程中發生錯誤' });
      }
    });
  } catch (error) {
    console.error('登入過程中發生錯誤:', error.message);
    res.status(500).json({ error: '登入失敗，請稍後再試' });
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

// 獲取當前用戶信息
const getCurrentUser = (req, res) => {
  console.log('[Auth] 處理獲取當前用戶信息請求');
  // 用戶資訊應該已經在身份驗證中間件中被添加到請求對象 (req.user)
  if (req.user) {
    console.log('[Auth] 已找到認證用戶:', req.user.id, req.user.email, req.user.role);
    res.json({
      success: true,
      user: {
        id: req.user.id,
        name: req.user.name,
        email: req.user.email,
        role: req.user.role
      }
    });
  } else {
    // 這種情況理論上不應該發生，因為 authenticateUser 中間件會處理未授權的情況
    // 但作為防禦性程式設計，還是加上
    console.error('[AuthCtrl] getCurrentUser: req.user 未定義，即使在 authenticateUser 之後');
    res.status(401).json({ 
      success: false,
      error: '無法獲取用戶信息，請重新登入' 
    });
  }
};

module.exports = (db) => ({
  register: register(db),
  login: login(db),
  logout,
  getCurrentUser
}); 