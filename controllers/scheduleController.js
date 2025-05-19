/**
 * 排班管理控制器
 */

// 創建或更新醫生排班
const createOrUpdateSchedule = (db) => (req, res) => {
  try {
    const { doctorId, date, startTime, endTime, slotDuration = 30, isRestDay = false, definedSlots } = req.body;

    // 驗證必填欄位
    if (!doctorId || !date) {
      return res.status(400).json({ error: '醫生ID和日期都是必填的' });
    }

    // 如果 definedSlots 存在且是有效陣列，則 isRestDay 必須為 false
    // 並且 startTime, endTime 應該由 definedSlots 決定或驗證，這裡暫時簡化，假設前端會傳遞合理的 startTime/endTime
    let actualIsRestDay = isRestDay;
    let definedSlotsJSON = null;

    if (definedSlots && Array.isArray(definedSlots) && definedSlots.length > 0) {
      actualIsRestDay = false; // 如果有精確時段，則不可能是休息日
      // 驗證 definedSlots 中的時間格式 (可選，但推薦)
      for (const slot of definedSlots) {
        if (!/^\d{2}:\d{2}$/.test(slot)) {
          return res.status(400).json({ error: `definedSlots 中的時間格式無效: ${slot}` });
        }
      }
      definedSlotsJSON = JSON.stringify(definedSlots);
      // 這裡可以選擇讓後端根據 definedSlots 計算 startTime 和 endTime，以確保一致性
      // const calculatedStartTime = definedSlots[0];
      // const lastSlot = definedSlots[definedSlots.length - 1];
      // const calculatedEndTime = minutesToTime(timeToMinutes(lastSlot) + slotDuration);
      // startTime = calculatedStartTime; // 覆蓋傳入的 startTime
      // endTime = calculatedEndTime;   // 覆蓋傳入的 endTime
    } else if (definedSlots && (!Array.isArray(definedSlots) || definedSlots.length === 0)) {
        // 如果傳了 definedSlots 但它是無效的 (例如空陣列或非陣列)，視為錯誤
        return res.status(400).json({ error: 'definedSlots 如果提供，則必須是包含時段的有效陣列' });
    }


    // 如果不是休息日 (且沒有 definedSlots)，則需要開始時間和結束時間
    if (!actualIsRestDay && !definedSlotsJSON && (!startTime || !endTime)) {
      return res.status(400).json({ error: '如果不是休息日且未提供definedSlots，則需要提供開始時間和結束時間' });
    }

    // 確保日期格式正確
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({ error: '日期格式應為 YYYY-MM-DD' });
    }

    // 檢查醫生是否存在
    db.get('SELECT * FROM users WHERE id = ? AND role = "doctor"', [doctorId], (err, doctor) => {
      if (err) {
        console.error('查詢醫生錯誤:', err.message);
        return res.status(500).json({ error: '伺服器錯誤' });
      }

      if (!doctor) {
        return res.status(404).json({ error: '醫生不存在' });
      }

      // 檢查當前用戶是否有權限設置此醫生的排班
      if (req.user.role === 'doctor' && req.user.id !== parseInt(doctorId)) {
        return res.status(403).json({ error: '醫生只能設置自己的排班' });
      }

      // 檢查該日期是否已有排班記錄
      db.get('SELECT * FROM schedule WHERE doctor_id = ? AND date = ?', [doctorId, date], (err, existingSchedule) => {
        if (err) {
          console.error('查詢排班錯誤:', err.message);
          return res.status(500).json({ error: '伺服器錯誤' });
        }

        // 準備更新/插入的數據
        const scheduleData = {
          doctor_id: doctorId,
          date,
          start_time: actualIsRestDay || definedSlotsJSON ? (definedSlotsJSON ? startTime : null) : startTime, // 如果有 definedSlots，startTime 仍來自請求或根據 definedSlots 計算
          end_time: actualIsRestDay || definedSlotsJSON ? (definedSlotsJSON ? endTime : null) : endTime,     // 同上
          slot_duration: slotDuration,
          is_rest_day: actualIsRestDay ? 1 : 0,
          defined_slots: definedSlotsJSON // 新增
        };

        // 檢查 existingSchedule.defined_slots 是否與新的 definedSlotsJSON 不同
        let slotsChanged = false;
        if (definedSlotsJSON) {
            slotsChanged = existingSchedule?.defined_slots !== definedSlotsJSON;
        }


        if (existingSchedule) {
          // 更新現有排班
          const updateQuery = `
            UPDATE schedule
            SET start_time = ?, end_time = ?, slot_duration = ?, is_rest_day = ?, defined_slots = ?, updated_at = datetime('now')
            WHERE doctor_id = ? AND date = ?
          `;

          db.run(updateQuery, [
            scheduleData.start_time,
            scheduleData.end_time,
            scheduleData.slot_duration,
            scheduleData.is_rest_day,
            scheduleData.defined_slots, // 新增
            scheduleData.doctor_id,
            scheduleData.date
          ], function(err) {
            if (err) {
              console.error('更新排班錯誤:', err.message);
              return res.status(500).json({ error: '無法更新排班信息' });
            }

            // 如果是休息日或時間段更改 (包括 defined_slots 更改)，可能需要處理受影響的預約
            const prevDefinedSlots = existingSchedule.defined_slots;
            const currentDefinedSlots = scheduleData.defined_slots;
            
            const workTimeChanged = actualIsRestDay !== Boolean(existingSchedule.is_rest_day) ||
                                  existingSchedule.start_time !== startTime || 
                                  existingSchedule.end_time !== endTime ||
                                  prevDefinedSlots !== currentDefinedSlots;


            if (workTimeChanged) {
              handleAffectedAppointments(db, doctorId, date, actualIsRestDay, startTime, endTime, definedSlots, (err) => { // 傳遞 definedSlots
                if (err) {
                  console.error('處理受影響的預約錯誤:', err.message);
                  // 即使預約處理出錯，也繼續返回成功
                }

                res.json({
                  message: '排班信息已成功更新',
                  schedule: {
                    ...scheduleData,
                    id: existingSchedule.id
                  }
                });
              });
            } else {
              res.json({
                message: '排班信息已成功更新',
                schedule: {
                  ...scheduleData,
                  id: existingSchedule.id
                }
              });
            }
          });
        } else {
          // 創建新排班
          const insertQuery = `
            INSERT INTO schedule (doctor_id, date, start_time, end_time, slot_duration, is_rest_day, defined_slots, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
          `;

          db.run(insertQuery, [
            scheduleData.doctor_id,
            scheduleData.date,
            scheduleData.start_time,
            scheduleData.end_time,
            scheduleData.slot_duration,
            scheduleData.is_rest_day,
            scheduleData.defined_slots // 新增
          ], function(err) {
            if (err) {
              console.error('創建排班錯誤:', err.message);
              return res.status(500).json({ error: '無法創建排班信息' });
            }

            res.status(201).json({
              message: '排班信息已成功創建',
              schedule: {
                ...scheduleData,
                id: this.lastID
              }
            });
          });
        }
      });
    });
  } catch (error) {
    console.error('創建/更新排班過程中發生錯誤:', error.message);
    res.status(500).json({ error: '創建/更新排班失敗，請稍後再試' });
  }
};

