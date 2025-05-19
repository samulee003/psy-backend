/**
 * 排班管理控制器
 */

// 創建或更新醫生排班
const createOrUpdateSchedule = (db) => (req, res) => {
  try {
    const { doctorId, date, startTime, endTime, slotDuration = 30, isRestDay = false } = req.body;

    // 驗證必填欄位
    if (!doctorId || !date) {
      return res.status(400).json({ error: '醫生ID和日期都是必填的' });
    }

    // 如果不是休息日，則需要開始時間和結束時間
    if (!isRestDay && (!startTime || !endTime)) {
      return res.status(400).json({ error: '如果不是休息日，則需要提供開始時間和結束時間' });
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
          start_time: isRestDay ? null : startTime,
          end_time: isRestDay ? null : endTime,
          slot_duration: slotDuration,
          is_rest_day: isRestDay ? 1 : 0
        };

        if (existingSchedule) {
          // 更新現有排班
          const updateQuery = `
            UPDATE schedule
            SET start_time = ?, end_time = ?, slot_duration = ?, is_rest_day = ?, updated_at = datetime('now')
            WHERE doctor_id = ? AND date = ?
          `;

          db.run(updateQuery, [
            scheduleData.start_time,
            scheduleData.end_time,
            scheduleData.slot_duration,
            scheduleData.is_rest_day,
            scheduleData.doctor_id,
            scheduleData.date
          ], function(err) {
            if (err) {
              console.error('更新排班錯誤:', err.message);
              return res.status(500).json({ error: '無法更新排班信息' });
            }

            // 如果是休息日或時間段更改，可能需要處理受影響的預約
            if (isRestDay || existingSchedule.start_time !== startTime || existingSchedule.end_time !== endTime) {
              handleAffectedAppointments(db, doctorId, date, isRestDay, startTime, endTime, (err) => {
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
            INSERT INTO schedule (doctor_id, date, start_time, end_time, slot_duration, is_rest_day, created_at)
            VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
          `;

          db.run(insertQuery, [
            scheduleData.doctor_id,
            scheduleData.date,
            scheduleData.start_time,
            scheduleData.end_time,
            scheduleData.slot_duration,
            scheduleData.is_rest_day
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
          schedules: schedules.map(schedule => ({
            ...schedule,
            is_rest_day: Boolean(schedule.is_rest_day)
          }))
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
            available_slots: []
          });
        }

        // 生成所有可能的時間段
        const allSlots = generateTimeSlots(schedule.start_time, schedule.end_time, schedule.slot_duration);

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
          const availableSlots = allSlots.filter(slot => !bookedSlots.includes(slot));

          res.json({
            doctor: {
              id: doctor.id,
              name: doctor.name
            },
            date,
            is_rest_day: false,
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
function handleAffectedAppointments(db, doctorId, date, isRestDay, startTime, endTime, callback) {
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

    // 檢查哪些預約不在新的工作時間內
    const startMinutes = timeToMinutes(startTime);
    const endMinutes = timeToMinutes(endTime);
    
    let cancelCount = 0;
    let processed = 0;
    
    appointments.forEach(appointment => {
      const slotMinutes = timeToMinutes(appointment.time_slot);
      
      if (slotMinutes < startMinutes || slotMinutes >= endMinutes) {
        // 取消不在工作時間內的預約
        const updateQuery = `
          UPDATE appointments
          SET status = 'cancelled', note = COALESCE(note, '') || ' (因排班調整自動取消)', updated_at = datetime('now')
          WHERE id = ?
        `;
        
        db.run(updateQuery, [appointment.id], (err) => {
          processed++;
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
        schedules: schedules.map(s => ({ ...s, is_rest_day: Boolean(s.is_rest_day) })) // 確保 is_rest_day 是布林值
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