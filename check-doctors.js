const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// 連接資料庫
const dbPath = path.join(__dirname, 'database.sqlite');
const db = new sqlite3.Database(dbPath);

console.log('=== 檢查醫生帳號 ===\n');

// 查詢所有醫生用戶
db.all('SELECT * FROM users WHERE role = "doctor"', [], (err, doctors) => {
  if (err) {
    console.error('查詢失敗:', err.message);
    return;
  }
  
  console.log(`找到 ${doctors.length} 個醫生帳號：\n`);
  
  doctors.forEach((doctor, index) => {
    console.log(`醫生 ${index + 1}:`);
    console.log(`  - ID: ${doctor.id}`);
    console.log(`  - 姓名: ${doctor.name}`);
    console.log(`  - 郵箱: ${doctor.email}`);
    console.log(`  - 用戶名: ${doctor.username}`);
    console.log(`  - 電話: ${doctor.phone || '未設置'}`);
    console.log(`  - 密碼雜湊: ${doctor.password.substring(0, 20)}...`);
    console.log(`  - 創建時間: ${doctor.created_at}`);
    console.log('  ---');
  });
  
  db.close();
}); 