// 獲取醫生排班
const getDoctorSchedule = (db) => (req, res) => {
  try {
    const { doctorId } = req.params;
    const { startDate, endDate } = req.query;

    // 驗證必填欄位
    if (!doctorId) {
      return res.status(400).json({ error: '醫生ID是必填的' });
    }

    // 檢查醫生是否存在
    db.get('SELECT * FROM users WHERE id = ? AND role = "doctor"', [doctorId], (err, doctor) => {
      if (err) {
        console.error('查詢醫生錯誤:', err.message);
        return res.status(500).json({ error: '伺服器錯誤' });
      }

      if (!doctor) {
        return res.status(404).json({ error: '醫生不存在' });
      }

      // 構建查詢
      let query = 'SELECT * FROM schedule WHERE doctor_id = ?';
      let params = [doctorId];

      if (startDate) {
        query += ' AND date >= ?';
        params.push(startDate);
      }

      if (endDate) {
        query += ' AND date <= ?';
        params.push(endDate);
      }

      query += ' ORDER BY date ASC';

      // 查詢排班數據
      db.all(query, params, (err, schedules) => {
        if (err) {
          console.error('獲取排班列表錯誤:', err.message);
          return res.status(500).json({ error: '無法獲取排班列表' });
        }

        res.json({
          doctor: {
            id: doctor.id,
            name: doctor.name
          },
          schedules: schedules.map(schedule => {
            let definedSlotsArray = null;
            // 只有當 defined_slots 是非空字串時才嘗試解析
            if (schedule.defined_slots && typeof schedule.defined_slots === 'string') { 
              try {
                definedSlotsArray = JSON.parse(schedule.defined_slots);
              } catch (e) {
                console.error(`解析 schedule.defined_slots 失敗 (ID: ${schedule.id}):`, e.message);
                // 解析失敗，保持 definedSlotsArray 為 null
              }
            }
            return {
              ...schedule,
              is_rest_day: Boolean(schedule.is_rest_day),
              defined_slots: definedSlotsArray 
            };
          })
        });
      });
    });
  } catch (error) {
    console.error('獲取排班列表過程中發生錯誤:', error.message);
    res.status(500).json({ error: '獲取排班列表失敗，請稍後再試' });
  }
};

