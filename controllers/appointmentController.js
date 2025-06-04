/**
 * 預約管理控制器
 */

const dateUtils = require('../utils/dateUtils');
const tzUtils = require('../utils/timezone');
const validators = require('../utils/validators');
const emailService = require('../utils/emailService');

// 創建新預約
const createAppointment = (db) => (req, res) => {
  console.log('[預約日誌] 進入 createAppointment 函數');
  try {
    // 使用集中式驗證
    const validation = validators.validateAppointment(req.body);
    if (!validation.isValid) {
      console.error('[預約日誌] 驗證錯誤:', validation.error);
      return res.status(400).json({ success: false, error: validation.error });
    }
    
    const { 
      doctorId,          // 醫生ID
      patientId,         // 患者ID
      appointmentDate,   // 預約日期
      timeSlot,          // 時間段
      reason,            // 預約原因
      notes,             // 備註
      isNewPatient,      // 是否新患者
      patientInfo,       // 患者信息
      timezone           // 時區信息
    } = req.body;

    // 後端內部變數映射
    const date = appointmentDate;
    const time = timeSlot;
    const note = reason || notes || '';
    const clientTimezone = timezone || 'Asia/Hong_Kong';
    
    // 處理 isNewPatient 布林值
    let isNewPatientBool = false;
    if (typeof isNewPatient === 'boolean') {
      isNewPatientBool = isNewPatient;
    } else if (typeof isNewPatient === 'string') {
      // 如果前端發送字串，轉換為布林值
      isNewPatientBool = isNewPatient === 'true' || isNewPatient === 'yes';
    }
    
    console.log('[預約日誌] 收到的請求體 req.body:', req.body);
    console.log('[預約日誌] 當前登入用戶 req.user:', req.user);
    console.log('[預約日誌] 使用時區:', clientTimezone);
    console.log('[預約日誌] 是否初診患者:', isNewPatientBool, '(原值:', isNewPatient, ')');

    // 檢查該醫生在該時間段是否已經有預約
    const checkQuery = `
      SELECT * FROM appointments
      WHERE doctor_id = ? AND date = ? AND time = ? AND status != 'cancelled'
    `;
    console.log('[預約日誌] 執行預約衝突檢查SQL:', checkQuery, '參數:', [doctorId, date, time]);

    db.get(checkQuery, [doctorId, date, time], (err, existingAppointment) => {
      if (err) {
        console.error('[預約日誌] 預約衝突檢查SQL錯誤:', err.message);
        return res.status(500).json({ success: false, error: '伺服器錯誤' });
      }
      console.log('[預約日誌] 預約衝突檢查結果:', existingAppointment);

      if (existingAppointment) {
        console.warn('[預約日誌] 警告：該時間段已被預約', existingAppointment);
        return res.status(409).json({ success: false, error: '該時間段已被預約' });
      }

      // 查詢醫生表，檢查醫生是否存在
      console.log('[預約日誌] 準備查詢醫生是否存在，醫生ID:', doctorId);
      db.get('SELECT * FROM users WHERE id = ? AND role = "doctor"', [doctorId], (err, doctor) => {
        if (err) {
          console.error('[預約日誌] 查詢醫生SQL錯誤:', err.message);
          return res.status(500).json({ success: false, error: '伺服器錯誤' });
        }
        console.log('[預約日誌] 查詢醫生結果:', doctor);

        if (!doctor) {
          console.warn('[預約日誌] 警告：醫生不存在', { doctorId });
          return res.status(404).json({ success: false, error: '醫生不存在' });
        }

        // 如果當前用戶是患者，則只能以自己的身份預約
        console.log('[預約日誌] 檢查患者身份，當前用戶角色:', req.user.role, '用戶ID:', req.user.id, '請求的patientId:', patientId);
        if (req.user.role === 'patient' && req.user.id !== parseInt(patientId)) {
          console.warn('[預約日誌] 警告：患者只能以自己的身份預約', { userId: req.user.id, requestedPatientId: patientId });
          return res.status(403).json({ success: false, error: '患者只能以自己的身份預約' });
        }

        // 查詢患者表，檢查患者是否存在
        console.log('[預約日誌] 準備查詢患者是否存在，患者ID:', patientId);
        db.get('SELECT * FROM users WHERE id = ?', [patientId], (err, patient) => {
          if (err) {
            console.error('[預約日誌] 查詢患者SQL錯誤:', err.message);
            return res.status(500).json({ success: false, error: '伺服器錯誤' });
          }
          console.log('[預約日誌] 查詢患者結果:', patient);

          if (!patient) {
            console.warn('[預約日誌] 警告：患者不存在', { patientId });
            return res.status(404).json({ success: false, error: '患者不存在' });
          }

          // 處理就診者資訊
          let patientInfoJson = null;
          if (patientInfo && typeof patientInfo === 'object') {
            // 如果前端傳來的是物件，直接使用
            patientInfoJson = JSON.stringify(patientInfo);
            console.log('[預約日誌] 收到就診者資訊物件:', patientInfo);
          } else if (patientInfo && typeof patientInfo === 'string') {
            // 如果是字串，嘗試解析或創建物件
            try {
              JSON.parse(patientInfo);
              patientInfoJson = patientInfo;
            } catch (e) {
              // 如果不是有效的 JSON，將其作為姓名
              patientInfoJson = JSON.stringify({
                patientName: patientInfo,
                isActualPatient: true
              });
            }
            console.log('[預約日誌] 處理就診者資訊字串:', patientInfo);
          }

          // 創建預約 - 包含 isNewPatient 欄位
          const createQuery = `
            INSERT INTO appointments (
              doctor_id, patient_id, date, time, notes, status, patient_info, isNewPatient, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
          `;
          const params = [doctorId, patientId, date, time, note, 'confirmed', patientInfoJson, isNewPatientBool];
          console.log('[預約日誌] 準備執行創建預約SQL:', createQuery, '參數:', params);

          db.run(
            createQuery,
            params,
            function(err) {
              if (err) {
                console.error('[預約日誌] 創建預約SQL錯誤:', err.message);
                return res.status(500).json({ success: false, error: '無法創建預約' });
              }
              console.log('[預約日誌] 創建預約成功，影響行數:', this.changes, '最後插入ID:', this.lastID);
              console.log('[預約日誌] isNewPatient 儲存值:', isNewPatientBool);
              
              const newAppointmentId = this.lastID;

              // 發送預約通知郵件給醫生
              try {
                emailService.sendAppointmentNotificationToDoctor(
                  doctor,
                  patient,
                  {
                    id: newAppointmentId,
                    date: date,
                    time: time,
                    notes: note
                  }
                ).then(emailSent => {
                  console.log(`[預約日誌] 醫生預約通知郵件${emailSent ? '已發送' : '發送失敗'}`);
                }).catch(err => {
                  console.error('[預約日誌] 發送醫生通知郵件錯誤:', err);
                });

                // 發送預約確認郵件給患者
                emailService.sendAppointmentConfirmationToPatient(
                  patient,
                  doctor,
                  {
                    id: newAppointmentId,
                    date: date,
                    time: time,
                    notes: note
                  }
                ).then(emailSent => {
                  console.log(`[預約日誌] 患者預約確認郵件${emailSent ? '已發送' : '發送失敗'}`);
                }).catch(err => {
                  console.error('[預約日誌] 發送患者確認郵件錯誤:', err);
                });
              } catch (emailError) {
                console.error('[預約日誌] 郵件服務錯誤:', emailError);
              }
                
              // 返回成功響應，包含預約 ID 和 isNewPatient 資訊
              res.status(201).json({
                success: true,
                appointment: {
                  id: newAppointmentId,
                  doctorId,
                  patientId,
                  date: date,
                  time: time,
                  status: 'confirmed',
                  notes: note,
                  isNewPatient: isNewPatientBool
                },
                message: '預約創建成功'
              });
            }
          );
        });
      });
    });
  } catch (error) {
    console.error('[預約日誌] 創建預約時發生未處理的錯誤:', error);
    res.status(500).json({
      success: false,
      error: '創建預約時發生未知錯誤',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// 獲取預約列表
const getAppointments = (db) => (req, res) => {
  try {
    const { doctorId, patientId, status, date } = req.query;
    let query = `
      SELECT a.*, 
          d.name as doctor_name, 
          p.name as patient_name,
          a.patient_info
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
      
      const processedAppointments = appointments.map(app => {
        const { patient_name, doctor_name, patient_info, ...rest } = app;
        
        // 處理就診者姓名顯示邏輯
        let displayPatientName = patient_name; // 預設使用預約人姓名
        
        if (patient_info) {
          try {
            const patientInfoObj = JSON.parse(patient_info);
            if (patientInfoObj.name) {
              displayPatientName = patientInfoObj.name; // 優先使用就診者姓名
            }
          } catch (e) {
            console.warn('解析 patient_info 失敗:', e.message);
          }
        }
        
        // 確保 isNewPatient 欄位被正確處理
        let isNewPatientValue = false;
        if (app.isNewPatient !== undefined && app.isNewPatient !== null) {
          // 處理 SQLite 中的布林值（可能是 0/1 或 true/false）
          isNewPatientValue = app.isNewPatient === 1 || app.isNewPatient === true || app.isNewPatient === 'true';
        }
        
        return {
          ...rest,
          patientName: displayPatientName,
          doctorName: doctor_name,
          actualPatientName: displayPatientName, // 新增欄位，明確表示就診者姓名
          bookerName: patient_name, // 新增欄位，表示預約人姓名
          isNewPatient: isNewPatientValue // 確保 isNewPatient 欄位被包含
        };
      });
      
      res.json({ success: true, appointments: processedAppointments });
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

      res.json({ success: true, appointment });
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
        console.warn(`[更新狀態日誌][權限警告] 醫生 ${req.user.id} 嘗試修改不屬於自己的預約 ${appointmentId} (原醫生ID: ${appointment.doctor_id})`);
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
          
          // 返回成功響應
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

        res.json({ success: true, message: '預約已成功刪除' });
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
          p.name as patient_name,
          a.patient_info
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
      
      // 更新：同時處理 patient_name 到 patientName 和 doctor_name 到 doctorName 的映射
      const processedAppointments = appointments.map(app => {
        const { patient_name, doctor_name, patient_info, ...rest } = app;
        
        // 處理就診者姓名顯示邏輯
        let displayPatientName = patient_name; // 預設使用預約人姓名
        
        if (patient_info) {
          try {
            const patientInfoObj = JSON.parse(patient_info);
            if (patientInfoObj.name) {
              displayPatientName = patientInfoObj.name; // 優先使用就診者姓名
            }
          } catch (e) {
            console.warn('解析 patient_info 失敗:', e.message);
          }
        }
        
        // 確保 isNewPatient 欄位被正確處理
        let isNewPatientValue = false;
        if (app.isNewPatient !== undefined && app.isNewPatient !== null) {
          // 處理 SQLite 中的布林值（可能是 0/1 或 true/false）
          isNewPatientValue = app.isNewPatient === 1 || app.isNewPatient === true || app.isNewPatient === 'true';
        }
        
        return {
          ...rest,
          patientName: displayPatientName,
          doctorName: doctor_name,
          actualPatientName: displayPatientName, // 新增欄位，明確表示就診者姓名
          bookerName: patient_name, // 新增欄位，表示預約人姓名
          isNewPatient: isNewPatientValue // 確保 isNewPatient 欄位被包含
        };
      });
      
      // 返回 success: true 以匹配前端期望的格式，並使用處理過的預約列表
      res.json({ success: true, appointments: processedAppointments });
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