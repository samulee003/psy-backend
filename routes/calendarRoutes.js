
const express = require('express');
const { authenticateUser, authenticateDoctor } = require('../middlewares/auth');

const router = express.Router();

module.exports = (db) => {
  const calendarController = require('../controllers/calendarController')(db);

  // 公開路由：用於行事曆訂閱 (不經過認證中間件，透過 token 校驗)
  router.get('/feed/:token', calendarController.getCalendarFeed);

  // 受保護路由：獲取和重置 Token
  router.get('/token', authenticateUser, authenticateDoctor, calendarController.getCalendarToken);
  router.post('/token/reset', authenticateUser, authenticateDoctor, calendarController.resetCalendarToken);

  return router;
};
