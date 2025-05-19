/**
 * 身份驗證相關路由
 */

const express = require('express');
const { authenticateUser } = require('../middlewares/auth');

// 創建路由
const router = express.Router();

module.exports = (db) => {
  // 引入控制器
  const authController = require('../controllers/authController')(db);

  // 註冊
  router.post('/register', authController.register);

  // 登入
  router.post('/login', authController.login);

  // 登出
  router.post('/logout', authController.logout);

  // 獲取當前用戶
  router.get('/me', authenticateUser, authController.getCurrentUser);

  return router;
}; 