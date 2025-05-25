/**
 * Google OAuth 2.0 身份驗證控制器
 */

const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../middlewares/auth');
const googleAuth = require('../middlewares/googleAuth');

/**
 * Google 登入端點
 * 處理現有用戶的 Google 登入
 */
const googleLogin = (db) => async (req, res) => {
  try {
    const { idToken } = req.body;

    console.log('[Google Auth] 開始處理 Google 登入請求');

    // 驗證必填參數
    if (!idToken) {
      return res.status(400).json({
        success: false,
        error: '缺少必要的 Google ID Token'
      });
    }

    // 驗證 Google Token
    const googleUserInfo = await googleAuth.verifyGoogleToken(idToken);
    
    console.log('[Google Auth] Google Token 驗證成功，查找現有用戶');

    // 查找現有用戶
    const existingUser = await googleAuth.findExistingUser(
      db, 
      googleUserInfo.email, 
      googleUserInfo.googleId
    );

    if (!existingUser) {
      return res.status(404).json({
        success: false,
        error: '用戶不存在，請先註冊或使用 Google 註冊功能',
        suggestion: 'register',
        userEmail: googleUserInfo.email
      });
    }

    // 如果用戶存在但沒有 Google ID，更新用戶資料
    if (!existingUser.google_id) {
      console.log('[Google Auth] 為現有用戶添加 Google ID');
      
      const updateQuery = `
        UPDATE users 
        SET google_id = ?, profile_picture = ?, updated_at = datetime('now')
        WHERE id = ?
      `;
      
      await new Promise((resolve, reject) => {
        db.run(updateQuery, [googleUserInfo.googleId, googleUserInfo.picture, existingUser.id], function(err) {
          if (err) {
            console.error('[Google Auth] 更新用戶 Google 資料失敗:', err.message);
            reject(err);
          } else {
            console.log('[Google Auth] 用戶 Google 資料更新成功');
            resolve();
          }
        });
      });

      // 更新本地用戶資料
      existingUser.google_id = googleUserInfo.googleId;
      existingUser.profile_picture = googleUserInfo.picture;
    }

    // 生成 JWT Token
    const tokenPayload = googleAuth.formatUserForToken(existingUser);
    const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: '24h' });

    console.log('[Google Auth] Google 登入成功，設置 Cookie:', existingUser.id, existingUser.email);

    // 設置 Cookie
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 24 * 60 * 60 * 1000, // 24小時
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      path: '/'
    };
    
    res.cookie('token', token, cookieOptions);

    // 返回成功回應
    res.json({
      success: true,
      message: 'Google 登入成功',
      user: {
        id: existingUser.id,
        name: existingUser.name,
        email: existingUser.email,
        role: existingUser.role,
        phone: existingUser.phone,
        profilePicture: existingUser.profile_picture
      },
      token: token,
      authMethod: 'google'
    });

  } catch (error) {
    console.error('[Google Auth] Google 登入失敗:', error.message);
    
    // 根據錯誤類型返回適當的回應
    if (error.message.includes('Google 身份驗證失敗') || 
        error.message.includes('Token')) {
      return res.status(401).json({
        success: false,
        error: 'Google 身份驗證失敗，請重新嘗試',
        details: error.message
      });
    }
    
    res.status(500).json({
      success: false,
      error: '登入過程中發生錯誤',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Google 註冊端點
 * 處理 Google 用戶的新用戶註冊
 */
const googleRegister = (db) => async (req, res) => {
  try {
    const { idToken, role = 'patient' } = req.body;

    console.log('[Google Auth] 開始處理 Google 註冊請求');

    // 驗證必填參數
    if (!idToken) {
      return res.status(400).json({
        success: false,
        error: '缺少必要的 Google ID Token'
      });
    }

    // 驗證角色
    if (!['patient', 'doctor', 'admin'].includes(role)) {
      return res.status(400).json({
        success: false,
        error: '無效的用戶角色'
      });
    }

    // 驗證 Google Token
    const googleUserInfo = await googleAuth.verifyGoogleToken(idToken);
    
    console.log('[Google Auth] Google Token 驗證成功，檢查用戶是否已存在');

    // 檢查用戶是否已存在
    const existingUser = await googleAuth.findExistingUser(
      db, 
      googleUserInfo.email, 
      googleUserInfo.googleId
    );

    if (existingUser) {
      return res.status(409).json({
        success: false,
        error: '此 Google 帳戶已被註冊，請直接登入',
        suggestion: 'login',
        userEmail: googleUserInfo.email,
        hasGoogleId: !!existingUser.google_id
      });
    }

    // 創建新用戶
    console.log('[Google Auth] 創建新的 Google 用戶');
    
    const newUser = await googleAuth.createOrUpdateGoogleUser(db, googleUserInfo, role);

    // 生成 JWT Token
    const tokenPayload = googleAuth.formatUserForToken(newUser);
    const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: '24h' });

    console.log('[Google Auth] Google 註冊成功，設置 Cookie:', newUser.id, newUser.email);

    // 設置 Cookie
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 24 * 60 * 60 * 1000, // 24小時
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      path: '/'
    };
    
    res.cookie('token', token, cookieOptions);

    // 返回成功回應
    res.status(201).json({
      success: true,
      message: 'Google 註冊成功',
      user: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        phone: newUser.phone,
        profilePicture: googleUserInfo.picture
      },
      token: token,
      authMethod: 'google'
    });

  } catch (error) {
    console.error('[Google Auth] Google 註冊失敗:', error.message);
    
    // 根據錯誤類型返回適當的回應
    if (error.message.includes('Google 身份驗證失敗') || 
        error.message.includes('Token')) {
      return res.status(401).json({
        success: false,
        error: 'Google 身份驗證失敗，請重新嘗試',
        details: error.message
      });
    } else if (error.message.includes('已被其他帳戶使用')) {
      return res.status(409).json({
        success: false,
        error: '此郵箱已被其他帳戶使用',
        suggestion: 'login'
      });
    }
    
    res.status(500).json({
      success: false,
      error: '註冊過程中發生錯誤',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * 檢查 Google OAuth 配置狀態
 * 用於前端檢查後端是否正確配置了 Google OAuth
 */
const checkGoogleOAuthConfig = (req, res) => {
  try {
    const hasClientId = !!process.env.GOOGLE_CLIENT_ID;
    const hasClientSecret = !!process.env.GOOGLE_CLIENT_SECRET;
    
    res.json({
      success: true,
      configured: hasClientId && hasClientSecret,
      details: {
        hasClientId,
        hasClientSecret: hasClientSecret,
        clientId: hasClientId ? process.env.GOOGLE_CLIENT_ID.substring(0, 20) + '...' : null
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: '檢查配置時發生錯誤'
    });
  }
};

module.exports = (db) => ({
  googleLogin: googleLogin(db),
  googleRegister: googleRegister(db),
  checkGoogleOAuthConfig
}); 