/**
 * 調試 Appointments 表問題
 * 深入分析為什麼會出現欄位不存在的錯誤
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'database.sqlite');

async function debugAppointmentsTable() {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(dbPath, (err) => {
      if (err) {
        console.error('❌ 無法連接資料庫:', err.message);
        reject(err);
        return;
      }
      console.log('✅ 成功連接到資料庫');
    });

    console.log('🔍 深入調試 appointments 表...\n');

    // 1. 詳細檢查表結構
    db.all("PRAGMA table_info(appointments)", (err, columns) => {
      if (err) {
        console.error('❌ 無法獲取表結構:', err.message);
        db.close();
        reject(err);
        return;
      }

      console.log('📋 詳細表結構信息:');
      columns.forEach((col, index) => {
        console.log(`${index + 1}. 欄位名: "${col.name}"`);
        console.log(`   - 類型: ${col.type}`);
        console.log(`   - 可空: ${col.notnull ? 'NO' : 'YES'}`);
        console.log(`   - 預設值: ${col.dflt_value || '無'}`);
        console.log(`   - 主鍵: ${col.pk ? 'YES' : 'NO'}`);
        console.log('');
      });

      // 2. 測試實際的INSERT語句
      console.log('🧪 測試實際的INSERT語句...\n');
      
      const testSQL = `
        INSERT INTO appointments (
          doctor_id, patient_id, date, time, notes, status, patient_info, isNewPatient, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
      `;
      
      const testParams = [
        4,
        3,
        '2025-07-02',
        '15:30',
        '測試備註',
        'confirmed',
        '{"name":"測試患者","phone":"12345678"}',
        false
      ];

      console.log('🔧 準備執行的SQL:');
      console.log(testSQL);
      console.log('\n📋 參數:');
      testParams.forEach((param, index) => {
        console.log(`  ${index + 1}. ${typeof param === 'string' ? `"${param}"` : param}`);
      });

      // 執行測試
      db.run(testSQL, testParams, function(err) {
        if (err) {
          console.log('\n❌ INSERT 測試失敗:');
          console.log('錯誤:', err.message);
          console.log('錯誤代碼:', err.code);
          
          // 分析錯誤
          if (err.message.includes('no column named')) {
            const match = err.message.match(/no column named (\w+)/);
            if (match) {
              const missingColumn = match[1];
              console.log(`\n🔍 缺少的欄位: "${missingColumn}"`);
              
              // 檢查欄位名稱是否有空格或特殊字符
              const foundColumn = columns.find(col => col.name === missingColumn);
              if (foundColumn) {
                console.log('⚠️ 奇怪！欄位存在但無法使用');
                console.log('欄位詳情:', foundColumn);
              } else {
                console.log('❌ 確認欄位不存在');
                // 檢查相似的欄位名
                const similarColumns = columns.filter(col => 
                  col.name.toLowerCase().includes(missingColumn.toLowerCase()) ||
                  missingColumn.toLowerCase().includes(col.name.toLowerCase())
                );
                if (similarColumns.length > 0) {
                  console.log('🔍 找到相似的欄位:');
                  similarColumns.forEach(col => {
                    console.log(`  - "${col.name}"`);
                  });
                }
              }
            }
          }
        } else {
          console.log('\n✅ INSERT 測試成功!');
          console.log('新記錄ID:', this.lastID);
          
          // 清理測試記錄
          db.run('DELETE FROM appointments WHERE id = ?', [this.lastID], (deleteErr) => {
            if (deleteErr) {
              console.log('⚠️ 清理測試記錄失敗:', deleteErr.message);
            } else {
              console.log('🧹 測試記錄已清理');
            }
          });
        }

        // 3. 檢查表的創建語句
        console.log('\n🔍 檢查表的創建語句...');
        db.get("SELECT sql FROM sqlite_master WHERE type='table' AND name='appointments'", (err, row) => {
          if (err) {
            console.error('❌ 無法獲取創建語句:', err.message);
          } else if (row) {
            console.log('📋 表創建語句:');
            console.log(row.sql);
          } else {
            console.log('❌ 找不到appointments表');
          }

          // 4. 檢查是否有索引相關問題
          console.log('\n🔍 檢查表的索引...');
          db.all("PRAGMA index_list(appointments)", (err, indexes) => {
            if (err) {
              console.error('❌ 無法獲取索引信息:', err.message);
            } else {
              console.log('📋 表索引:');
              if (indexes.length === 0) {
                console.log('  無索引');
              } else {
                indexes.forEach(idx => {
                  console.log(`  - ${idx.name} (unique: ${idx.unique})`);
                });
              }
            }

            db.close();
            resolve({ completed: true });
          });
        });
      });
    });
  });
}

// 執行調試
if (require.main === module) {
  console.log('🐛 開始深入調試 appointments 表問題...\n');
  
  debugAppointmentsTable()
    .then(() => {
      console.log('\n🎯 調試完成');
    })
    .catch(error => {
      console.error('\n❌ 調試失敗:', error.message);
    });
}

module.exports = { debugAppointmentsTable }; 