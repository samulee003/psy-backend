/**
 * Google OAuth 2.0 身份驗證控制器
 */

const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../middlewares/auth');
const googleAuth = require('../middlewares/googleAuth');

// 確保 fetch 可用 (Node.js 18+ 原生支援或使用 node-fetch)
const fetch = globalThis.fetch || require('node-fetch');

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
    let googleUserInfo;
    try {
      googleUserInfo = await googleAuth.verifyGoogleToken(idToken);
      console.log('[Google Auth] Google Token 驗證成功，查找現有用戶');
    } catch (tokenError) {
      console.error('[Google Auth] Google Token 驗證失敗:', tokenError.message);
      return res.status(401).json({
        success: false,
        error: 'Google 身份驗證失敗，請重新嘗試',
        details: tokenError.message
      });
    }

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
    let googleUserInfo;
    try {
      googleUserInfo = await googleAuth.verifyGoogleToken(idToken);
      console.log('[Google Auth] Google Token 驗證成功，檢查用戶是否已存在');
    } catch (tokenError) {
      console.error('[Google Auth] Google Token 驗證失敗:', tokenError.message);
      return res.status(401).json({
        success: false,
        error: 'Google 身份驗證失敗，請重新嘗試',
        details: tokenError.message
      });
    }

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
 * Google OAuth 回調端點
 * 處理 authorization code 並交換用戶資訊
 */
const googleCallback = (db) => async (req, res) => {
  try {
    const { code, mode, role = 'patient' } = req.body;

    console.log('[Google OAuth Callback] 開始處理 OAuth 回調請求，模式:', mode);

    // 驗證必填參數
    if (!code) {
      return res.status(400).json({
        success: false,
        error: '缺少必要的 authorization code'
      });
    }

    if (!mode || !['login', 'register'].includes(mode)) {
      return res.status(400).json({
        success: false,
        error: '無效的認證模式，請指定 login 或 register'
      });
    }

    // 驗證 Google OAuth 配置
    if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
      console.error('[Google OAuth Callback] 缺少 Google OAuth 配置');
      return res.status(500).json({
        success: false,
        error: '伺服器 Google OAuth 配置不完整'
      });
    }

    // 1. 使用 authorization code 交換 access token
    console.log('[Google OAuth Callback] 正在交換 authorization code 為 access token');
    
    // 從請求頭或環境變數獲取重定向 URI
    const origin = req.headers.origin || req.headers.referer || 'http://localhost:8080';
    
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        code,
        client_id: process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        redirect_uri: origin,
        grant_type: 'authorization_code',
      }),
    });

    const tokens = await tokenResponse.json();
    
    if (!tokens.access_token) {
      console.error('[Google OAuth Callback] 無法獲取 access token:', tokens);
      throw new Error('無法獲取 Google access token: ' + (tokens.error_description || tokens.error || 'Unknown error'));
    }

    console.log('[Google OAuth Callback] 成功獲取 access token');

    // 2. 使用 access token 獲取用戶資訊
    console.log('[Google OAuth Callback] 正在獲取用戶資訊');
    
    const userResponse = await fetch(`https://www.googleapis.com/oauth2/v2/userinfo?access_token=${tokens.access_token}`);
    
    if (!userResponse.ok) {
      throw new Error('無法獲取 Google 用戶資訊');
    }
    
    const userData = await userResponse.json();
    
    if (!userData.email || !userData.id) {
      throw new Error('Google 用戶資訊不完整');
    }

    console.log('[Google OAuth Callback] 成功獲取用戶資訊:', userData.email);

    // 3. 格式化用戶資訊
    const googleUserInfo = {
      googleId: userData.id,
      email: userData.email,
      name: userData.name || userData.email.split('@')[0],
      picture: userData.picture || null,
      emailVerified: userData.verified_email || true
    };

    // 4. 根據模式處理登入或註冊
    let user;
    
    if (mode === 'register') {
      // 註冊模式：創建新用戶
      console.log('[Google OAuth Callback] 註冊模式：檢查用戶是否已存在');
      
      // 驗證角色
      if (!['patient', 'doctor', 'admin'].includes(role)) {
        return res.status(400).json({
          success: false,
          error: '無效的用戶角色'
        });
      }

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
      console.log('[Google OAuth Callback] 創建新的 Google 用戶');
      user = await googleAuth.createOrUpdateGoogleUser(db, googleUserInfo, role);

    } else {
      // 登入模式：查找現有用戶
      console.log('[Google OAuth Callback] 登入模式：查找現有用戶');
      
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
        console.log('[Google OAuth Callback] 為現有用戶添加 Google ID');
        
        const updateQuery = `
          UPDATE users 
          SET google_id = ?, profile_picture = ?, updated_at = datetime('now')
          WHERE id = ?
        `;
        
        await new Promise((resolve, reject) => {
          db.run(updateQuery, [googleUserInfo.googleId, googleUserInfo.picture, existingUser.id], function(err) {
            if (err) {
              console.error('[Google OAuth Callback] 更新用戶 Google 資料失敗:', err.message);
              reject(err);
            } else {
              console.log('[Google OAuth Callback] 用戶 Google 資料更新成功');
              resolve();
            }
          });
        });

        // 更新本地用戶資料
        existingUser.google_id = googleUserInfo.googleId;
        existingUser.profile_picture = googleUserInfo.picture;
      }

      user = existingUser;
    }

    // 5. 生成 JWT token
    const tokenPayload = googleAuth.formatUserForToken(user);
    const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: '24h' });

    console.log('[Google OAuth Callback] 認證成功，設置 Cookie:', user.id, user.email);

    // 6. 設置 Cookie
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 24 * 60 * 60 * 1000, // 24小時
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      path: '/'
    };
    
    res.cookie('token', token, cookieOptions);

    // 7. 返回成功回應
    res.json({
      success: true,
      message: mode === 'register' ? 'Google 註冊成功' : 'Google 登入成功',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone || null,
        profilePicture: user.profile_picture
      },
      token: token,
      authMethod: 'google',
      mode: mode
    });

  } catch (error) {
    console.error('[Google OAuth Callback] OAuth 回調失敗:', error.message);
    
    // 根據錯誤類型返回適當的回應
    if (error.message.includes('無法獲取') || 
        error.message.includes('access token') ||
        error.message.includes('用戶資訊')) {
      return res.status(401).json({
        success: false,
        error: 'Google OAuth 認證失敗，請重新嘗試',
        details: error.message
      });
    } else if (error.message.includes('已被其他帳戶使用') ||
               error.message.includes('已被註冊')) {
      return res.status(409).json({
        success: false,
        error: error.message,
        suggestion: 'login'
      });
    }
    
    res.status(500).json({
      success: false,
      error: 'OAuth 認證過程中發生錯誤',
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
      clientId: hasClientId ? process.env.GOOGLE_CLIENT_ID : null,
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
  googleCallback: googleCallback(db),
  checkGoogleOAuthConfig
}); 