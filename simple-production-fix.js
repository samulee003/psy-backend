const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

console.log('🚑 簡化版生產環境修復啟動');
console.log('=============================');

// 尋找資料庫
const dbPath = path.join(__dirname, 'database.sqlite');
console.log('📍 資料庫路徑:', dbPath);
console.log('📂 資料庫存在:', fs.existsSync(dbPath));

if (!fs.existsSync(dbPath)) {
  console.error('❌ 資料庫不存在');
  process.exit(1);
}

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('❌ 連接失敗:', err.message);
    process.exit(1);
  }
  console.log('✅ 資料庫連接成功');
  
  // 檢查表結構
  console.log('\n🔍 檢查欄位結構...');
  db.all("PRAGMA table_info(appointments)", (err, columns) => {
    if (err) {
      console.error('❌ 檢查失敗:', err.message);
      db.close();
      return;
    }
    
    const existingColumns = columns.map(col => col.name);
    console.log('📋 現有欄位:', existingColumns.join(', '));
    
    const hasIsNewPatient = existingColumns.includes('isNewPatient');
    const hasPatientInfo = existingColumns.includes('patient_info');
    
    console.log('🔍 isNewPatient:', hasIsNewPatient ? '✅' : '❌');
    console.log('🔍 patient_info:', hasPatientInfo ? '✅' : '❌');
    
    if (hasIsNewPatient && hasPatientInfo) {
      console.log('\n🎉 所有欄位都存在！');
      
      // 測試預約創建
      console.log('\n🧪 測試預約創建...');
      const testSQL = `
        INSERT INTO appointments (
          doctor_id, patient_id, date, time, notes, status, patient_info, isNewPatient, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
      `;
      
      db.run(testSQL, [4, 3, '2025-12-01', '10:00', '測試', 'confirmed', '{"name":"測試"}', true], function(err) {
        if (err) {
          console.error('❌ 測試失敗:', err.message);
        } else {
          console.log('✅ 測試成功，記錄ID:', this.lastID);
          // 清理
          db.run('DELETE FROM appointments WHERE id = ?', [this.lastID]);
        }
        
        console.log('\n🏁 本地資料庫完全正常！');
        console.log('💡 問題在於生產環境資料庫與本地不同步');
        console.log('💡 請在生產環境運行此修復腳本');
        db.close();
      });
      
    } else {
      console.log('\n🔧 需要修復缺失的欄位...');
      
      let needFix = [];
      if (!hasIsNewPatient) needFix.push('isNewPatient');
      if (!hasPatientInfo) needFix.push('patient_info');
      
      console.log('📝 需要添加:', needFix.join(', '));
      
      let completed = 0;
      
      if (!hasIsNewPatient) {
        console.log('  添加 isNewPatient...');
        db.run('ALTER TABLE appointments ADD COLUMN isNewPatient BOOLEAN DEFAULT FALSE', (err) => {
          if (err) console.error('  ❌ 失敗:', err.message);
          else console.log('  ✅ 成功');
          completed++;
          if (completed === needFix.length) finish();
        });
      }
      
      if (!hasPatientInfo) {
        console.log('  添加 patient_info...');
        db.run('ALTER TABLE appointments ADD COLUMN patient_info TEXT', (err) => {
          if (err) console.error('  ❌ 失敗:', err.message);
          else console.log('  ✅ 成功');
          completed++;
          if (completed === needFix.length) finish();
        });
      }
      
      function finish() {
        console.log('\n🎉 修復完成！');
        console.log('💡 請重啟應用服務');
        db.close();
      }
    }
  });
}); 