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
  const googleAuthController = require('../controllers/googleAuthController')(db);

  // 傳統認證路由
  // 註冊
  router.post('/register', authController.register);

  // 登入
  router.post('/login', authController.login);

  // 登出
  router.post('/logout', authController.logout);

  // 獲取當前用戶
  router.get('/me', authenticateUser, authController.getCurrentUser);

  // **新增：忘記密碼功能**
  router.post('/forgot-password', authController.forgotPassword);

  // **新增：重置密碼功能**
  router.post('/reset-password', authController.resetPassword);

  // Google OAuth 2.0 認證路由
  // Google 登入
  router.post('/google/login', googleAuthController.googleLogin);

  // Google 註冊
  router.post('/google/register', googleAuthController.googleRegister);

  // 檢查 Google OAuth 配置狀態
  router.get('/google/config', googleAuthController.checkGoogleOAuthConfig);

  return router;
}; 