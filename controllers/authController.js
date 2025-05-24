/**
 * 身份驗證相關控制器
 */

const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../middlewares/auth');
const validators = require('../utils/validators');

// 註冊新用戶
const register = (db) => async (req, res) => {
  try {
    const { name, email, password, role = 'patient', username, phone } = req.body;

    // 使用 email 或 username 作為用戶 email，如果 email 為空且 username 存在，則將 username 賦值給 email
    const userEmail = email || username;
    const modifiedBody = { ...req.body, email: userEmail };

    // 驗證用戶輸入
    const validation = validators.validateUser(modifiedBody);
    if (!validation.isValid) {
      console.log('[Auth] 註冊錯誤: 驗證失敗', validation.error);
      return res.status(400).json({ success: false, error: validation.error });
    }

    console.log('[Auth] 開始處理註冊請求:', { name, email: userEmail, role });

    // 驗證必填欄位
    if (!name || !userEmail || !password) {
      return res.status(400).json({ success: false, error: '姓名、電子郵件和密碼都是必填的' });
    }

    // **修復：更嚴格的重複註冊檢查**
    console.log('[Auth] 檢查電子郵件是否已存在:', userEmail);
    
    // 分別檢查 email 和 username 欄位
    const checkUserQuery = `
      SELECT id, email, username, name 
      FROM users 
      WHERE email = ? OR username = ?
    `;
    
    db.get(checkUserQuery, [userEmail, userEmail], async (err, existingUser) => {
      if (err) {
        console.error('[Auth] 查詢用戶時發生錯誤:', err.message);
        return res.status(500).json({ success: false, error: '伺服器錯誤，請稍後再試' });
      }

      if (existingUser) {
        console.log('[Auth] 發現重複用戶:', { 
          existingId: existingUser.id, 
          existingEmail: existingUser.email,
          existingUsername: existingUser.username,
          attemptedEmail: userEmail 
        });
        
        return res.status(400).json({ 
          success: false, 
          error: `此電子郵件 "${userEmail}" 已被註冊，請直接登入或使用其他電子郵件`,
          suggestion: 'login',
          existingEmail: userEmail
        });
      }

      // 沒有重複用戶，可以繼續註冊
      try {
        // 加密密碼
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);

        // 準備插入數據
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
            
            // 檢查是否為唯一性約束錯誤（雙重保護）
            if (err.message.includes('UNIQUE constraint failed')) {
              return res.status(400).json({ 
                success: false, 
                error: `此電子郵件 "${userEmail}" 已被註冊，請直接登入`,
                suggestion: 'login',
                existingEmail: userEmail
              });
            }
            
            return res.status(500).json({ success: false, error: '無法創建用戶，請稍後再試' });
          }

          console.log('[Auth] 用戶創建成功, ID:', this.lastID);

          // 生成JWT令牌
          const token = jwt.sign(
            { id: this.lastID, name, email: userEmail, role },
            JWT_SECRET,
            { expiresIn: '24h' }
          );

          console.log('[Auth] 用戶註冊成功，設置 Cookie:', this.lastID, userEmail, role);

          // 設置 cookie
          const cookieOptions = {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            maxAge: 24 * 60 * 60 * 1000, // 24小時
            sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
            path: '/'
          };
          
          res.cookie('token', token, cookieOptions);

          // 回傳成功信息
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
            token: token
          });
        });
      } catch (hashError) {
        console.error('[Auth] 密碼加密錯誤:', hashError.message);
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
const getCurrentUser = (db) => (req, res) => {
  try {
    console.log('[Auth] 獲取當前用戶: ', req.user ? req.user.id : 'No user');
    
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: '未授權，請先登入'
      });
    }

    // 從資料庫查詢完整的用戶資料，包括 phone 欄位
    db.get('SELECT id, name, email, role, phone, created_at FROM users WHERE id = ?', [req.user.id], (err, user) => {
      if (err) {
        console.error('[Auth] 查詢用戶資料時發生錯誤:', err.message);
        return res.status(500).json({
          success: false,
          error: '獲取用戶資訊時發生錯誤'
        });
      }

      if (!user) {
        console.error('[Auth] 用戶不存在:', req.user.id);
        return res.status(404).json({
          success: false,
          error: '用戶不存在'
        });
      }

      console.log('[Auth] 成功獲取用戶資料:', { id: user.id, email: user.email, phone: user.phone });

      // 返回完整的用戶資料（不包含密碼）
      res.json({
        success: true,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          phone: user.phone,
          created_at: user.created_at
        }
      });
    });
  } catch (error) {
    console.error('[Auth] 獲取當前用戶時發生錯誤:', error);
    res.status(500).json({
      success: false,
      error: '獲取用戶資訊時發生錯誤'
    });
  }
};

