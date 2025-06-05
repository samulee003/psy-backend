/**
 * 緊急修復：Appointments表結構修復
 * 添加缺少的 isNewPatient 欄位和其他必要欄位
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'database.sqlite');

function fixAppointmentsTableStructure() {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(dbPath, (err) => {
      if (err) {
        console.error('❌ 無法連接資料庫:', err.message);
        reject(err);
        return;
      }
      console.log('✅ 成功連接到資料庫');
    });

    console.log('🔍 檢查當前 appointments 表結構...\n');

    // 1. 檢查當前表結構
    db.all("PRAGMA table_info(appointments)", (err, columns) => {
      if (err) {
        console.error('❌ 無法獲取表結構:', err.message);
        db.close();
        reject(err);
        return;
      }

      console.log('📋 當前 appointments 表欄位:');
      columns.forEach(col => {
        console.log(`  - ${col.name} (${col.type}) ${col.notnull ? 'NOT NULL' : 'NULL'} ${col.dflt_value ? `DEFAULT ${col.dflt_value}` : ''}`);
      });

      // 檢查缺少的欄位
      const existingColumns = columns.map(col => col.name);
      const requiredColumns = ['isNewPatient', 'patient_info'];
      const missingColumns = requiredColumns.filter(col => !existingColumns.includes(col));

      console.log('\n🔍 檢查結果:');
      requiredColumns.forEach(col => {
        const exists = existingColumns.includes(col);
        console.log(`  - ${col}: ${exists ? '✅ 存在' : '❌ 缺少'}`);
      });

      if (missingColumns.length === 0) {
        console.log('\n✅ 表結構完整，無需修復');
        db.close();
        resolve({ fixed: false, message: '表結構已完整' });
        return;
      }

      console.log(`\n🛠️ 需要添加 ${missingColumns.length} 個欄位: ${missingColumns.join(', ')}`);

      // 2. 開始修復
      let fixCount = 0;
      const totalFixes = missingColumns.length;

      const executeAlterTable = (columnName, callback) => {
        let sql = '';
        
        switch (columnName) {
          case 'isNewPatient':
            sql = 'ALTER TABLE appointments ADD COLUMN isNewPatient BOOLEAN DEFAULT FALSE';
            break;
          case 'patient_info':
            sql = 'ALTER TABLE appointments ADD COLUMN patient_info TEXT';
            break;
          default:
            console.log(`⚠️ 未知欄位: ${columnName}`);
            callback();
            return;
        }

        console.log(`\n🔧 執行: ${sql}`);
        
        db.run(sql, (err) => {
          if (err) {
            console.error(`❌ 添加 ${columnName} 失敗:`, err.message);
          } else {
            console.log(`✅ 成功添加 ${columnName} 欄位`);
            fixCount++;
          }
          callback();
        });
      };

      // 依序執行修復
      let currentIndex = 0;
      const processNext = () => {
        if (currentIndex >= missingColumns.length) {
          // 所有修復完成
          console.log(`\n📊 修復完成: ${fixCount}/${totalFixes} 個欄位成功添加`);
          
          // 3. 驗證修復結果
          console.log('\n🔍 驗證修復結果...');
          db.all("PRAGMA table_info(appointments)", (err, newColumns) => {
            if (err) {
              console.error('❌ 驗證失敗:', err.message);
              db.close();
              reject(err);
              return;
            }

            console.log('\n📋 修復後的 appointments 表欄位:');
            newColumns.forEach(col => {
              console.log(`  - ${col.name} (${col.type}) ${col.notnull ? 'NOT NULL' : 'NULL'} ${col.dflt_value ? `DEFAULT ${col.dflt_value}` : ''}`);
            });

            // 檢查是否所有必要欄位都存在
            const newColumnNames = newColumns.map(col => col.name);
            const stillMissing = requiredColumns.filter(col => !newColumnNames.includes(col));

            if (stillMissing.length === 0) {
              console.log('\n🎉 表結構修復成功！所有必要欄位都已存在');
              db.close();
              resolve({ 
                fixed: true, 
                message: `成功添加 ${fixCount} 個欄位`,
                addedColumns: missingColumns.slice(0, fixCount)
              });
            } else {
              console.log(`\n❌ 仍有欄位缺少: ${stillMissing.join(', ')}`);
              db.close();
              reject(new Error(`修復不完整，仍缺少: ${stillMissing.join(', ')}`));
            }
          });
          return;
        }

        executeAlterTable(missingColumns[currentIndex], () => {
          currentIndex++;
          processNext();
        });
      };

      processNext();
    });
  });
}

// 執行修復
if (require.main === module) {
  console.log('🚑 開始緊急修復 appointments 表結構...\n');
  
  fixAppointmentsTableStructure()
    .then(result => {
      console.log('\n🎊 修復完成!');
      console.log('結果:', result);
      
      if (result.fixed) {
        console.log('\n📝 後續步驟:');
        console.log('1. 重新啟動後端服務');
        console.log('2. 測試預約功能');
        console.log('3. 確認初診預約正常運作');
      }
      
      process.exit(0);
    })
    .catch(error => {
      console.error('\n❌ 修復失敗:', error.message);
      process.exit(1);
    });
}

module.exports = { fixAppointmentsTableStructure }; 