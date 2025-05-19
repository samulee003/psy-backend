/**
 * 用戶管理相關路由
 */

const express = require('express');
const { authenticateUser, authenticateAdmin } = require('../middlewares/auth');

// 創建路由
const router = express.Router();

module.exports = (db) => {
  // 引入控制器
  const userController = require('../controllers/userController')(db);

  // 獲取所有用戶 (僅管理員可訪問)
  router.get('/', authenticateAdmin, userController.getAllUsers);

  // 獲取醫生列表 (所有已認證用戶可訪問)
  router.get('/doctors', authenticateUser, userController.getDoctors);

  // 獲取單個用戶 (僅管理員或該用戶本人可訪問)
  router.get('/:userId', authenticateUser, (req, res, next) => {
    if (req.user.role === 'admin' || req.user.id === parseInt(req.params.userId)) {
      return next();
    }
    res.status(403).json({ error: '無權訪問此用戶信息' });
  }, userController.getUserById);

  // 更新用戶 (僅管理員或該用戶本人可訪問)
  router.put('/:userId', authenticateUser, (req, res, next) => {
    if (req.user.role === 'admin' || req.user.id === parseInt(req.params.userId)) {
      return next();
    }
    res.status(403).json({ error: '無權更新此用戶信息' });
  }, userController.updateUser);

  // 刪除用戶 (僅管理員可訪問)
  router.delete('/:userId', authenticateAdmin, userController.deleteUser);

  return router;
}; 