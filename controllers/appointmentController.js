/**
 * 預約管理控制器
 */

// 創建新預約
const createAppointment = (db) => (req, res) => {
  console.log('[預約日誌] 進入 createAppointment 函數');
  try {
    const { 
      doctorId,          // 保持 doctorId
      patientId,         // 保持 patientId
      appointmentDate,   // 從前端接收 appointmentDate
      timeSlot,          // 從前端接收 timeSlot
      reason,            // 假設 reason 是主要備註
      notes,             // 也接收 notes，可以選擇性使用或合併
      isNewPatient,      // 從前端接收 isNewPatient
      patientInfo        // 從前端接收 patientInfo 物件
    } = req.body;

    // 後端內部變數可以重新映射，或者直接使用接收到的名稱
    // 為了減少後續代碼的改動，我們可以將接收到的值賦給舊的變數名
    const date = appointmentDate;
    const time = timeSlot;
    const note = reason; // 或者 const note = notes; 或者合併它們

    console.log('[預約日誌] 收到的請求體 req.body:', req.body);
    console.log('[預約日誌] 當前登入用戶 req.user:', req.user);

    // 驗證必填欄位 (使用 date 和 time)
    if (!doctorId || !patientId || !date || !time) {
      console.error('[預約日誌] 錯誤：缺少必填欄位', { doctorId, patientId, appointmentDate: date, timeSlot: time });
      // 注意錯誤訊息中仍然使用 appointmentDate 和 timeSlot，以保持與前端的術語一致
      return res.status(400).json({ error: '醫生ID、患者ID、預約日期和時間段都是必填的' });
    }

    // 檢查時間段格式是否正確
    const timeSlotPattern = /^([01]?[0-9]|2[0-3]):(00|30)$/;
    if (!timeSlotPattern.test(time)) {
      console.error('[預約日誌] 錯誤：時間段格式不正確', { timeSlot: time });
      return res.status(400).json({ error: '時間段格式不正確，應為 HH:MM（MM 為 00 或 30）' });
    }

    // 檢查該醫生在該時間段是否已經有預約
    const checkQuery = `
      SELECT * FROM appointments
      WHERE doctor_id = ? AND date = ? AND time = ? AND status != 'cancelled'
    `;
    console.log('[預約日誌] 執行預約衝突檢查SQL:', checkQuery, '參數:', [doctorId, date, time]);

    db.get(checkQuery, [doctorId, date, time], (err, existingAppointment) => {
      if (err) {
        console.error('[預約日誌] 預約衝突檢查SQL錯誤:', err.message);
        return res.status(500).json({ error: '伺服器錯誤' });
      }
      console.log('[預約日誌] 預約衝突檢查結果 (existingAppointment):', existingAppointment);

      if (existingAppointment) {
        console.warn('[預約日誌] 警告：該時間段已被預約', existingAppointment);
        return res.status(409).json({ error: '該時間段已被預約' });
      }

      // 查詢醫生表，檢查醫生是否存在
      console.log('[預約日誌] 準備查詢醫生是否存在，醫生ID:', doctorId);
      db.get('SELECT * FROM users WHERE id = ? AND role = "doctor"', [doctorId], (err, doctor) => {
        if (err) {
          console.error('[預約日誌] 查詢醫生SQL錯誤:', err.message);
          return res.status(500).json({ error: '伺服器錯誤' });
        }
        console.log('[預約日誌] 查詢醫生結果 (doctor):', doctor);

        if (!doctor) {
          console.warn('[預約日誌] 警告：醫生不存在', { doctorId });
          return res.status(404).json({ error: '醫生不存在' });
        }

        // 如果當前用戶是患者，則只能以自己的身份預約
        console.log('[預約日誌] 檢查患者身份，當前用戶角色:', req.user.role, '用戶ID:', req.user.id, '請求的patientId:', patientId);
        if (req.user.role === 'patient' && req.user.id !== parseInt(patientId)) {
          console.warn('[預約日誌] 警告：患者只能以自己的身份預約', { userId: req.user.id, requestedPatientId: patientId });
          return res.status(403).json({ error: '患者只能以自己的身份預約' });
        }

        // 查詢患者表，檢查患者是否存在
        console.log('[預約日誌] 準備查詢患者是否存在，患者ID:', patientId);
        db.get('SELECT * FROM users WHERE id = ?', [patientId], (err, patient) => {
          if (err) {
            console.error('[預約日誌] 查詢患者SQL錯誤:', err.message);
            return res.status(500).json({ error: '伺服器錯誤' });
          }
          console.log('[預約日誌] 查詢患者結果 (patient):', patient);

          if (!patient) {
            console.warn('[預約日誌] 警告：患者不存在', { patientId });
            return res.status(404).json({ error: '患者不存在' });
          }

          // 如果 isNewPatient 為 true，則使用 patientInfo 中的數據創建新用戶或更新用戶資訊
          if (isNewPatient && patientInfo) {
            console.log('[預約日誌] 新患者，信息:', patientInfo);
            // 在這裡添加創建或更新 users 表的邏輯
            // 例如: db.run("UPDATE users SET phone = ?, email = ?, gender = ?, birth_date = ? WHERE id = ?", [patientInfo.phone, patientInfo.email, patientInfo.gender, patientInfo.birthDate, patientId], ...);
            // 或者如果是全新患者且 patientId 此時是無效的，則需要先創建 user 記錄。這取決於您的 patientId 生成和管理流程。
          }

          // 創建預約
          const createQuery = `
            INSERT INTO appointments (
              doctor_id, patient_id, date, time, notes, status, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
          `;
          const params = [doctorId, patientId, date, time, note || '', 'pending'];
          console.log('[預約日誌] 準備執行創建預約SQL:', createQuery, '參數:', params);

          db.run(
            createQuery,
            params,
            function(err) {
              if (err) {
                console.error('[預約日誌] 創建預約SQL錯誤:', err.message);
                return res.status(500).json({ error: '無法創建預約' });
              }
              console.log('[預約日誌] 創建預約成功，影響行數:', this.changes, '最後插入ID:', this.lastID);

              // 獲取剛創建的預約
              console.log('[預約日誌] 準備獲取剛創建的預約，ID:', this.lastID);
              db.get('SELECT * FROM appointments WHERE id = ?', [this.lastID], (err, newAppointment) => {
                if (err) {
                  console.error('[預約日誌] 獲取新預約SQL錯誤:', err.message);
                  return res.status(500).json({ 
                    message: '預約已創建，但無法獲取詳細信息',
                    appointmentId: this.lastID
                  });
                }
                console.log('[預約日誌] 成功獲取新預約:', newAppointment);

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
    console.error('[預約日誌] 創建預約過程中發生頂層錯誤:', error.message, '堆疊:', error.stack);
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
  console.log(`[更新狀態日誌] 進入 updateAppointmentStatus 函數 - appointmentId: ${req.params.appointmentId}, user: ${JSON.stringify(req.user)}, body: ${JSON.stringify(req.body)}`);
  try {
    const { appointmentId } = req.params;
    const { status, note } = req.body;

    console.log(`[更新狀態日誌] appointmentId: ${appointmentId}, status: ${status}, note: ${note}`);

    // 驗證狀態
    const validStatuses = ['pending', 'confirmed', 'completed', 'cancelled'];
    if (!status || !validStatuses.includes(status)) {
      console.warn('[更新狀態日誌] 無效的預約狀態:', status);
      return res.status(400).json({ error: '無效的預約狀態' });
    }

    // 檢查預約是否存在
    db.get('SELECT * FROM appointments WHERE id = ?', [appointmentId], (err, appointment) => {
      if (err) {
        console.error('[更新狀態日誌] 查詢預約錯誤:', err.message);
        return res.status(500).json({ error: '伺服器錯誤' });
      }

      if (!appointment) {
        console.log(`[更新狀態日誌] 預約 ${appointmentId} 不存在`);
        return res.status(404).json({ error: '預約不存在' });
      }
      console.log(`[更新狀態日誌] 找到預約 ${appointmentId}:`, JSON.stringify(appointment));
      console.log(`[更新狀態日誌] 當前用戶:`, JSON.stringify(req.user));
      console.log(`[更新狀態日誌] 請求的狀態: ${status}`);

      // 權限檢查
      if (req.user.role === 'patient' && req.user.id !== appointment.patient_id) {
        console.warn(`[更新狀態日誌][權限警告] 患者 ${req.user.id} 嘗試修改他人預約 ${appointmentId}`);
        return res.status(403).json({ error: '患者無權修改他人預約' });
      }
      
      if (req.user.role === 'doctor' && appointment.doctor_id !== req.user.id) {
        console.warn(`[更新狀態日誌][權限警告] 醫生 ${req.user.id} (${req.user.name}) 嘗試修改不屬於自己的預約 ${appointmentId} (原醫生ID: ${appointment.doctor_id})`);
        return res.status(403).json({ error: '醫生無權修改不屬於自己的預約' });
      }
      console.log(`[更新狀態日誌] 權限檢查通過 (用戶 ${req.user.id} / 角色 ${req.user.role})，準備更新預約 ${appointmentId} 的狀態為 ${status}`);

      // 更新預約狀態
      const updateQuery = `
        UPDATE appointments 
        SET status = ?, notes = ?, updated_at = datetime('now')
        WHERE id = ?
      `;
      const params = [status, note || appointment.notes, appointmentId]; 
      console.log('[更新狀態日誌] 準備執行更新SQL:', updateQuery, '參數:', JSON.stringify(params));

      db.run(updateQuery, params, function(err) {
        if (err) {
          console.error('[更新狀態日誌] 更新預約狀態SQL錯誤:', err.message);
          return res.status(500).json({ error: '無法更新預約狀態' });
        }
        console.log(`[更新狀態日誌] 更新成功，影響行數: ${this.changes}`);

        if (this.changes === 0) {
          console.warn(`[更新狀態日誌] 預約 ${appointmentId} 未被更新 (可能狀態未改變或ID不存在)`);
          return res.status(404).json({ error: '預約不存在或狀態未改變' });
        }
        
        console.log(`[更新狀態日誌] 準備獲取更新後的預約 ${appointmentId}`);
        db.get('SELECT * FROM appointments WHERE id = ?', [appointmentId], (err, updatedAppointment) => {
          if (err) {
            console.error('[更新狀態日誌] 更新後獲取預約信息錯誤:', err.message);
            return res.status(200).json({ 
              success: true, 
              message: '預約狀態已更新，但獲取最新信息失敗',
              appointmentId: appointmentId,
              status: status 
            });
          }
          console.log(`[更新狀態日誌] 成功獲取更新後的預約 ${appointmentId}:`, JSON.stringify(updatedAppointment));
          res.json({ 
            success: true, 
            message: '預約狀態已成功更新', 
            appointment: updatedAppointment 
          });
        });
      });
    });
  } catch (error) {
    console.error('[更新狀態日誌] 更新預約狀態過程中發生頂層錯誤:', error.message, error.stack);
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