// 獲取可用預約時間段
const getAvailableTimeSlots = (db) => (req, res) => {
  try {
    const { doctorId, date } = req.params;

    // 驗證必填欄位
    if (!doctorId || !date) {
      return res.status(400).json({ error: '醫生ID和日期都是必填的' });
    }

    // 檢查醫生是否存在
    db.get('SELECT * FROM users WHERE id = ? AND role = "doctor"', [doctorId], (err, doctor) => {
      if (err) {
        console.error('查詢醫生錯誤:', err.message);
        return res.status(500).json({ error: '伺服器錯誤' });
      }

      if (!doctor) {
        return res.status(404).json({ error: '醫生不存在' });
      }

      // 獲取該日期的排班
      db.get('SELECT * FROM schedule WHERE doctor_id = ? AND date = ?', [doctorId, date], (err, schedule) => {
        if (err) {
          console.error('查詢排班錯誤:', err.message);
          return res.status(500).json({ error: '伺服器錯誤' });
        }

        if (!schedule) {
          return res.status(404).json({ error: '該日期沒有排班記錄' });
        }

        if (schedule.is_rest_day) {
          return res.json({
            doctor: {
              id: doctor.id,
              name: doctor.name
            },
            date,
            is_rest_day: true,
            defined_slots: null, // 休息日沒有 defined_slots
            available_slots: []
          });
        }

        let potentialSlots = [];
        let parsedDefinedSlots = null;

        if (schedule.defined_slots) {
          try {
            parsedDefinedSlots = JSON.parse(schedule.defined_slots);
            if (Array.isArray(parsedDefinedSlots) && parsedDefinedSlots.length > 0) {
              potentialSlots = parsedDefinedSlots;
            }
          } catch (e) {
            console.error(`解析 schedule.defined_slots 失敗 (ID: ${schedule.id}) for getAvailableTimeSlots:`, e.message);
            // 解析失敗，則回退到 start_time/end_time 邏輯
          }
        }

        if (potentialSlots.length === 0) { // 如果沒有有效的 defined_slots，則使用 start/end time
            if (!schedule.start_time || !schedule.end_time) {
                 return res.status(404).json({ error: '該日期排班不完整 (缺少起止時間或精確時段)' });
            }
          potentialSlots = generateTimeSlots(schedule.start_time, schedule.end_time, schedule.slot_duration);
        }

        // 獲取該日已預約的時間段
        const appointmentQuery = `
          SELECT time_slot
          FROM appointments
          WHERE doctor_id = ? AND date = ? AND status != 'cancelled'
        `;

        db.all(appointmentQuery, [doctorId, date], (err, bookedAppointments) => {
          if (err) {
            console.error('查詢已預約時間段錯誤:', err.message);
            return res.status(500).json({ error: '無法獲取預約信息' });
          }

          // 找出已預約的時間段
          const bookedSlots = bookedAppointments.map(appointment => appointment.time_slot);

          // 過濾出可用的時間段
          const availableSlots = potentialSlots.filter(slot => !bookedSlots.includes(slot));

          res.json({
            doctor: {
              id: doctor.id,
              name: doctor.name
            },
            date,
            is_rest_day: false,
            defined_slots: parsedDefinedSlots, // 返回解析後的 defined_slots
            available_slots: availableSlots
          });
        });
      });
    });
  } catch (error) {
    console.error('獲取可用時間段過程中發生錯誤:', error.message);
    res.status(500).json({ error: '獲取可用時間段失敗，請稍後再試' });
  }
};

