/**
 * 預約管理控制器
 */

// 創建新預約
const createAppointment = (db) => (req, res) => {
  try {
    const { doctorId, patientId, appointmentDate, timeSlot, note } = req.body;

    // 驗證必填欄位
    if (!doctorId || !patientId || !appointmentDate || !timeSlot) {
      return res.status(400).json({ error: '醫生ID、患者ID、預約日期和時間段都是必填的' });
    }

    // 檢查時間段格式是否正確
    const timeSlotPattern = /^([01]?[0-9]|2[0-3]):(00|30)$/;
    if (!timeSlotPattern.test(timeSlot)) {
      return res.status(400).json({ error: '時間段格式不正確，應為 HH:MM（MM 為 00 或 30）' });
    }

    // 檢查該醫生在該時間段是否已經有預約
    const checkQuery = `
      SELECT * FROM appointments
      WHERE doctor_id = ? AND date = ? AND time = ? AND status != 'cancelled'
    `;

    db.get(checkQuery, [doctorId, appointmentDate, timeSlot], (err, existingAppointment) => {
      if (err) {
        console.error('檢查預約衝突錯誤:', err.message);
        return res.status(500).json({ error: '伺服器錯誤' });
      }

      if (existingAppointment) {
        return res.status(409).json({ error: '該時間段已被預約' });
      }

      // 查詢醫生表，檢查醫生是否存在
      db.get('SELECT * FROM users WHERE id = ? AND role = "doctor"', [doctorId], (err, doctor) => {
        if (err) {
          console.error('查詢醫生錯誤:', err.message);
          return res.status(500).json({ error: '伺服器錯誤' });
        }

        if (!doctor) {
          return res.status(404).json({ error: '醫生不存在' });
        }

        // 如果當前用戶是患者，則只能以自己的身份預約
        if (req.user.role === 'patient' && req.user.id !== parseInt(patientId)) {
          return res.status(403).json({ error: '患者只能以自己的身份預約' });
        }

        // 查詢患者表，檢查患者是否存在
        db.get('SELECT * FROM users WHERE id = ?', [patientId], (err, patient) => {
          if (err) {
            console.error('查詢患者錯誤:', err.message);
            return res.status(500).json({ error: '伺服器錯誤' });
          }

          if (!patient) {
            return res.status(404).json({ error: '患者不存在' });
          }

          // 創建預約
          const createQuery = `
            INSERT INTO appointments (
              doctor_id, patient_id, date, time, notes, status, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
          `;

          db.run(
            createQuery,
            [doctorId, patientId, appointmentDate, timeSlot, note || '', 'pending'],
            function(err) {
              if (err) {
                console.error('創建預約錯誤:', err.message);
                return res.status(500).json({ error: '無法創建預約' });
              }

              // 獲取剛創建的預約
              db.get('SELECT * FROM appointments WHERE id = ?', [this.lastID], (err, newAppointment) => {
                if (err) {
                  console.error('獲取新預約錯誤:', err.message);
                  return res.status(500).json({ 
                    message: '預約已創建，但無法獲取詳細信息',
                    appointmentId: this.lastID
                  });
                }

                res.status(201).json({
                  message: '預約已成功創建',
                  appointment: newAppointment
                });
              });
            }
          );
        });
      });
    });
  } catch (error) {
    console.error('創建預約過程中發生錯誤:', error.message);
    res.status(500).json({ error: '創建預約失敗，請稍後再試' });
  }
};

