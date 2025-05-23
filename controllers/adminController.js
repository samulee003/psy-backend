/**
 * 管理員功能控制器
 */

// 獲取管理員儀表板資料
const getDashboard = (db) => async (req, res) => {
  try {
    console.log('[管理員] 獲取儀表板資料...');

    // 獲取統計資料
    const stats = await Promise.all([
      // 用戶總數
      new Promise((resolve, reject) => {
        db.get('SELECT COUNT(*) as count FROM users', [], (err, row) => {
          if (err) reject(err);
          else resolve({ totalUsers: row.count });
        });
      }),
      
      // 預約總數
      new Promise((resolve, reject) => {
        db.get('SELECT COUNT(*) as count FROM appointments', [], (err, row) => {
          if (err) reject(err);
          else resolve({ totalAppointments: row.count });
        });
      }),
      
      // 今日預約數
      new Promise((resolve, reject) => {
        const today = new Date().toISOString().split('T')[0];
        db.get('SELECT COUNT(*) as count FROM appointments WHERE date = ?', [today], (err, row) => {
          if (err) reject(err);
          else resolve({ todayAppointments: row.count });
        });
      }),
      
      // 各角色用戶數
      new Promise((resolve, reject) => {
        db.all('SELECT role, COUNT(*) as count FROM users GROUP BY role', [], (err, rows) => {
          if (err) reject(err);
          else {
            const roleStats = {};
            rows.forEach(row => {
              roleStats[row.role] = row.count;
            });
            resolve({ roleStats });
          }
        });
      })
    ]);

    // 合併統計資料
    const dashboardData = {
      ...stats[0], // totalUsers
      ...stats[1], // totalAppointments
      ...stats[2], // todayAppointments
      ...stats[3], // roleStats
      lastUpdated: new Date().toISOString()
    };

    console.log('[管理員] 儀表板資料:', dashboardData);

    res.json({
      success: true,
      data: dashboardData
    });

  } catch (error) {
    console.error('[管理員] 獲取儀表板資料失敗:', error.message);
    res.status(500).json({
      success: false,
      error: '獲取儀表板資料失敗'
    });
  }
};

// 獲取系統日誌（簡化版本）
const getSystemLogs = (db) => async (req, res) => {
  try {
    const { limit = 100 } = req.query;
    
    // 這裡可以實現獲取系統日誌的邏輯
    // 目前返回模擬資料
    const logs = [
      {
        id: 1,
        timestamp: new Date().toISOString(),
        level: 'info',
        message: '系統正常運行',
        source: 'system'
      }
    ];

    res.json({
      success: true,
      data: logs
    });

  } catch (error) {
    console.error('[管理員] 獲取系統日誌失敗:', error.message);
    res.status(500).json({
      success: false,
      error: '獲取系統日誌失敗'
    });
  }
};

module.exports = (db) => ({
  getDashboard: getDashboard(db),
  getSystemLogs: getSystemLogs(db)
}); 