// **新增：忘記密碼功能**
const forgotPassword = (db) => async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ 
        success: false, 
        error: '請提供電子郵件地址' 
      });
    }

    console.log('[Auth] 處理忘記密碼請求:', email);

    // 查詢用戶是否存在
    db.get('SELECT id, name, email FROM users WHERE email = ? OR username = ?', [email, email], async (err, user) => {
      if (err) {
        console.error('[Auth] 查詢用戶時發生錯誤:', err.message);
        return res.status(500).json({ success: false, error: '伺服器錯誤' });
      }

      if (!user) {
        // 為了安全起見，不透露用戶是否存在
        return res.json({
          success: true,
          message: '如果該電子郵件地址存在於我們的系統中，您將收到密碼重置郵件'
        });
      }

      try {
        // 生成重置令牌（6位隨機數字）
        const resetToken = Math.floor(100000 + Math.random() * 900000).toString();
        const resetTokenExpiry = new Date(Date.now() + 15 * 60 * 1000); // 15分鐘後過期

        // 將重置令牌存儲到資料庫
        const updateQuery = `
          UPDATE users 
          SET reset_token = ?, reset_token_expiry = ? 
          WHERE id = ?
        `;

        db.run(updateQuery, [resetToken, resetTokenExpiry.toISOString(), user.id], function(err) {
          if (err) {
            console.error('[Auth] 更新重置令牌時發生錯誤:', err.message);
            return res.status(500).json({ success: false, error: '處理請求時發生錯誤' });
          }

          console.log('[Auth] 重置令牌已生成:', { userId: user.id, token: resetToken });

          // 發送重置郵件
          const emailService = require('../utils/emailService');
          
          const emailData = {
            to: user.email,
            subject: '密碼重置 - 心理治療預約系統',
            html: `
              <h2>密碼重置請求</h2>
              <p>親愛的 ${user.name}，</p>
              <p>您的密碼重置驗證碼是：</p>
              <h1 style="color: #4CAF50; font-size: 32px; text-align: center; padding: 20px; border: 2px solid #4CAF50; border-radius: 10px; background-color: #f9f9f9;">${resetToken}</h1>
              <p>此驗證碼將在 <strong>15分鐘</strong> 後失效。</p>
              <p>如果您沒有要求重置密碼，請忽略此郵件。</p>
              <p>如有任何問題，請聯繫我們的客服。</p>
              <hr>
              <p><small>心理治療預約系統</small></p>
            `
          };

          emailService.sendPasswordResetEmail(emailData)
            .then(() => {
              console.log('[Auth] 密碼重置郵件已發送至:', user.email);
            })
            .catch((emailError) => {
              console.error('[Auth] 發送重置郵件失敗:', emailError.message);
              // 不阻塞回應，但記錄錯誤
            });

          // 回傳成功回應
          res.json({
            success: true,
            message: '密碼重置郵件已發送，請檢查您的郵箱',
            // 在開發環境中提供令牌（生產環境中應移除）
            ...(process.env.NODE_ENV !== 'production' && { devToken: resetToken })
          });
        });
      } catch (error) {
        console.error('[Auth] 處理忘記密碼時發生錯誤:', error.message);
        res.status(500).json({ success: false, error: '處理請求時發生錯誤' });
      }
    });
  } catch (error) {
    console.error('[Auth] 忘記密碼功能發生錯誤:', error.message);
    res.status(500).json({ success: false, error: '服務暫時不可用' });
  }
};

// **新增：重置密碼功能**
const resetPassword = (db) => async (req, res) => {
  try {
    const { email, resetToken, newPassword } = req.body;

    if (!email || !resetToken || !newPassword) {
      return res.status(400).json({ 
        success: false, 
        error: '請提供電子郵件、重置碼和新密碼' 
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ 
        success: false, 
        error: '新密碼長度必須至少為 6 個字符' 
      });
    }

    console.log('[Auth] 處理密碼重置請求:', { email, resetToken });

    // 查詢用戶和驗證重置令牌
    const query = `
      SELECT id, name, email, reset_token, reset_token_expiry 
      FROM users 
      WHERE (email = ? OR username = ?) AND reset_token = ?
    `;

    db.get(query, [email, email, resetToken], async (err, user) => {
      if (err) {
        console.error('[Auth] 查詢重置令牌時發生錯誤:', err.message);
        return res.status(500).json({ success: false, error: '伺服器錯誤' });
      }

      if (!user) {
        return res.status(400).json({ 
          success: false, 
          error: '無效的重置碼或電子郵件' 
        });
      }

      // 檢查令牌是否過期
      const now = new Date();
      const tokenExpiry = new Date(user.reset_token_expiry);

      if (now > tokenExpiry) {
        return res.status(400).json({ 
          success: false, 
          error: '重置碼已過期，請重新申請密碼重置' 
        });
      }

      try {
        // 加密新密碼
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

        // 更新密碼並清除重置令牌
        const updateQuery = `
          UPDATE users 
          SET password = ?, reset_token = NULL, reset_token_expiry = NULL 
          WHERE id = ?
        `;

        db.run(updateQuery, [hashedPassword, user.id], function(err) {
          if (err) {
            console.error('[Auth] 更新密碼時發生錯誤:', err.message);
            return res.status(500).json({ success: false, error: '更新密碼時發生錯誤' });
          }

          console.log('[Auth] 密碼重置成功:', { userId: user.id, email: user.email });

          res.json({
            success: true,
            message: '密碼重置成功，請使用新密碼登入'
          });
        });
      } catch (hashError) {
        console.error('[Auth] 密碼加密錯誤:', hashError.message);
        res.status(500).json({ success: false, error: '處理新密碼時發生錯誤' });
      }
    });
  } catch (error) {
    console.error('[Auth] 重置密碼功能發生錯誤:', error.message);
    res.status(500).json({ success: false, error: '服務暫時不可用' });
  }
};

module.exports = (db) => ({
  register: register(db),
  login: login(db),
  logout,
  getCurrentUser: getCurrentUser(db),
  forgotPassword: forgotPassword(db),
  resetPassword: resetPassword(db)
}); 