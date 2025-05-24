const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./database.sqlite');

console.log('=== 修改 appointments 表結構 ===\n');

// 直接嘗試新增欄位
db.run('ALTER TABLE appointments ADD COLUMN patient_info TEXT', [], function(err) {
  if (err) {
    if (err.message.includes('duplicate column name')) {
      console.log('patient_info 欄位已存在');
      
      // 檢查現有資料
      db.all('SELECT id, patient_id, patient_info, notes FROM appointments WHERE id = 7', [], (err, rows) => {
        if (err) {
          console.error('查詢失敗:', err);
        } else {
          console.log('預約 ID 7 的資料:');
          rows.forEach(row => {
            console.log(row);
          });
        }
        db.close();
      });
    } else {
      console.error('新增欄位失敗:', err);
      db.close();
    }
  } else {
    console.log('✅ 成功新增 patient_info 欄位');
    
    // 更新 abc 用戶的預約
    const patientInfo = JSON.stringify({
      patientName: 'SENG HANG LEI',
      isActualPatient: true
    });
    
    db.run('UPDATE appointments SET patient_info = ? WHERE patient_id = (SELECT id FROM users WHERE username = "abc")', 
      [patientInfo], 
      function(err) {
        if (err) {
          console.error('更新失敗:', err);
        } else {
          console.log(`✅ 更新了 ${this.changes} 筆預約的就診者資訊`);
        }
        db.close();
      }
    );
  }
}); 