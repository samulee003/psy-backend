/**
 * 測試資料建立腳本 - 用於驗證 Zeabur 資料庫持久性
 * 使用方式: node create-test-data.js
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcrypt');

// 獲取資料庫路徑（優先使用環境變數）
const dbPath = process.env.DB_PATH || path.join(__dirname, 'database.sqlite');
console.log(`資料庫路徑: ${dbPath}`);

// 連接資料庫
const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READWRITE, async err => {
  if (err) {
    console.error('無法連接到資料庫:', err.message);
    process.exit(1);
  }
  
  console.log('成功連接到資料庫');
  
  try {
    // 建立測試用戶
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const testEmail = `test.${timestamp}@example.com`;
    const testName = `測試用戶 ${timestamp}`;
    const testPassword = 'password123';
    const hashedPassword = await bcrypt.hash(testPassword, 10);
    
    // 寫入用戶資料
    db.run(
      'INSERT INTO users (username, password, name, role, phone) VALUES (?, ?, ?, ?, ?)',
      [testEmail, hashedPassword, testName, 'patient', '12345678'],
      function(err) {
        if (err) {
          console.error('創建測試用戶失敗:', err.message);
        } else {
          const userId = this.lastID;
          console.log(`成功創建測試用戶: ${testName} (ID: ${userId}, Email: ${testEmail})`);
          
          // 寫入可識別的測試資料，用於持久性驗證
          const testData = {
            createdAt: new Date().toISOString(),
            message: '這是驗證 Zeabur 持久化儲存的測試資料',
            userId: userId,
            uniqueId: timestamp
          };
          
          // 寫入特殊設置以便於後續查詢
          db.run(
            `INSERT INTO settings (id, doctorName, clinicName, notificationEmail, defaultTimeSlots)
             VALUES (?, ?, ?, ?, ?)
             ON CONFLICT(id) DO UPDATE SET
             doctorName=excluded.doctorName,
             clinicName=excluded.clinicName`,
            [
              1, 
              `測試醫生 ${timestamp}`, 
              `測試診所 ${timestamp}`, 
              testEmail,
              JSON.stringify(['09:00', '10:00', '11:00'])
            ],
            function(err) {
              if (err) {
                console.error('更新測試設置失敗:', err.message);
              } else {
                console.log('成功更新測試設置資料');
                console.log(JSON.stringify(testData, null, 2));
                console.log('\n測試資料已成功寫入資料庫，請記錄以上資訊以便後續驗證。');
                
                // 寫入完成，關閉資料庫連接
                db.close(err => {
                  if (err) {
                    console.error('關閉資料庫時出錯:', err);
                  } else {
                    console.log('資料庫連接已關閉');
                  }
                  process.exit(0);
                });
              }
            }
          );
        }
      }
    );
  } catch (error) {
    console.error('處理過程中發生錯誤:', error);
    db.close();
    process.exit(1);
  }
}); 