// 刪除排班
const deleteSchedule = (db) => (req, res) => {
  try {
    const { scheduleId } = req.params;

    // 檢查排班是否存在
    db.get('SELECT * FROM schedule WHERE id = ?', [scheduleId], (err, schedule) => {
      if (err) {
        console.error('查詢排班錯誤:', err.message);
        return res.status(500).json({ error: '伺服器錯誤' });
      }

      if (!schedule) {
        return res.status(404).json({ error: '排班不存在' });
      }

      // 檢查用戶是否有權限刪除此排班
      if (
        req.user.role === 'doctor' && req.user.id !== schedule.doctor_id ||
        req.user.role === 'patient'
      ) {
        return res.status(403).json({ error: '無權刪除此排班' });
      }

      // 檢查是否有關聯的預約
      const appointmentQuery = `
        SELECT COUNT(*) as count
        FROM appointments
        WHERE doctor_id = ? AND date = ? AND status != 'cancelled'
      `;

      db.get(appointmentQuery, [schedule.doctor_id, schedule.date], (err, result) => {
        if (err) {
          console.error('查詢預約數量錯誤:', err.message);
          return res.status(500).json({ error: '伺服器錯誤' });
        }

        if (result.count > 0) {
          return res.status(409).json({ 
            error: '無法刪除此排班，因為已有關聯的預約',
            appointment_count: result.count
          });
        }

        // 刪除排班
        db.run('DELETE FROM schedule WHERE id = ?', [scheduleId], function(err) {
          if (err) {
            console.error('刪除排班錯誤:', err.message);
            return res.status(500).json({ error: '無法刪除排班' });
          }

          res.json({ message: '排班已成功刪除' });
        });
      });
    });
  } catch (error) {
    console.error('刪除排班過程中發生錯誤:', error.message);
    res.status(500).json({ error: '刪除排班失敗，請稍後再試' });
  }
};

// 生成時間段
function generateTimeSlots(startTime, endTime, slotDuration) {
  const slots = [];
  
  // 將時間字符串轉換為分鐘數
  const startMinutes = timeToMinutes(startTime);
  const endMinutes = timeToMinutes(endTime);
  
  // 生成時間段
  for (let i = startMinutes; i < endMinutes; i += slotDuration) {
    slots.push(minutesToTime(i));
  }
  
  return slots;
}

// 將時間字符串轉換為分鐘數
function timeToMinutes(timeStr) {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
}

// 將分鐘數轉換為時間字符串
function minutesToTime(minutes) {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
}

// 處理因排班變更而受影響的預約
function handleAffectedAppointments(db, doctorId, date, isRestDay, startTime, endTime, definedSlotsArray, callback) {
  // 查詢該日的所有預約
  const query = `
    SELECT *
    FROM appointments
    WHERE doctor_id = ? AND date = ? AND status != 'cancelled'
  `;

  db.all(query, [doctorId, date], (err, appointments) => {
    if (err) {
      return callback(err);
    }

    if (appointments.length === 0) {
      return callback(null);
    }

    // 如果是休息日，取消所有預約
    if (isRestDay) {
      const updateQuery = `
        UPDATE appointments
        SET status = 'cancelled', note = COALESCE(note, '') || ' (因醫生休息日自動取消)', updated_at = datetime('now')
        WHERE doctor_id = ? AND date = ? AND status != 'cancelled'
      `;

      db.run(updateQuery, [doctorId, date], callback);
      return;
    }

    // 如果提供了 definedSlotsArray，則基於它來判斷
    if (definedSlotsArray && Array.isArray(definedSlotsArray) && definedSlotsArray.length > 0) {
      appointments.forEach(appointment => {
        processed++;
        if (!definedSlotsArray.includes(appointment.time_slot)) {
          // 取消不在 definedSlotsArray 中的預約
          const updateQuery = `
            UPDATE appointments
            SET status = 'cancelled', note = COALESCE(note, '') || ' (因排班精確時段調整自動取消)', updated_at = datetime('now')
            WHERE id = ?
          `;
          db.run(updateQuery, [appointment.id], (err) => {
            if (err) {
              console.error(`取消預約 ${appointment.id} (精確時段) 錯誤:`, err.message);
            } else {
              cancelCount++;
            }
            if (processed === appointments.length) {
              callback(null);
            }
          });
        } else if (processed === appointments.length) {
          callback(null);
        }
      });
    } else if (startTime && endTime) { // 否則，回退到使用 startTime 和 endTime
      const startMinutes = timeToMinutes(startTime);
      const endMinutes = timeToMinutes(endTime);
      
      appointments.forEach(appointment => {
        processed++;
        const slotMinutes = timeToMinutes(appointment.time_slot);
        
        if (slotMinutes < startMinutes || slotMinutes >= endMinutes) {
          // 取消不在工作時間內的預約
          const updateQuery = `
            UPDATE appointments
            SET status = 'cancelled', note = COALESCE(note, '') || ' (因排班調整自動取消)', updated_at = datetime('now')
            WHERE id = ?
          `;
          db.run(updateQuery, [appointment.id], (err) => {
            if (err) {
              console.error(`取消預約 ${appointment.id} 錯誤:`, err.message);
            } else {
              cancelCount++;
            }
            if (processed === appointments.length) {
              callback(null);
            }
          });
        } else {
          processed++;
          if (processed === appointments.length) {
            callback(null);
          }
        }
      });
    }
  });
}

