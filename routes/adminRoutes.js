/**
 * 管理員路由
 */

const express = require('express');
const { authenticateUser, requireRole } = require('../middlewares/auth');

const router = express.Router();

module.exports = (db) => {
  const userController = require('../controllers/userController')(db);
  const adminController = require('../controllers/adminController')(db);

  // 所有管理員路由都需要登入和管理員權限
  router.use(authenticateUser);
  router.use(requireRole('admin'));

  // 用戶管理
  router.get('/users', userController.getAllUsers);
  router.get('/users/:id', userController.getUserById);
  router.put('/users/:id', userController.updateUser);
  router.delete('/users/:id', userController.deleteUser);

  // **新增：資料庫架構更新 API**
  router.post('/update-schema', async (req, res) => {
    try {
      console.log('[管理員] 開始執行資料庫架構更新...');
      
      // 檢查 users 表密碼重置功能欄位
      const usersTableInfo = await new Promise((resolve, reject) => {
        db.all("PRAGMA table_info(users)", [], (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        });
      });

      console.log('[管理員] users 表欄位:', usersTableInfo.map(c => c.name).join(', '));

      const updates = [];

      // 檢查並添加 reset_token 欄位
      const hasResetToken = usersTableInfo.some(column => column.name === 'reset_token');
      if (!hasResetToken) {
        console.log('[管理員] 添加 reset_token 欄位...');
        await new Promise((resolve, reject) => {
          db.run("ALTER TABLE users ADD COLUMN reset_token TEXT", function(err) {
            if (err) reject(err);
            else {
              updates.push('添加 reset_token 欄位');
              resolve();
            }
          });
        });
      }

      // 檢查並添加 reset_token_expiry 欄位
      const hasResetTokenExpiry = usersTableInfo.some(column => column.name === 'reset_token_expiry');
      if (!hasResetTokenExpiry) {
        console.log('[管理員] 添加 reset_token_expiry 欄位...');
        await new Promise((resolve, reject) => {
          db.run("ALTER TABLE users ADD COLUMN reset_token_expiry TEXT", function(err) {
            if (err) reject(err);
            else {
              updates.push('添加 reset_token_expiry 欄位');
              resolve();
            }
          });
        });
      }

      if (updates.length === 0) {
        updates.push('無需更新，所有欄位已存在');
      }

      console.log('[管理員] 架構更新完成:', updates);

      res.json({
        success: true,
        message: '資料庫架構更新完成',
        updates: updates
      });

    } catch (error) {
      console.error('[管理員] 架構更新失敗:', error.message);
      res.status(500).json({
        success: false,
        error: '資料庫架構更新失敗: ' + error.message
      });
    }
  });

  // 其他管理員功能
  router.get('/dashboard', adminController.getDashboard);

  return router;
}; 