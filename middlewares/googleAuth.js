/**
 * Google OAuth 2.0 驗證中間件
 * 處理 Google 身份驗證和用戶資訊提取
 */

const { OAuth2Client } = require('google-auth-library');

// 初始化 Google OAuth 2.0 客戶端
const getGoogleClient = () => {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  
  if (!clientId || !clientSecret) {
    throw new Error('Google OAuth 配置不完整：請設置 GOOGLE_CLIENT_ID 和 GOOGLE_CLIENT_SECRET 環境變數');
  }
  
  return new OAuth2Client(clientId, clientSecret);
};

/**
 * 驗證 Google ID Token
 * @param {string} idToken - Google ID Token
 * @returns {Promise<Object>} - 解析後的用戶資訊
 */
async function verifyGoogleToken(idToken) {
  try {
    console.log('[Google Auth] 開始驗證 Google ID Token');
    
    const client = getGoogleClient();
    
    // 驗證 ID Token
    const ticket = await client.verifyIdToken({
      idToken: idToken,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    
    const payload = ticket.getPayload();
    
    if (!payload) {
      throw new Error('無法從 Google Token 中提取用戶資訊');
    }
    
    console.log('[Google Auth] Google Token 驗證成功:', {
      userId: payload.sub,
      email: payload.email,
      name: payload.name,
      emailVerified: payload.email_verified
    });
    
    // 格式化並返回用戶資訊
    const userInfo = {
      googleId: payload.sub,
      email: payload.email,
      name: payload.name,
      picture: payload.picture,
      emailVerified: payload.email_verified,
      locale: payload.locale,
      // 額外的安全檢查資訊
      tokenIssuer: payload.iss,
      tokenAudience: payload.aud,
      tokenExpiry: payload.exp,
      tokenIssuedAt: payload.iat
    };
    
    // 驗證 token 是否來自 Google
    if (payload.iss !== 'https://accounts.google.com' && payload.iss !== 'accounts.google.com') {
      throw new Error('Token 不是來自 Google 官方服務');
    }
    
    // 驗證 audience 是否匹配
    if (payload.aud !== process.env.GOOGLE_CLIENT_ID) {
      throw new Error('Token audience 不匹配，可能是安全風險');
    }
    
    // 檢查 email 是否已驗證
    if (!payload.email_verified) {
      console.warn('[Google Auth] 警告：Google 帳戶郵箱未驗證:', payload.email);
    }
    
    return userInfo;
    
  } catch (error) {
    console.error('[Google Auth] Token 驗證失敗:', error.message);
    
    // 區分不同類型的錯誤
    if (error.message.includes('Token used too early')) {
      throw new Error('Token 使用時間過早，請檢查系統時間');
    } else if (error.message.includes('Token used too late')) {
      throw new Error('Token 已過期，請重新獲取');
    } else if (error.message.includes('Invalid token signature')) {
      throw new Error('Token 簽名無效，可能被篡改');
    } else if (error.message.includes('Invalid token')) {
      throw new Error('無效的 Google Token');
    } else {
      throw new Error(`Google 身份驗證失敗: ${error.message}`);
    }
  }
}

/**
 * 檢查用戶是否已存在於資料庫中
 * @param {Object} db - 資料庫實例
 * @param {string} email - 用戶郵箱
 * @param {string} googleId - Google 用戶 ID
 * @returns {Promise<Object|null>} - 用戶資料或 null
 */
async function findExistingUser(db, email, googleId) {
  return new Promise((resolve, reject) => {
    const query = `
      SELECT id, name, email, role, google_id, phone, created_at 
      FROM users 
      WHERE email = ? OR google_id = ?
    `;
    
    db.get(query, [email, googleId], (err, user) => {
      if (err) {
        console.error('[Google Auth] 查詢用戶時發生錯誤:', err.message);
        reject(new Error('查詢用戶資料時發生錯誤'));
        return;
      }
      
      if (user) {
        console.log('[Google Auth] 找到現有用戶:', {
          id: user.id,
          email: user.email,
          hasGoogleId: !!user.google_id
        });
      } else {
        console.log('[Google Auth] 未找到現有用戶，可以創建新帳戶');
      }
      
      resolve(user);
    });
  });
}

/**
 * 創建或更新 Google 用戶
 * @param {Object} db - 資料庫實例
 * @param {Object} googleUserInfo - Google 用戶資訊
 * @param {string} role - 用戶角色
 * @returns {Promise<Object>} - 用戶資料
 */
async function createOrUpdateGoogleUser(db, googleUserInfo, role = 'patient') {
  return new Promise(async (resolve, reject) => {
    try {
      const existingUser = await findExistingUser(db, googleUserInfo.email, googleUserInfo.googleId);
      
      if (existingUser) {
        // 用戶已存在，更新 Google ID（如果還沒有）
        if (!existingUser.google_id) {
          const updateQuery = `
            UPDATE users 
            SET google_id = ?, updated_at = datetime('now')
            WHERE id = ?
          `;
          
          db.run(updateQuery, [googleUserInfo.googleId, existingUser.id], function(err) {
            if (err) {
              console.error('[Google Auth] 更新用戶 Google ID 失敗:', err.message);
              reject(new Error('更新用戶資料失敗'));
              return;
            }
            
            console.log('[Google Auth] 已為現有用戶添加 Google ID:', existingUser.id);
            
            // 返回更新後的用戶資料
            resolve({
              ...existingUser,
              google_id: googleUserInfo.googleId
            });
          });
        } else {
          // 用戶已有 Google ID，直接返回
          resolve(existingUser);
        }
      } else {
        // 創建新用戶
        const insertQuery = `
          INSERT INTO users (name, email, username, password, role, google_id, created_at)
          VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
        `;
        
        const values = [
          googleUserInfo.name,
          googleUserInfo.email,
          googleUserInfo.email, // 使用 email 作為 username
          Math.random().toString(36).slice(-8), // 隨機生成密碼
          role,
          googleUserInfo.googleId
        ];
        
        db.run(insertQuery, values, function(err) {
          if (err) {
            console.error('[Google Auth] 創建 Google 用戶失敗:', err.message);
            
            if (err.message.includes('UNIQUE constraint failed')) {
              reject(new Error('此郵箱已被其他帳戶使用'));
            } else {
              reject(new Error('創建用戶失敗'));
            }
            return;
          }
          
          console.log('[Google Auth] Google 用戶創建成功:', {
            id: this.lastID,
            email: googleUserInfo.email,
            name: googleUserInfo.name
          });
          
          // 返回新創建的用戶資料
          resolve({
            id: this.lastID,
            name: googleUserInfo.name,
            email: googleUserInfo.email,
            role: role,
            google_id: googleUserInfo.googleId,
            phone: null,
            created_at: new Date().toISOString()
          });
        });
      }
    } catch (error) {
      console.error('[Google Auth] 創建或更新用戶時發生錯誤:', error.message);
      reject(error);
    }
  });
}

/**
 * 格式化用戶資料用於 JWT Token
 * @param {Object} user - 用戶資料
 * @returns {Object} - 格式化後的用戶資料
 */
function formatUserForToken(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    authMethod: 'google'
  };
}

module.exports = {
  verifyGoogleToken,
  findExistingUser,
  createOrUpdateGoogleUser,
  formatUserForToken,
  getGoogleClient
}; 