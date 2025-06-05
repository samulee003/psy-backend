/**
 * 緊急修復：重建 appointments 表結構
 * 解決 isNewPatient 欄位識別問題
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'database.sqlite');

async function emergencyTableFix() {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(dbPath, (err) => {
      if (err) {
        console.error('❌ 無法連接資料庫:', err.message);
        reject(err);
        return;
      }
      console.log('✅ 成功連接到資料庫');
    });

    console.log('🚑 開始緊急修復 appointments 表...\n');

    // 1. 備份現有數據
    console.log('📁 備份現有預約數據...');
    db.all('SELECT * FROM appointments', [], (err, existingAppointments) => {
      if (err) {
        console.error('❌ 備份數據失敗:', err.message);
        db.close();
        reject(err);
        return;
      }

      console.log(`✅ 成功備份 ${existingAppointments.length} 條預約記錄`);

      // 2. 刪除現有表
      console.log('\n🗑️ 刪除現有 appointments 表...');
      db.run('DROP TABLE IF EXISTS appointments', [], (err) => {
        if (err) {
          console.error('❌ 刪除表失敗:', err.message);
          db.close();
          reject(err);
          return;
        }

        console.log('✅ 成功刪除現有表');

        // 3. 重新創建表（標準格式）
        console.log('\n🔧 重新創建 appointments 表...');
        const createTableSQL = `
          CREATE TABLE appointments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            date TEXT NOT NULL,
            time TEXT NOT NULL,
            patient_id INTEGER,
            doctor_id INTEGER,
            status TEXT DEFAULT 'confirmed',
            notes TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            utc_datetime TEXT,
            patient_info TEXT,
            isNewPatient BOOLEAN DEFAULT FALSE,
            FOREIGN KEY (patient_id) REFERENCES users(id),
            FOREIGN KEY (doctor_id) REFERENCES users(id)
          )
        `;

        db.run(createTableSQL, [], (err) => {
          if (err) {
            console.error('❌ 創建表失敗:', err.message);
            db.close();
            reject(err);
            return;
          }

          console.log('✅ 成功重新創建表');

          // 4. 驗證表結構
          console.log('\n🔍 驗證新表結構...');
          db.all("PRAGMA table_info(appointments)", (err, columns) => {
            if (err) {
              console.error('❌ 驗證表結構失敗:', err.message);
              db.close();
              reject(err);
              return;
            }

            console.log('📋 新表欄位:');
            columns.forEach(col => {
              console.log(`  - ${col.name} (${col.type})`);
            });

            // 檢查關鍵欄位
            const hasIsNewPatient = columns.some(col => col.name === 'isNewPatient');
            const hasPatientInfo = columns.some(col => col.name === 'patient_info');

            if (!hasIsNewPatient || !hasPatientInfo) {
              console.error('❌ 關鍵欄位缺失');
              db.close();
              reject(new Error('關鍵欄位缺失'));
              return;
            }

            console.log('✅ 關鍵欄位檢查通過');

            // 5. 恢復數據
            if (existingAppointments.length > 0) {
              console.log('\n📥 恢復預約數據...');
              
              let restored = 0;
              let errors = 0;

              const restoreNext = (index) => {
                if (index >= existingAppointments.length) {
                  // 所有數據恢復完成
                  console.log(`\n📊 數據恢復完成: ${restored} 成功, ${errors} 失敗`);
                  
                  // 6. 測試新表功能
                  console.log('\n🧪 測試新表功能...');
                  const testSQL = `
                    INSERT INTO appointments (
                      doctor_id, patient_id, date, time, notes, status, patient_info, isNewPatient, created_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
                  `;
                  
                  db.run(testSQL, [4, 3, '2025-07-03', '16:00', '測試', 'confirmed', '{"name":"測試"}', true], function(err) {
                    if (err) {
                      console.error('❌ 功能測試失敗:', err.message);
                      db.close();
                      reject(err);
                      return;
                    }

                    console.log('✅ 功能測試成功，測試記錄ID:', this.lastID);
                    
                    // 清理測試記錄
                    db.run('DELETE FROM appointments WHERE id = ?', [this.lastID], () => {
                      console.log('🧹 測試記錄已清理');
                      
                      db.close();
                      resolve({
                        fixed: true,
                        message: '表結構修復成功',
                        restoredRecords: restored,
                        failedRecords: errors
                      });
                    });
                  });
                  return;
                }

                const record = existingAppointments[index];
                
                // 處理 isNewPatient 值
                let isNewPatientValue = false;
                if (record.isNewPatient !== undefined && record.isNewPatient !== null) {
                  isNewPatientValue = record.isNewPatient === 1 || record.isNewPatient === true || record.isNewPatient === 'true';
                }

                const insertSQL = `
                  INSERT INTO appointments (
                    id, date, time, patient_id, doctor_id, status, notes, created_at, updated_at, 
                    utc_datetime, patient_info, isNewPatient
                  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                `;

                const insertParams = [
                  record.id,
                  record.date,
                  record.time,
                  record.patient_id,
                  record.doctor_id,
                  record.status || 'confirmed',
                  record.notes,
                  record.created_at,
                  record.updated_at || record.created_at,
                  record.utc_datetime,
                  record.patient_info,
                  isNewPatientValue
                ];

                db.run(insertSQL, insertParams, function(err) {
                  if (err) {
                    console.error(`❌ 恢復記錄 ${record.id} 失敗:`, err.message);
                    errors++;
                  } else {
                    restored++;
                    if (restored % 10 === 0) {
                      console.log(`📥 已恢復 ${restored} 條記錄...`);
                    }
                  }
                  
                  restoreNext(index + 1);
                });
              };

              restoreNext(0);
            } else {
              console.log('\n📭 沒有需要恢復的數據');
              
              // 直接進行功能測試
              console.log('\n🧪 測試新表功能...');
              const testSQL = `
                INSERT INTO appointments (
                  doctor_id, patient_id, date, time, notes, status, patient_info, isNewPatient, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
              `;
              
              db.run(testSQL, [4, 3, '2025-07-03', '16:00', '測試', 'confirmed', '{"name":"測試"}', true], function(err) {
                if (err) {
                  console.error('❌ 功能測試失敗:', err.message);
                  db.close();
                  reject(err);
                  return;
                }

                console.log('✅ 功能測試成功，測試記錄ID:', this.lastID);
                
                // 清理測試記錄
                db.run('DELETE FROM appointments WHERE id = ?', [this.lastID], () => {
                  console.log('🧹 測試記錄已清理');
                  
                  db.close();
                  resolve({
                    fixed: true,
                    message: '表結構修復成功',
                    restoredRecords: 0,
                    failedRecords: 0
                  });
                });
              });
            }
          });
        });
      });
    });
  });
}

// 執行修復
if (require.main === module) {
  console.log('🚨 開始緊急表結構修復...\n');
  
  emergencyTableFix()
    .then(result => {
      console.log('\n🎉 緊急修復完成!');
      console.log('結果:', result);
      
      console.log('\n📝 後續步驟:');
      console.log('1. 重新啟動後端服務');
      console.log('2. 測試預約功能');
      console.log('3. 確認 isNewPatient 功能正常');
      
      process.exit(0);
    })
    .catch(error => {
      console.error('\n❌ 緊急修復失敗:', error.message);
      process.exit(1);
    });
}

module.exports = { emergencyTableFix }; 