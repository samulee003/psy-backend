const sqlite3 = require('sqlite3').verbose();

const db = new sqlite3.Database('./database.sqlite');

console.log('=== 檢查現有醫生 ===');

// 首先檢查現有醫生
db.all('SELECT id, name, email, role FROM users WHERE role = ?', ['doctor'], (err, doctors) => {
  if (err) {
    console.error('錯誤:', err);
    db.close();
    return;
  }

  console.log('現有醫生數量:', doctors.length);
  doctors.forEach(d => {
    console.log(`- ID: ${d.id}, Name: ${d.name}, Email: ${d.email}`);
  });

  if (doctors.length === 0) {
    console.log('\n=== 添加測試醫生 ===');
    
    // 添加測試醫生
    const insertSql = `
      INSERT OR IGNORE INTO users (username, email, password, name, role, phone) 
      VALUES (?, ?, ?, ?, ?, ?)
    `;
    
    const doctors = [
      ['doctor1', 'doctor1@example.com', '$simple$cGFzc3dvcmQxMjM=', '李心理醫師', 'doctor', '+886912345001'],
      ['doctor2', 'doctor2@example.com', '$simple$cGFzc3dvcmQxMjM=', '王心理醫師', 'doctor', '+886912345002'],
      ['doctor3', 'doctor3@example.com', '$simple$cGFzc3dvcmQxMjM=', '陳心理醫師', 'doctor', '+886912345003']
    ];

    let completed = 0;
    doctors.forEach((doctorData, index) => {
      db.run(insertSql, doctorData, function(err) {
        if (err) {
          console.error(`添加醫生 ${index + 1} 失敗:`, err);
        } else {
          console.log(`✅ 醫生 ${doctorData[3]} 添加成功 (ID: ${this.lastID})`);
        }
        
        completed++;
        if (completed === doctors.length) {
          console.log('\n=== 驗證添加結果 ===');
          db.all('SELECT id, name, email, role FROM users WHERE role = ?', ['doctor'], (err, newDoctors) => {
            if (err) {
              console.error('驗證錯誤:', err);
            } else {
              console.log('現在醫生總數:', newDoctors.length);
              newDoctors.forEach(d => {
                console.log(`- ID: ${d.id}, Name: ${d.name}, Email: ${d.email}`);
              });
            }
            db.close();
          });
        }
      });
    });
  } else {
    console.log('已有醫生資料，無需添加');
    db.close();
  }
}); 