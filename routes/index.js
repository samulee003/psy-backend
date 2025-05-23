/**
 * 路由索引，匯集並導出所有路由
 */

const express = require('express');

module.exports = (db) => {
  const router = express.Router();

  // 引入各個路由模組
  const authRoutes = require('./authRoutes')(db);
  const userRoutes = require('./userRoutes')(db);
  const appointmentRoutes = require('./appointmentRoutes')(db);
  const scheduleRoutes = require('./scheduleRoutes')(db);
  const settingsRoutes = require('./settingsRoutes')(db);
  const adminRoutes = require('./adminRoutes')(db);

  // 掛載路由
  router.use('/api/auth', authRoutes);
  router.use('/api/users', userRoutes);
  router.use('/api/appointments', appointmentRoutes);
  router.use('/api/schedules', scheduleRoutes);
  router.use('/api/settings', settingsRoutes);
  router.use('/api/admin', adminRoutes);

  // 直接添加登入與註冊路由，以匹配前端的 API 調用
  const authController = require('../controllers/authController')(db);
  router.post('/api/login1', authController.login);
  router.post('/api/register1', authController.register);

  // 健康檢查端點
  router.get('/api/health', (req, res) => {
    res.status(200).json({
      status: 'ok',
      message: '伺服器運行正常',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      cors: 'enabled'
    });
  });
  
  return router;
}; 