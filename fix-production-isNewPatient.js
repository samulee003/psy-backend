#!/usr/bin/env node

/**
 * 修復生產環境 isNewPatient 欄位問題
 * 確保線上資料庫與本地資料庫結構一致
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const DB_PATH = path.join(__dirname, 'database.sqlite');

async function fixProductionDatabase() {
  return new Promise((resolve, reject) => {
    console.log('🔧 開始修復生產環境資料庫 isNewPatient 欄位...\n');
    
    const db = new sqlite3.Database(DB_PATH, (err) => {
      if (err) {
        console.error('❌ 資料庫連接失敗:', err.message);
        reject(err);
        return;
      }
      console.log('✅ 成功連接到資料庫');
    });

    // 1. 檢查當前表結構
    console.log('\n1️⃣ 檢查當前 appointments 表結構...');
    db.all("PRAGMA table_info(appointments)", [], (err, columns) => {
      if (err) {
        console.error('❌ 無法獲取表結構:', err.message);
        db.close();
        reject(err);
        return;
      }

      console.log('📋 當前表欄位:');
      columns.forEach(col => {
        console.log(`   - ${col.name} (${col.type})`);
      });

      // 2. 檢查 isNewPatient 欄位是否存在
      const hasIsNewPatient = columns.some(col => col.name === 'isNewPatient');
      
      if (hasIsNewPatient) {
        console.log('\n✅ isNewPatient 欄位已存在');
        
        // 3. 檢查現有預約記錄中 isNewPatient 的值
        db.all("SELECT id, date, time, patient_info, isNewPatient FROM appointments LIMIT 5", [], (err, appointments) => {
          if (err) {
            console.error('❌ 查詢預約記錄失敗:', err.message);
          } else {
            console.log('\n📊 現有預約記錄樣本:');
            appointments.forEach(apt => {
              console.log(`   預約 ${apt.id}: ${apt.date} ${apt.time}, isNewPatient: ${apt.isNewPatient}`);
            });
          }
          
          console.log('\n✅ 生產環境資料庫結構正確，無需修復');
          db.close();
          resolve('正常');
        });
      } else {
        console.log('\n⚠️ isNewPatient 欄位不存在，需要添加');
        
        // 4. 添加 isNewPatient 欄位
        const addColumnSQL = `
          ALTER TABLE appointments 
          ADD COLUMN isNewPatient BOOLEAN DEFAULT FALSE
        `;
        
        console.log('\n2️⃣ 添加 isNewPatient 欄位...');
        db.run(addColumnSQL, [], function(err) {
          if (err) {
            console.error('❌ 添加欄位失敗:', err.message);
            db.close();
            reject(err);
            return;
          }
          
          console.log('✅ 成功添加 isNewPatient 欄位');
          
          // 5. 驗證欄位添加成功
          console.log('\n3️⃣ 驗證欄位添加...');
          db.all("PRAGMA table_info(appointments)", [], (err, newColumns) => {
            if (err) {
              console.error('❌ 驗證失敗:', err.message);
              db.close();
              reject(err);
              return;
            }
            
            const nowHasIsNewPatient = newColumns.some(col => col.name === 'isNewPatient');
            if (nowHasIsNewPatient) {
              console.log('✅ 欄位添加驗證成功');
              
              // 6. 更新現有記錄的 isNewPatient 值（預設為 false）
              console.log('\n4️⃣ 初始化現有記錄的 isNewPatient 值...');
              db.run("UPDATE appointments SET isNewPatient = FALSE WHERE isNewPatient IS NULL", [], function(err) {
                if (err) {
                  console.error('❌ 初始化記錄失敗:', err.message);
                } else {
                  console.log(`✅ 初始化 ${this.changes} 筆記錄的 isNewPatient 值`);
                }
                
                console.log('\n🎉 生產環境資料庫修復完成！');
                console.log('\n📋 修復後的表結構:');
                newColumns.forEach(col => {
                  console.log(`   - ${col.name} (${col.type})`);
                });
                
                db.close();
                resolve('已修復');
              });
            } else {
              console.error('❌ 欄位添加失敗');
              db.close();
              reject(new Error('欄位添加失敗'));
            }
          });
        });
      }
    });
  });
}

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