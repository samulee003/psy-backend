
const ics = require('ics');
const moment = require('moment-timezone');

/**
 * 生成醫生的行事曆 ICS 內容
 */
const getCalendarFeed = (db) => (req, res) => {
  const { token } = req.params;

  if (!token) {
    return res.status(400).send('Missing token');
  }

  // 1. 查找對應 Token 的醫生
  const userQuery = 'SELECT id, name FROM users WHERE calendar_token = ? AND role = "doctor"';
  db.get(userQuery, [token], (err, doctor) => {
    if (err || !doctor) {
      console.error('[Calendar] Invalid token or error:', err);
      return res.status(404).send('Invalid calendar token');
    }

    // 2. 獲取該醫生的預約列表
    const appointmentsQuery = `
      SELECT a.*, p.name as patient_name, a.patient_info
      FROM appointments a
      JOIN users p ON a.patient_id = p.id
      WHERE a.doctor_id = ? AND a.status = 'confirmed'
      ORDER BY a.date DESC, a.time ASC
    `;

    db.all(appointmentsQuery, [doctor.id], (err, appointments) => {
      if (err) {
        console.error('[Calendar] Error fetching appointments:', err);
        return res.status(500).send('Internal server error');
      }

      // 3. 轉換為 ICS 事件格式
      const events = appointments.map((app) => {
        // 解析日期和時間
        // app.date 格式通常是 'YYYY-MM-DD'
        // app.time 格式通常是 'HH:mm'
        const startDateTime = moment.tz(`${app.date} ${app.time}`, 'YYYY-MM-DD HH:mm', 'Asia/Hong_Kong').utc();
        
        // 處理就診者姓名
        let displayPatientName = app.patient_name;
        if (app.patient_info) {
          try {
            const info = JSON.parse(app.patient_info);
            if (info.name) displayPatientName = info.name;
          } catch (e) {}
        }

        return {
          title: `預約: ${displayPatientName}`,
          description: `預約人: ${app.patient_name}\n備註: ${app.notes || '無'}`,
          start: [
            startDateTime.year(),
            startDateTime.month() + 1,
            startDateTime.date(),
            startDateTime.hours(),
            startDateTime.minutes()
          ],
          duration: { hours: 1, minutes: 0 },
          status: 'CONFIRMED',
          busyStatus: 'BUSY',
          startInputType: 'utc',
          startOutputType: 'utc'
        };
      });

      // 4. 生成 ICS 內容
      if (events.length === 0) {
        // 如果沒有預約，也返回一個空的行事曆，否則有些客戶端會報錯
        const { error, value } = ics.createEvents([{
          title: '行事曆訂閱已啟用',
          start: [2024, 1, 1, 0, 0],
          duration: { hours: 0, minutes: 1 },
          description: '您的預約行事曆訂閱已成功設置。'
        }]);
        
        res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
        res.setHeader('Content-Disposition', 'attachment; filename="calendar.ics"');
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        return res.send(value);
      }

      const { error, value } = ics.createEvents(events);

      if (error) {
        console.error('[Calendar] Error creating events:', error);
        return res.status(500).send('Error generating calendar');
      }

      // 5. 返回 ICS 文件
      res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename="calendar.ics"');
      // 設置 Cache-Control 確保 Apple Calendar 能獲取最新資料
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.send(value);
    });
  });
};

/**
 * 獲取或重置醫生的行事曆 Token
 */
const getCalendarToken = (db) => (req, res) => {
  const userId = req.user.id;

  if (req.user.role !== 'doctor') {
    return res.status(403).json({ error: 'Only doctors can access calendar tokens' });
  }

  db.get('SELECT calendar_token FROM users WHERE id = ?', [userId], (err, row) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    res.json({ success: true, token: row.calendar_token });
  });
};

const resetCalendarToken = (db) => (req, res) => {
  const userId = req.user.id;
  const crypto = require('crypto');
  const newToken = crypto.randomBytes(16).toString('hex');

  if (req.user.role !== 'doctor') {
    return res.status(403).json({ error: 'Only doctors can reset calendar tokens' });
  }

  db.run('UPDATE users SET calendar_token = ? WHERE id = ?', [newToken, userId], (err) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    res.json({ success: true, token: newToken });
  });
};

module.exports = (db) => ({
  getCalendarFeed: getCalendarFeed(db),
  getCalendarToken: getCalendarToken(db),
  resetCalendarToken: resetCalendarToken(db)
});