// 獲取預約列表
const getAppointments = (db) => (req, res) => {
  try {
    const { doctorId, patientId, status, date } = req.query;
    let query = `
      SELECT a.*, 
          d.name as doctor_name, 
          p.name as patient_name
      FROM appointments a
      JOIN users d ON a.doctor_id = d.id
      JOIN users p ON a.patient_id = p.id
      WHERE 1=1
    `;
    let params = [];

    // 根據用戶角色過濾預約
    if (req.user.role === 'doctor') {
      // 醫生只能看到自己的預約
      query += ` AND a.doctor_id = ?`;
      params.push(req.user.id);
    } else if (req.user.role === 'patient') {
      // 患者只能看到自己的預約
      query += ` AND a.patient_id = ?`;
      params.push(req.user.id);
    } else if (doctorId) {
      // 管理員可以按醫生過濾
      query += ` AND a.doctor_id = ?`;
      params.push(doctorId);
    }

    // 其他過濾條件
    if (patientId && req.user.role !== 'patient') {
      query += ` AND a.patient_id = ?`;
      params.push(patientId);
    }

    if (status) {
      query += ` AND a.status = ?`;
      params.push(status);
    }

    if (date) {
      query += ` AND a.date = ?`;
      params.push(date);
    }

    // 排序
    query += ` ORDER BY a.date DESC, a.time ASC`;

    db.all(query, params, (err, appointments) => {
      if (err) {
        console.error('獲取預約列表錯誤:', err.message);
        return res.status(500).json({ error: '無法獲取預約列表' });
      }
      res.json({ appointments });
    });
  } catch (error) {
    console.error('獲取預約列表過程中發生錯誤:', error.message);
    res.status(500).json({ error: '獲取預約列表失敗，請稍後再試' });
  }
};

// 獲取單個預約信息
const getAppointmentById = (db) => (req, res) => {
  try {
    const { appointmentId } = req.params;

    const query = `
      SELECT a.*, 
          d.name as doctor_name, 
          p.name as patient_name
      FROM appointments a
      JOIN users d ON a.doctor_id = d.id
      JOIN users p ON a.patient_id = p.id
      WHERE a.id = ?
    `;

    db.get(query, [appointmentId], (err, appointment) => {
      if (err) {
        console.error('獲取預約信息錯誤:', err.message);
        return res.status(500).json({ error: '無法獲取預約信息' });
      }

      if (!appointment) {
        return res.status(404).json({ error: '預約不存在' });
      }

      // 檢查用戶是否有權限查看此預約
      if (
        req.user.role === 'doctor' && req.user.id !== appointment.doctor_id ||
        req.user.role === 'patient' && req.user.id !== appointment.patient_id
      ) {
        return res.status(403).json({ error: '無權訪問此預約' });
      }

      res.json({ appointment });
    });
  } catch (error) {
    console.error('獲取預約信息過程中發生錯誤:', error.message);
    res.status(500).json({ error: '獲取預約信息失敗，請稍後再試' });
  }
};

// 更新預約狀態
const updateAppointmentStatus = (db) => (req, res) => {
  try {
    const { appointmentId } = req.params;
    const { status, note } = req.body;

    // 驗證狀態
    const validStatuses = ['pending', 'confirmed', 'completed', 'cancelled'];
    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({ error: '無效的預約狀態' });
    }

    // 檢查預約是否存在
    db.get('SELECT * FROM appointments WHERE id = ?', [appointmentId], (err, appointment) => {
      if (err) {
        console.error('查詢預約錯誤:', err.message);
        return res.status(500).json({ error: '伺服器錯誤' });
      }

      if (!appointment) {
        return res.status(404).json({ error: '預約不存在' });
      }

      // 檢查用戶是否有權限更新此預約
      // 醫生只能更新自己的預約，患者只能取消自己的預約
      if (
        (req.user.role === 'doctor' && req.user.id !== appointment.doctor_id) ||
        (req.user.role === 'patient' && req.user.id !== appointment.patient_id) ||
        (req.user.role === 'patient' && status !== 'cancelled')
      ) {
        return res.status(403).json({ error: '無權更新此預約' });
      }

      // 更新預約狀態
      const updateQuery = `
        UPDATE appointments
        SET status = ?, updated_at = datetime('now')
        ${note ? ', note = ?' : ''}
        WHERE id = ?
      `;

      const params = note
        ? [status, note, appointmentId]
        : [status, appointmentId];

      db.run(updateQuery, params, function(err) {
        if (err) {
          console.error('更新預約狀態錯誤:', err.message);
          return res.status(500).json({ error: '無法更新預約狀態' });
        }

        // 獲取更新後的預約信息
        db.get('SELECT * FROM appointments WHERE id = ?', [appointmentId], (err, updatedAppointment) => {
          if (err) {
            console.error('獲取更新後預約信息錯誤:', err.message);
            return res.status(500).json({ error: '預約狀態已更新，但無法獲取更新後的數據' });
          }

          res.json({
            message: '預約狀態已成功更新',
            appointment: updatedAppointment
          });
        });
      });
    });
  } catch (error) {
    console.error('更新預約狀態過程中發生錯誤:', error.message);
    res.status(500).json({ error: '更新預約狀態失敗，請稍後再試' });
  }
};

