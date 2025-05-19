/**
 * 測試資料驗證腳本 - 用於驗證 Zeabur 資料庫持久性
 * 使用方式: node verify-test-data.js <測試用戶Email>
 * 例如: node verify-test-data.js test.2025-05-20T10-30-00-000Z@example.com
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// 檢查命令行參數
if (process.argv.length < 3) {
  console.error('錯誤: 請提供測試用戶Email作為參數');
  console.error('用法: node verify-test-data.js <測試用戶Email>');
  console.error('例如: node verify-test-data.js test.2025-05-20T10-30-00-000Z@example.com');
  process.exit(1);
}

// 獲取測試用戶Email
const testEmail = process.argv[2];

// 獲取資料庫路徑（優先使用環境變數）
const dbPath = process.env.DB_PATH || path.join(__dirname, 'database.sqlite');
console.log(`資料庫路徑: ${dbPath}`);
console.log(`正在驗證測試用戶: ${testEmail}`);

// 連接資料庫
const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READONLY, err => {
  if (err) {
    console.error('無法連接到資料庫:', err.message);
    process.exit(1);
  }
  
  console.log('成功連接到資料庫');
  
  // 查詢測試用戶
  db.get('SELECT * FROM users WHERE username = ?', [testEmail], (err, user) => {
    if (err) {
      console.error('查詢用戶資料失敗:', err.message);
      db.close();
      process.exit(1);
    }
    
    if (!user) {
      console.error(`未找到測試用戶 ${testEmail}`);
      console.error('資料庫持久性測試失敗：可能的原因是資料庫被重置或未正確保存');
      db.close();
      process.exit(1);
    }
    
    console.log('測試用戶資料:');
    console.log(`ID: ${user.id}`);
    console.log(`名稱: ${user.name}`);
    console.log(`角色: ${user.role}`);
    console.log(`電話: ${user.phone}`);
    
    // 查詢設置資料
    db.get('SELECT * FROM settings WHERE id = 1', (err, settings) => {
      if (err) {
        console.error('查詢設置資料失敗:', err.message);
        db.close();
        process.exit(1);
      }
      
      if (!settings) {
        console.error('未找到設置資料');
        db.close();
        process.exit(1);
      }
      
      console.log('\n設置資料:');
      console.log(`醫生名稱: ${settings.doctorName}`);
      console.log(`診所名稱: ${settings.clinicName}`);
      console.log(`通知Email: ${settings.notificationEmail}`);
      
      // 驗證完成
      console.log('\n資料庫持久性測試結果: 成功 ✓');
      console.log('資料庫正確保留了在部署前建立的測試資料');
      
      // 關閉資料庫連接
      db.close(err => {
        if (err) {
          console.error('關閉資料庫時出錯:', err);
        } else {
          console.log('資料庫連接已關閉');
        }
        process.exit(0);
      });
    });
  });
}); 