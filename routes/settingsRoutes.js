const express = require('express');
const router = express.Router();
const { getSettings, updateSettings } = require('../controllers/settingsController');
const { authenticateUser, authenticateDoctor } = require('../middlewares/auth'); // 修正引用路徑

// 獲取應用程式設定 (假設所有已認證用戶都可以獲取)
router.get('/', authenticateUser, (req, res) => {
  // 從 req.app.locals 或其他地方獲取 db 實例
  const db = req.app.get('db');
  getSettings(db)(req, res);
});

// 更新應用程式設定 (只有 'doctor' 或 'admin' 角色的用戶可以更新)
// 注意：目前 settings 表是全局的，不是針對特定醫生。如果需要按醫生區分設定，則需修改表結構和邏輯。
router.put('/', authenticateDoctor, (req, res) => { // 使用 authenticateDoctor 代替 authorizeRole
  const db = req.app.get('db');
  updateSettings(db)(req, res);
});

module.exports = router; 