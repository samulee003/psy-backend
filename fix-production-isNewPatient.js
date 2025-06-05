#!/usr/bin/env node

/**
 * 生產環境 isNewPatient 欄位緊急修復
 * 解決：SQLITE_ERROR: table appointments has no column named isNewPatient
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// 使用環境變數指定的資料庫路徑，或預設路徑
const dbPath = process.env.DATABASE_URL || process.env.DB_PATH || path.join(__dirname, 'database.sqlite');

console.log('🚑 生產環境緊急修復：添加 isNewPatient 欄位');
console.log('📍 資料庫路徑:', dbPath);

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('❌ 無法連接資料庫:', err.message);
    process.exit(1);
  }
  console.log('✅ 成功連接到生產環境資料庫');
});

// 檢查現有表結構
console.log('\n🔍 檢查當前 appointments 表結構...');
db.all("PRAGMA table_info(appointments)", (err, columns) => {
  if (err) {
    console.error('❌ 檢查表結構失敗:', err.message);
    process.exit(1);
  }

  console.log('📋 當前欄位:');
  const existingColumns = columns.map(col => col.name);
  columns.forEach(col => {
    console.log(`  - ${col.name} (${col.type})`);
  });

  // 檢查缺少的欄位
  const missingColumns = [];
  if (!existingColumns.includes('isNewPatient')) {
    missingColumns.push('isNewPatient');
  }
  if (!existingColumns.includes('patient_info')) {
    missingColumns.push('patient_info');
  }

  if (missingColumns.length === 0) {
    console.log('\n✅ 所有必要欄位都已存在，無需修復');
    db.close();
    return;
  }

  console.log(`\n🚨 發現缺少欄位: ${missingColumns.join(', ')}`);
  
  // 逐一添加缺少的欄位
  let completed = 0;
  const total = missingColumns.length;

  missingColumns.forEach((column, index) => {
    let sql = '';
    
    if (column === 'isNewPatient') {
      sql = 'ALTER TABLE appointments ADD COLUMN isNewPatient BOOLEAN DEFAULT FALSE';
    } else if (column === 'patient_info') {
      sql = 'ALTER TABLE appointments ADD COLUMN patient_info TEXT';
    }

    console.log(`\n🔧 [${index + 1}/${total}] 執行: ${sql}`);
    
    db.run(sql, (err) => {
      if (err) {
        console.error(`❌ 添加 ${column} 失敗:`, err.message);
      } else {
        console.log(`✅ 成功添加 ${column} 欄位`);
      }
      
      completed++;
      
      // 當所有欄位都處理完成時
      if (completed === total) {
        console.log(`\n📊 修復完成: ${completed}/${total} 個欄位`);
        
        // 驗證修復結果
        console.log('\n🔍 驗證修復結果...');
        db.all("PRAGMA table_info(appointments)", (err, newColumns) => {
          if (err) {
            console.error('❌ 驗證失敗:', err.message);
            db.close();
            return;
          }

          console.log('\n📋 修復後的表結構:');
          newColumns.forEach(col => {
            console.log(`  - ${col.name} (${col.type}) ${col.notnull ? 'NOT NULL' : 'NULL'} ${col.dflt_value ? `DEFAULT ${col.dflt_value}` : ''}`);
          });

          // 最終檢查
          const finalColumns = newColumns.map(col => col.name);
          const stillMissing = ['isNewPatient', 'patient_info'].filter(col => !finalColumns.includes(col));

          if (stillMissing.length === 0) {
            console.log('\n🎉 修復成功！所有必要欄位都已添加');
            
            // 測試新結構
            console.log('\n🧪 測試新表結構...');
            const testSQL = `
              INSERT INTO appointments (
                doctor_id, patient_id, date, time, notes, status, patient_info, isNewPatient, created_at
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
            `;
            
            db.run(testSQL, [4, 3, '2025-08-15', '10:00', '測試', 'confirmed', '{"name":"測試"}', true], function(err) {
              if (err) {
                console.error('❌ 測試失敗:', err.message);
              } else {
                console.log('✅ 測試成功！新結構正常工作，測試記錄ID:', this.lastID);
                
                // 清理測試記錄
                db.run('DELETE FROM appointments WHERE id = ?', [this.lastID], () => {
                  console.log('🧹 測試記錄已清理');
                  console.log('\n🎊 生產環境修復完成！現在可以正常創建預約了');
                  db.close();
                });
              }
            });
          } else {
            console.log(`\n❌ 仍有欄位缺少: ${stillMissing.join(', ')}`);
            db.close();
          }
        });
      }
    });
  });
});

// 執行修復
if (require.main === module) {
  fixProductionDatabase()
    .then(result => {
      console.log(`\n✅ 修復完成: ${result}`);
      process.exit(0);
    })
    .catch(error => {
      console.error('\n❌ 修復失敗:', error.message);
      process.exit(1);
    });
}

module.exports = { fixProductionDatabase }; 