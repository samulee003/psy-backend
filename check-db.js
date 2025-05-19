const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./database.sqlite');

// 獲取用戶表結構
db.all("PRAGMA table_info(users)", [], (err, columns) => {
  if (err) {
    console.error('無法獲取用戶表結構:', err.message);
    return db.close();
  }
  
  console.log('=== 用戶表結構 ===');
  columns.forEach(col => {
    console.log(`${col.name} (${col.type}) ${col.notnull ? 'NOT NULL' : ''} ${col.pk ? 'PRIMARY KEY' : ''}`);
  });
  
  // 查詢醫生用戶
  db.all("SELECT id, username, name, role FROM users WHERE role = 'doctor'", [], (err, doctors) => {
    if (err) {
      console.error('查詢醫生用戶錯誤:', err.message);
    } else {
      console.log('\n=== 醫生用戶 ===');
      if (doctors.length === 0) {
        console.log('沒有發現醫生用戶！');
      } else {
        doctors.forEach(doc => {
          console.log(`ID: ${doc.id}, 用戶名: ${doc.username}, 姓名: ${doc.name}, 角色: ${doc.role}`);
        });
      }
    }
    
    db.close();
  });
}); 