// 獲取特定月份和醫生的排班，或特定月份所有醫生的排班 (供患者端使用)
const getScheduleForMonthAndDoctor = (db) => (req, res, next) => {
  try {
    const { year, month } = req.params;
    const { doctorId } = req.query; // 從查詢參數獲取 doctorId
    const userRole = req.user.role;

    if (!year || !month) {
      return res.status(400).json({ error: '年份和月份都是必填的' });
    }

    const monthPadded = month.padStart(2, '0');
    
    // 先檢查資料表結構
    console.log(`[DEBUG] getScheduleForMonthAndDoctor - 檢查資料表結構`);
    
    // 檢查 users 表
    db.all("PRAGMA table_info(users)", [], (err, userColumns) => {
      if (err) {
        console.error(`[ERROR] 無法獲取用戶表結構:`, err.message);
        return next(new Error('資料庫結構查詢錯誤'));
      }
      
      // 檢查必要欄位
      const hasRole = userColumns.some(c => c.name === 'role');
      const hasName = userColumns.some(c => c.name === 'name');
      
      if (!hasRole) {
        console.error('[ERROR] 用戶表缺少必要的 role 欄位');
        return res.status(500).json({ error: '資料庫結構不兼容' });
      }
      
      // 檢查 schedule 表
      db.all("PRAGMA table_info(schedule)", [], (err, scheduleColumns) => {
        if (err) {
          console.error(`[ERROR] 無法獲取排班表結構:`, err.message);
          return next(new Error('資料庫結構查詢錯誤'));
        }
        
        console.log(`[DEBUG] getScheduleForMonthAndDoctor - Schedule 表欄位:`, scheduleColumns.map(c => c.name).join(', '));
        
        // 檢查必要欄位
        const hasDate = scheduleColumns.some(c => c.name === 'date');
        const hasDoctorId = scheduleColumns.some(c => c.name === 'doctor_id');
        const hasIsRestDay = scheduleColumns.some(c => c.name === 'is_rest_day');
        const hasDefinedSlots = scheduleColumns.some(c => c.name === 'defined_slots');
        const hasStartTime = scheduleColumns.some(c => c.name === 'start_time');
        const hasEndTime = scheduleColumns.some(c => c.name === 'end_time');
        
        if (!hasDate || !hasDoctorId) {
          console.error('[ERROR] 排班表缺少必要的基本欄位 (date/doctor_id)');
          return res.status(500).json({ error: '資料庫結構不兼容' });
        }
        
        // 構建 SELECT 語句
        const scheduleFields = ['s.id', 's.date', 's.doctor_id'];
        if (hasStartTime) scheduleFields.push('s.start_time');
        if (hasEndTime) scheduleFields.push('s.end_time');
        if (hasIsRestDay) scheduleFields.push('s.is_rest_day');
        if (hasDefinedSlots) scheduleFields.push('s.defined_slots');
        
        // user 表欄位
        const userFields = [];
        if (hasName) userFields.push('u.name as doctor_name');
        
        const selectFields = [...scheduleFields, ...userFields].join(', ');
        
        let query = `
          SELECT ${selectFields}
          FROM schedule s
          LEFT JOIN users u ON s.doctor_id = u.id
          WHERE strftime('%Y', s.date) = ? AND strftime('%m', s.date) = ?
        `;
        const queryParams = [year, monthPadded];

        if (doctorId) {
          query += ' AND s.doctor_id = ?';
          queryParams.push(doctorId);
        } else if (userRole === 'patient') {
          // 患者只能看到可預約的醫生時段
          query += ` AND s.doctor_id IN (SELECT id FROM users WHERE role = 'doctor')`;
          
          // 只有當這些欄位存在時，才添加相應的過濾條件
          if (hasIsRestDay) {
            query += ` AND (s.is_rest_day = 0 OR s.is_rest_day IS NULL)`;
          }
          
          if (hasDefinedSlots && hasStartTime && hasEndTime) {
            query += ` AND (
              (s.defined_slots IS NOT NULL AND s.defined_slots != '[]' AND s.defined_slots != '') 
              OR 
              (s.start_time IS NOT NULL AND s.end_time IS NOT NULL AND s.start_time != '' AND s.end_time != '')
            )`;
          } else if (hasStartTime && hasEndTime) {
            query += ` AND (s.start_time IS NOT NULL AND s.end_time IS NOT NULL AND s.start_time != '' AND s.end_time != '')`;
          } else if (hasDefinedSlots) {
            query += ` AND (s.defined_slots IS NOT NULL AND s.defined_slots != '[]' AND s.defined_slots != '')`;
          }
        }
        
        query += ' ORDER BY s.date, s.doctor_id';
        if (hasStartTime) query += ', s.start_time';

        console.log('[DEBUG] Executing SQL query in getScheduleForMonthAndDoctor:', query);
        console.log('[DEBUG] With parameters in getScheduleForMonthAndDoctor:', JSON.stringify(queryParams));

        db.all(query, queryParams, (err, schedules) => {
          if (err) {
            console.error(`查詢排班 (年份: ${year}, 月份: ${monthPadded}, DoctorID: ${doctorId || 'N/A'}, UserRole: ${userRole}) 時SQL語法錯誤: ${err.message}`);
            console.error(`Failed Query in getScheduleForMonthAndDoctor: ${query}`);
            console.error(`Failed Params in getScheduleForMonthAndDoctor: ${JSON.stringify(queryParams)}`);
            return next(err);
          }

          // 新增日誌：打印原始查詢結果的長度
          console.log(`[DEBUG] getScheduleForMonthAndDoctor - Raw schedules count for ${year}-${monthPadded} (DoctorID: ${doctorId || 'N/A'}, UserRole: ${userRole}): ${schedules ? schedules.length : 'null or undefined'}`);

          const processedSchedules = schedules.map(schedule => {
            let definedSlotsArray = null;
            // 只有當 defined_slots 存在、是非空字串時才嘗試解析
            if (hasDefinedSlots && schedule.defined_slots && typeof schedule.defined_slots === 'string') { 
              try {
                definedSlotsArray = JSON.parse(schedule.defined_slots);
              } catch (e) {
                console.error(`解析 schedule.defined_slots 失敗 (ID: ${schedule.id}) for getScheduleForMonthAndDoctor:`, e.message);
              }
            }
            
            const result = { ...schedule };
            
            // 只有當該欄位存在時才進行轉換
            if (hasIsRestDay) {
              result.is_rest_day = Boolean(schedule.is_rest_day);
            }
            
            if (hasDefinedSlots) {
              result.defined_slots = definedSlotsArray;
            }
            
            return result;
          });

          // 新增日誌：打印處理後結果的長度
          console.log(`[DEBUG] getScheduleForMonthAndDoctor - Processed schedules count for ${year}-${monthPadded} (DoctorID: ${doctorId || 'N/A'}, UserRole: ${userRole}): ${processedSchedules ? processedSchedules.length : 'null or undefined'}`);

          res.json({
            message: `成功獲取排班資訊`,
            year,
            month,
            schedules: processedSchedules
          });
        });
      });
    });
  } catch (error) {
    console.error('處理 getScheduleForMonthAndDoctor 請求時發生未預期錯誤:', error.message, error.stack);
    res.status(500).json({ error: '處理請求時發生未預期錯誤' });
  }
};

module.exports = (db) => ({
  createOrUpdateSchedule: createOrUpdateSchedule(db),
  getDoctorSchedule: getDoctorSchedule(db),
  getAvailableTimeSlots: getAvailableTimeSlots(db),
  deleteSchedule: deleteSchedule(db),
  getScheduleForMonthAndDoctor: getScheduleForMonthAndDoctor(db) // 導出新方法
}); 