// 刪除預約
const deleteAppointment = (db) => (req, res) => {
  try {
    const { appointmentId } = req.params;

    // 檢查預約是否存在
    db.get('SELECT * FROM appointments WHERE id = ?', [appointmentId], (err, appointment) => {
      if (err) {
        console.error('查詢預約錯誤:', err.message);
        return res.status(500).json({ error: '伺服器錯誤' });
      }

      if (!appointment) {
        return res.status(404).json({ error: '預約不存在' });
      }

      // 只有管理員或擁有該預約的醫生可以刪除預約
      if (
        req.user.role !== 'admin' &&
        (req.user.role !== 'doctor' || req.user.id !== appointment.doctor_id)
      ) {
        return res.status(403).json({ error: '無權刪除此預約' });
      }

      // 刪除預約
      db.run('DELETE FROM appointments WHERE id = ?', [appointmentId], function(err) {
        if (err) {
          console.error('刪除預約錯誤:', err.message);
          return res.status(500).json({ error: '無法刪除預約' });
        }

        res.json({ message: '預約已成功刪除' });
      });
    });
  } catch (error) {
    console.error('刪除預約過程中發生錯誤:', error.message);
    res.status(500).json({ error: '刪除預約失敗，請稍後再試' });
  }
};

// 新增：獲取「我的」預約
const getMyAppointments = (db) => (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;

    // 根據資料庫結構調整查詢
    let query = `
      SELECT a.*, 
          d.name as doctor_name, 
          p.name as patient_name
      FROM appointments a
      JOIN users d ON a.doctor_id = d.id
      JOIN users p ON a.patient_id = p.id
      WHERE 1=1
    `;
    const params = [];

    if (userRole === 'doctor') {
      query += ` AND a.doctor_id = ?`;
      params.push(userId);
    } else if (userRole === 'patient') {
      query += ` AND a.patient_id = ?`;
      params.push(userId);
    } else {
      // 其他角色或未登入用戶不應能訪問此路由，但已被 authenticateUser 中間件攔截
      return res.status(403).json({ error: '無權訪問此資源' });
    }

    // 修正欄位名稱：使用 date 和 time
    query += ` ORDER BY a.date DESC, a.time ASC`;

    db.all(query, params, (err, appointments) => {
      if (err) {
        console.error('獲取我的預約列表錯誤:', err.message);
        return res.status(500).json({ error: '無法獲取預約列表' });
      }
      // 返回 success: true 以匹配前端期望的格式
      res.json({ success: true, appointments });
    });
  } catch (error) {
    console.error('獲取我的預約過程中發生錯誤:', error.message);
    res.status(500).json({ error: '獲取預約列表失敗，請稍後再試' });
  }
};

module.exports = (db) => ({
  createAppointment: createAppointment(db),
  getAppointments: getAppointments(db),
  getAppointmentById: getAppointmentById(db),
  updateAppointmentStatus: updateAppointmentStatus(db),
  deleteAppointment: deleteAppointment(db),
  getMyAppointments: getMyAppointments(db)
}); 