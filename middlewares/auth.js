/**
 * 身份驗證相關中間件
 */

const jwt = require('jsonwebtoken');

// JWT 密鑰
const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret';

// 驗證用戶身份中間件
const authenticateUser = (req, res, next) => {
  // 更詳細的日誌
  console.log('[Auth] 開始處理身份驗證...');
  console.log('[Auth] Cookies:', req.cookies);
  console.log('[Auth] Authorization頭:', req.headers['authorization']);
  
  // 從請求中獲取令牌
  const token = req.cookies.token || req.headers['authorization']?.split(' ')[1];

  console.log('[Auth] 提取的Token:', token ? `${token.substring(0, 10)}...` : 'undefined');

  // 如果沒有令牌，返回未授權錯誤
  if (!token) {
    console.log('[Auth] 未找到有效的身份令牌');
    return res.status(401).json({ error: '需要登入才能訪問' });
  }

  try {
    // 驗證令牌
    const decoded = jwt.verify(token, JWT_SECRET);
    console.log('[Auth] 令牌驗證成功:', decoded.id, decoded.email, decoded.role);
    req.user = decoded;
    next();
  } catch (error) {
    console.error('[Auth] 令牌驗證失敗:', error.message);
    
    // 如果是令牌過期，提供更具體的錯誤訊息
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: '登入已過期，請重新登入' });
    }
    
    return res.status(401).json({ error: '無效的登入憑證，請重新登入' });
  }
};

// 添加一個不驗證但附加 user 的中間件，用於非必須登入的 API
const optionalAuthentication = (req, res, next) => {
  const token = req.cookies.token || req.headers['authorization']?.split(' ')[1];
  
  if (!token) {
    return next(); // 繼續處理，但不設置 req.user
  }
  
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
  } catch (error) {
    // 忽略令牌無效的情況，只是不設置 req.user
    console.log('[Auth] 選擇性驗證失敗，忽略:', error.message);
  }
  
  next();
};

// 驗證管理員身份中間件
const authenticateAdmin = (req, res, next) => {
  // 首先驗證用戶身份
  authenticateUser(req, res, () => {
    // 然後檢查是否為管理員
    if (req.user.role === 'admin') {
      next();
    } else {
      res.status(403).json({ error: '需要管理員權限才能訪問' });
    }
  });
};

// 驗證醫生身份中間件
const authenticateDoctor = (req, res, next) => {
  // 首先驗證用戶身份
  authenticateUser(req, res, () => {
    // 然後檢查是否為醫生或管理員
    if (req.user.role === 'doctor' || req.user.role === 'admin') {
      next();
    } else {
      res.status(403).json({ error: '需要醫生權限才能訪問' });
    }
  });
};

// 驗證患者身份中間件
const authenticatePatient = (req, res, next) => {
  // 首先驗證用戶身份
  authenticateUser(req, res, () => {
    // 然後檢查是否為患者或管理員
    if (req.user.role === 'patient' || req.user.role === 'admin') {
      next();
    } else {
      res.status(403).json({ error: '需要患者權限才能訪問' });
    }
  });
};

module.exports = {
  JWT_SECRET,
  authenticateUser,
  authenticateAdmin,
  authenticateDoctor,
  authenticatePatient,
  optionalAuthentication
}; 