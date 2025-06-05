const sqlite3 = require('sqlite3').verbose();
const path = require('path');

console.log('🚑 緊急修復：添加缺失的欄位');

// 使用絕對路徑
const dbPath = path.join(__dirname, 'database.sqlite');
console.log('📍 資料庫路徑:', dbPath);

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('❌ 無法連接資料庫:', err.message);
    process.exit(1);
  }
  console.log('✅ 已連接到資料庫');

  // 先檢查當前結構
  db.all("PRAGMA table_info(appointments)", [], (err, columns) => {
    if (err) {
      console.error('❌ 檢查失敗:', err.message);
      db.close();
      return;
    }

    console.log('📋 當前欄位數量:', columns.length);
    const columnNames = columns.map(col => col.name);
    console.log('📋 欄位列表:', columnNames.join(', '));
    
    const hasIsNewPatient = columnNames.includes('isNewPatient');
    const hasPatientInfo = columnNames.includes('patient_info');
    
    console.log('🔍 isNewPatient 欄位:', hasIsNewPatient ? '✅ 存在' : '❌ 不存在');
    console.log('🔍 patient_info 欄位:', hasPatientInfo ? '✅ 存在' : '❌ 不存在');

    let completed = 0;
    let total = 0;
    
    // 添加缺失的欄位
    if (!hasIsNewPatient) {
      total++;
      console.log('\n🔧 添加 isNewPatient 欄位...');
      db.run('ALTER TABLE appointments ADD COLUMN isNewPatient BOOLEAN DEFAULT FALSE', (err) => {
        if (err) {
          console.error('❌ 添加 isNewPatient 失敗:', err.message);
        } else {
          console.log('✅ isNewPatient 欄位添加成功');
        }
        completed++;
        if (completed === total) finishUp();
      });
    }
    
    if (!hasPatientInfo) {
      total++;
      console.log('\n🔧 添加 patient_info 欄位...');
      db.run('ALTER TABLE appointments ADD COLUMN patient_info TEXT', (err) => {
        if (err) {
          console.error('❌ 添加 patient_info 失敗:', err.message);
        } else {
          console.log('✅ patient_info 欄位添加成功');
        }
        completed++;
        if (completed === total) finishUp();
      });
    }

    if (total === 0) {
      console.log('\n✅ 所有欄位都已存在，無需修復');
      testSQL();
    }

    function finishUp() {
      console.log(`\n📊 修復完成 ${completed}/${total}`);
      testSQL();
    }

    function testSQL() {
      console.log('\n🧪 測試創建預約SQL...');
      const testSQL = `
        INSERT INTO appointments (
          doctor_id, patient_id, date, time, notes, status, patient_info, isNewPatient, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
      `;
      const testParams = [4, 3, '2025-07-02', '14:00', '測試', 'confirmed', '{"name":"測試"}', true];
      
      db.run(testSQL, testParams, function(err) {
        if (err) {
          console.error('❌ 測試SQL失敗:', err.message);
          console.error('  完整錯誤:', err);
        } else {
          console.log('✅ 測試SQL成功！插入ID:', this.lastID);
          // 清理測試記錄
          db.run('DELETE FROM appointments WHERE id = ?', [this.lastID]);
        }
        
        console.log('\n🎉 修復完成！');
        db.close();
      });
    }
  });
}); 