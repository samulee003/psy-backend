/**
 * 預約管理相關路由
 */

const express = require('express');
const { authenticateUser, authenticateAdmin, authenticateDoctor, authenticatePatient } = require('../middlewares/auth');

// 創建路由
const router = express.Router();

module.exports = (db) => {
  // 引入控制器
  const appointmentController = require('../controllers/appointmentController')(db);
  console.log('[DEBUG] appointmentController object:', appointmentController);
  console.log('[DEBUG] typeof appointmentController.getAppointmentById:', typeof appointmentController.getAppointmentById);

  // 創建預約 (所有已認證用戶可訪問)
  router.post('/', authenticateUser, appointmentController.createAppointment);

  // 獲取預約列表 (根據用戶角色過濾)
  router.get('/', authenticateUser, appointmentController.getAppointments);

  // 新增：獲取「我的」預約，取代舊的 / (GET) 路由中的部分邏輯
  router.get('/my', authenticateUser, appointmentController.getMyAppointments);

  // 獲取單個預約 (根據用戶角色檢查權限)
  router.get('/:appointmentId', authenticateUser, appointmentController.getAppointmentById);

  // 更新預約狀態 (根據用戶角色和操作類型檢查權限)
  router.put('/:appointmentId/status', authenticateUser, appointmentController.updateAppointmentStatus);

  // 新增：取消預約（向下相容前端）
  router.put('/:appointmentId/cancel', authenticateUser, (req, res, next) => {
    req.body.status = 'cancelled';
    return appointmentController.updateAppointmentStatus(req, res, next);
  });

  // 刪除預約 (僅管理員和醫生可訪問)
  router.delete('/:appointmentId', (req, res, next) => {
    if (req.user.role === 'admin') {
      return authenticateAdmin(req, res, next);
    } else {
      return authenticateDoctor(req, res, next);
    }
  }, appointmentController.deleteAppointment);

  return router;
}; 