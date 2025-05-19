/**
 * 添加測試資料到資料庫
 * 
 * 此腳本為 Zeabur 平台上的資料庫添加基本測試資料
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcrypt');

const dbPath = process.env.DB_PATH || path.join(__dirname, 'database.sqlite');
console.log('使用資料庫路徑:', dbPath);

// 連接到資料庫
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('無法連接到資料庫:', err.message);
    process.exit(1);
  }
  console.log('成功連接到資料庫');
});

// 添加測試資料
async function addTestData() {
  try {
    // 啟用外鍵約束
    db.run('PRAGMA foreign_keys = ON');
    
    // 1. 添加一個醫生用戶
    await addDoctorUser();
    
    // 2. 添加排班資料
    await addScheduleData();
    
    console.log('測試資料已成功添加！');
    db.close();
  } catch (error) {
    console.error('添加測試資料時發生錯誤:', error.message);
    db.close();
    process.exit(1);
  }
}

// 添加醫生用戶
async function addDoctorUser() {
  return new Promise((resolve, reject) => {
    // 先檢查用戶是否已存在
    db.get("SELECT id FROM users WHERE username = 'doctor@example.com'", [], (err, user) => {
      if (err) {
        return reject(err);
      }
      
      if (user) {
        console.log('醫生用戶已存在，跳過添加');
        return resolve();
      }
      
      // 加密密碼
      bcrypt.hash('password123', 10, (err, hashedPassword) => {
        if (err) {
          return reject(err);
        }
        
        // 添加醫生用戶
        const query = `
          INSERT INTO users (username, password, name, role, phone)
          VALUES (?, ?, ?, ?, ?)
        `;
        
        db.run(query, ['doctor@example.com', hashedPassword, '測試醫生', 'doctor', '0912345678'], function(err) {
          if (err) {
            return reject(err);
          }
          console.log('醫生用戶已添加，ID:', this.lastID);
          resolve();
        });
      });
    });
  });
}

// 添加排班資料
async function addScheduleData() {
  return new Promise((resolve, reject) => {
    // 獲取醫生 ID
    db.get("SELECT id FROM users WHERE role = 'doctor' LIMIT 1", [], (err, doctor) => {
      if (err) {
        return reject(err);
      }
      
      if (!doctor) {
        return reject(new Error('未找到醫生用戶，無法添加排班'));
      }
      
      const doctorId = doctor.id;
      
      // 獲取當前年月
      const now = new Date();
      const currentYear = now.getFullYear();
      const currentMonth = now.getMonth() + 1;
      const nextMonth = currentMonth === 12 ? 1 : currentMonth + 1;
      const nextMonthYear = currentMonth === 12 ? currentYear + 1 : currentYear;
      
      // 創建排班數據 - 本月
      createMonthSchedule(doctorId, currentYear, currentMonth)
        .then(() => {
          // 創建排班數據 - 下月
          return createMonthSchedule(doctorId, nextMonthYear, nextMonth);
        })
        .then(resolve)
        .catch(reject);
    });
  });
}

// 創建某月排班
async function createMonthSchedule(doctorId, year, month) {
  return new Promise((resolve, reject) => {
    // 獲取該月天數
    const daysInMonth = new Date(year, month, 0).getDate();
    
    // 建立批次操作
    db.serialize(() => {
      db.run('BEGIN TRANSACTION');
      
      let completed = 0;
      let errors = 0;
      
      // 為該月的每週一、三、五創建排班（假設醫生週一、三、五應診）
      for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(year, month - 1, day);
        const dayOfWeek = date.getDay(); // 0 是週日，1 是週一，...
        
        // 只排週一 (1)、週三 (3) 和週五 (5)
        if (dayOfWeek === 1 || dayOfWeek === 3 || dayOfWeek === 5) {
          const dateStr = `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
          
          // 早上 9:00-12:00
          const morningSlots = JSON.stringify([
            { start: '09:00', end: '09:30' },
            { start: '09:30', end: '10:00' },
            { start: '10:00', end: '10:30' },
            { start: '10:30', end: '11:00' },
            { start: '11:00', end: '11:30' },
            { start: '11:30', end: '12:00' }
          ]);
          
          // 檢查是否已有排班
          db.get('SELECT id FROM schedule WHERE date = ? AND doctor_id = ?', [dateStr, doctorId], (err, existing) => {
            if (err) {
              console.error(`檢查排班時出錯 (${dateStr}):`, err.message);
              errors++;
              return;
            }
            
            if (existing) {
              console.log(`${dateStr} 已有排班，跳過`);
              completed++;
              
              if (completed + errors === daysInMonth) {
                finalize();
              }
              return;
            }
            
            // 插入排班記錄
            db.run(
              'INSERT INTO schedule (date, doctor_id, start_time, end_time, defined_slots, is_rest_day) VALUES (?, ?, ?, ?, ?, 0)',
              [dateStr, doctorId, '09:00', '12:00', morningSlots],
              function(err) {
                if (err) {
                  console.error(`為 ${dateStr} 創建排班時出錯:`, err.message);
                  errors++;
                } else {
                  console.log(`已為 ${dateStr} 創建排班，ID: ${this.lastID}`);
                  completed++;
                }
                
                if (completed + errors === daysInMonth) {
                  finalize();
                }
              }
            );
          });
        } else {
          completed++;
          
          if (completed + errors === daysInMonth) {
            finalize();
          }
        }
      }
      
      function finalize() {
        if (errors > 0) {
          db.run('ROLLBACK', () => {
            reject(new Error(`創建排班時出現 ${errors} 個錯誤`));
          });
        } else {
          db.run('COMMIT', () => {
            console.log(`已為 ${year}年${month}月 創建 ${completed} 個排班記錄`);
            resolve();
          });
        }
      }
    });
  });
}

// 執行添加測試資料的操作
addTestData(); 