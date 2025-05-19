const express = require('express');
const router = express.Router();
const { getSettings, updateSettings } = require('../controllers/settingsController');
const { authenticateUser, authenticateDoctor } = require('../middlewares/auth'); // 修正引用路徑

module.exports = (db) => {
  // 獲取應用程式設定 (假設所有已認證用戶都可以獲取)
  router.get('/', authenticateUser, getSettings(db));

  // 更新應用程式設定 (只有 'doctor' 或 'admin' 角色的用戶可以更新)
  // 注意：目前 settings 表是全局的，不是針對特定醫生。如果需要按醫生區分設定，則需修改表結構和邏輯。
  router.put('/', authenticateDoctor, updateSettings(db));

  return router;
}; 