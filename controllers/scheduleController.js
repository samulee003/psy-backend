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
            if (schedule.defined_slots) {
              try {
                definedSlotsArray = JSON.parse(schedule.defined_slots);
              } catch (e) {
                console.error(`解析 schedule.defined_slots 失敗 (ID: ${schedule.id}):`, e.message);
              }
            }
            return {
              ...schedule,
              is_rest_day: Boolean(schedule.is_rest_day),
              defined_slots: definedSlotsArray // 返回解析後的陣列或 null
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

// 新增：獲取特定醫生在特定月份的排班
const getScheduleForMonthAndDoctor = (db) => (req, res) => {
  try {
    const { year, month } = req.params;
    let { doctorId } = req.query; // 修改：允許 doctorId 未定義

    // 基本驗證
    if (!year || !month) {
      return res.status(400).json({ error: '年份和月份是必填的' });
    }
    if (isNaN(parseInt(year)) || isNaN(parseInt(month))) {
      return res.status(400).json({ error: '年份和月份必須是數字' });
    }

    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const endDate = new Date(year, month, 0).toISOString().split('T')[0];

    let query = `
      SELECT 
        s.id, 
        s.date, 
        s.start_time, 
        s.end_time, 
        s.slot_duration, 
        s.is_rest_day,
        s.defined_slots, // 新增讀取 defined_slots
        u.id as doctor_id,
        u.name as doctor_name
      FROM schedule s
      JOIN users u ON s.doctor_id = u.id
      WHERE s.date >= ? AND s.date <= ?
    `;
    const params = [startDate, endDate];

    if (doctorId) {
      query += ` AND s.doctor_id = ?`;
      params.push(parseInt(doctorId, 10)); // 確保是數字
    } else if (req.user && req.user.role === 'doctor') {
      query += ` AND s.doctor_id = ?`;
      params.push(req.user.id);
    }

    query += ` ORDER BY s.date ASC, s.start_time ASC`;

    db.all(query, params, (err, schedules) => {
      if (err) {
        console.error(`查詢排班 (年份: ${year}, 月份: ${month}) 時發生錯誤:`, err.message);
        return res.status(500).json({ error: '獲取排班資訊時發生內部錯誤' });
      }

      res.json({
        message: `成功獲取排班資訊`,
        year,
        month,
        schedules: schedules.map(s => {
          let definedSlotsArray = null;
          if (s.defined_slots) {
            try {
              definedSlotsArray = JSON.parse(s.defined_slots);
            } catch (e) {
              console.error(`解析 schedule.defined_slots 失敗 (ID: ${s.id}) for getScheduleForMonthAndDoctor:`, e.message);
            }
          }
          return {
            ...s, 
            is_rest_day: Boolean(s.is_rest_day),
            defined_slots: definedSlotsArray // 返回解析後的陣列或 null
          };
        })
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