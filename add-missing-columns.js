/**
 * 添加 appointments 表缺少的欄位
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'database.sqlite');

console.log('🔧 添加 appointments 表缺少的欄位...\n');

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('❌ 無法連接資料庫:', err.message);
    process.exit(1);
  }
  console.log('✅ 已連接到資料庫');
});

// 檢查當前表結構
db.all("PRAGMA table_info(appointments)", (err, columns) => {
  if (err) {
    console.error('❌ 檢查表結構失敗:', err.message);
    process.exit(1);
  }

  const existingColumns = columns.map(col => col.name);
  console.log('當前欄位:', existingColumns.join(', '));

  // 檢查並添加 isNewPatient 欄位
  if (!existingColumns.includes('isNewPatient')) {
    console.log('\n🔧 添加 isNewPatient 欄位...');
    db.run('ALTER TABLE appointments ADD COLUMN isNewPatient BOOLEAN DEFAULT FALSE', (err) => {
      if (err) {
        console.error('❌ 添加 isNewPatient 失敗:', err.message);
      } else {
        console.log('✅ 成功添加 isNewPatient 欄位');
      }
      
      // 添加 patient_info 欄位
      if (!existingColumns.includes('patient_info')) {
        console.log('\n🔧 添加 patient_info 欄位...');
        db.run('ALTER TABLE appointments ADD COLUMN patient_info TEXT', (err) => {
          if (err) {
            console.error('❌ 添加 patient_info 失敗:', err.message);
          } else {
            console.log('✅ 成功添加 patient_info 欄位');
          }
          
          // 測試新結構
          console.log('\n🧪 測試新表結構...');
          db.run(`INSERT INTO appointments (
            doctor_id, patient_id, date, time, notes, status, patient_info, isNewPatient, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`, 
          [4, 3, '2025-08-10', '10:00', '測試', 'confirmed', '{"name":"測試"}', true], 
          function(err) {
            if (err) {
              console.error('❌ 測試失敗:', err.message);
            } else {
              console.log('✅ 測試成功，記錄ID:', this.lastID);
              
              // 清理測試記錄
              db.run('DELETE FROM appointments WHERE id = ?', [this.lastID], () => {
                console.log('✅ 修復完成！');
                db.close();
              });
            }
          });
        });
      } else {
        console.log('patient_info 欄位已存在');
        db.close();
      }
    });
  } else {
    console.log('isNewPatient 欄位已存在');
    
    // 檢查 patient_info
    if (!existingColumns.includes('patient_info')) {
      console.log('\n🔧 添加 patient_info 欄位...');
      db.run('ALTER TABLE appointments ADD COLUMN patient_info TEXT', (err) => {
        if (err) {
          console.error('❌ 添加 patient_info 失敗:', err.message);
        } else {
          console.log('✅ 成功添加 patient_info 欄位');
        }
        db.close();
      });
    } else {
      console.log('所有欄位都已存在');
      db.close();
    }
  }
}); 