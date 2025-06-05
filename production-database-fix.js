#!/usr/bin/env node

/**
 * 生產環境資料庫修復工具
 * 專門處理 isNewPatient 欄位問題
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const DB_PATH = path.join(__dirname, 'database.sqlite');

console.log('🚀 生產環境資料庫修復工具啟動...\n');
console.log('資料庫路徑:', DB_PATH);

// 1. 創建資料庫連接並檢查
const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) {
    console.error('❌ 資料庫連接失敗:', err.message);
    process.exit(1);
  }
  console.log('✅ 成功連接到資料庫\n');
  
  // 開始診斷和修復流程
  startDiagnosisAndFix();
});

function startDiagnosisAndFix() {
  console.log('🔍 開始診斷資料庫結構...\n');
  
  // 檢查 appointments 表結構
  db.all("PRAGMA table_info(appointments)", [], (err, columns) => {
    if (err) {
      console.error('❌ 無法獲取 appointments 表結構:', err.message);
      db.close();
      process.exit(1);
    }
    
    console.log('📋 appointments 表當前結構:');
    columns.forEach((col, index) => {
      console.log(`   ${index + 1}. ${col.name} (${col.type}) ${col.notnull ? 'NOT NULL' : ''} ${col.dflt_value ? `DEFAULT ${col.dflt_value}` : ''}`);
    });
    
    // 檢查 isNewPatient 欄位
    const hasIsNewPatient = columns.some(col => col.name === 'isNewPatient');
    console.log(`\n🔍 isNewPatient 欄位檢查: ${hasIsNewPatient ? '✅ 存在' : '❌ 不存在'}\n`);
    
    if (hasIsNewPatient) {
      console.log('✅ isNewPatient 欄位已存在，進行功能測試...\n');
      testIsNewPatientFunctionality();
    } else {
      console.log('⚠️ isNewPatient 欄位不存在，開始添加...\n');
      addIsNewPatientColumn();
    }
  });
}

function addIsNewPatientColumn() {
  const addColumnSQL = `ALTER TABLE appointments ADD COLUMN isNewPatient BOOLEAN DEFAULT FALSE`;
  
  console.log('🔧 執行 SQL:', addColumnSQL);
  
  db.run(addColumnSQL, [], function(err) {
    if (err) {
      console.error('❌ 添加 isNewPatient 欄位失敗:', err.message);
      
      // 嘗試檢查是否因為欄位已存在而失敗
      if (err.message.includes('duplicate column name')) {
        console.log('ℹ️ 欄位可能已存在，重新檢查...');
        startDiagnosisAndFix();
        return;
      }
      
      db.close();
      process.exit(1);
    }
    
    console.log('✅ 成功添加 isNewPatient 欄位');
    
    // 初始化現有記錄
    console.log('\n🔄 初始化現有記錄的 isNewPatient 值...');
    db.run("UPDATE appointments SET isNewPatient = FALSE WHERE isNewPatient IS NULL", [], function(err) {
      if (err) {
        console.error('❌ 初始化記錄失敗:', err.message);
      } else {
        console.log(`✅ 成功初始化 ${this.changes} 筆記錄`);
      }
      
      // 再次檢查結構
      console.log('\n🔍 驗證修復結果...');
      startDiagnosisAndFix();
    });
  });
}

function testIsNewPatientFunctionality() {
  console.log('🧪 測試 isNewPatient 功能...\n');
  
  // 1. 測試讀取現有記錄
  db.all("SELECT id, date, time, isNewPatient FROM appointments LIMIT 3", [], (err, appointments) => {
    if (err) {
      console.error('❌ 讀取預約記錄失敗:', err.message);
    } else {
      console.log('📊 現有預約記錄樣本:');
      appointments.forEach(apt => {
        console.log(`   預約 ${apt.id}: ${apt.date} ${apt.time}, isNewPatient: ${apt.isNewPatient} (type: ${typeof apt.isNewPatient})`);
      });
    }
    
    // 2. 測試插入記錄
    console.log('\n🧪 測試插入 isNewPatient 記錄...');
    const testInsertSQL = `
      INSERT INTO appointments (
        doctor_id, patient_id, date, time, notes, status, isNewPatient, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
    `;
    
    const testParams = [4, 3, '2025-12-31', '23:59', '測試記錄-請忽略', 'confirmed', true];
    console.log('🔧 執行測試插入 SQL:', testInsertSQL);
    console.log('📋 測試參數:', testParams);
    
    db.run(testInsertSQL, testParams, function(err) {
      if (err) {
        console.error('❌ 測試插入失敗:', err.message);
        
        if (err.message.includes('no column named isNewPatient')) {
          console.log('\n🚨 確認問題：isNewPatient 欄位在 SQL 執行時不存在！');
          console.log('這可能是快取或同步問題，嘗試強制重新檢查...\n');
          
          // 強制關閉資料庫連接並重新打開
          db.close((closeErr) => {
            if (closeErr) console.error('關閉資料庫連接錯誤:', closeErr);
            
            setTimeout(() => {
              console.log('🔄 重新連接資料庫...');
              const newDb = new sqlite3.Database(DB_PATH, (err) => {
                if (err) {
                  console.error('❌ 重新連接失敗:', err.message);
                  process.exit(1);
                }
                console.log('✅ 重新連接成功，再次檢查結構...\n');
                
                // 使用新連接重新檢查
                newDb.all("PRAGMA table_info(appointments)", [], (err, columns) => {
                  if (err) {
                    console.error('❌ 重新檢查失敗:', err.message);
                    newDb.close();
                    process.exit(1);
                  }
                  
                  console.log('📋 重新連接後的表結構:');
                  columns.forEach((col, index) => {
                    console.log(`   ${index + 1}. ${col.name} (${col.type})`);
                  });
                  
                  const hasIsNewPatient = columns.some(col => col.name === 'isNewPatient');
                  console.log(`\n結果: isNewPatient 欄位 ${hasIsNewPatient ? '✅ 存在' : '❌ 仍然不存在'}`);
                  
                  if (!hasIsNewPatient) {
                    console.log('\n🔄 重新添加欄位...');
                    // 使用新連接重新添加欄位
                    newDb.run(`ALTER TABLE appointments ADD COLUMN isNewPatient BOOLEAN DEFAULT FALSE`, [], function(addErr) {
                      if (addErr) {
                        console.error('❌ 重新添加失敗:', addErr.message);
                      } else {
                        console.log('✅ 重新添加成功');
                      }
                      newDb.close();
                      console.log('\n🎉 修復完成，請重新啟動服務器');
                    });
                  } else {
                    newDb.close();
                    console.log('\n✅ 欄位存在，修復完成');
                  }
                });
              });
            }, 1000);
          });
          return;
        }
        
        db.close();
        process.exit(1);
      } else {
        console.log('✅ 測試插入成功，記錄 ID:', this.lastID);
        
        // 清理測試記錄
        db.run("DELETE FROM appointments WHERE id = ?", [this.lastID], (deleteErr) => {
          if (deleteErr) {
            console.log('⚠️ 清理測試記錄失敗:', deleteErr.message);
          } else {
            console.log('✅ 已清理測試記錄');
          }
          
          console.log('\n🎉 所有測試通過！isNewPatient 功能正常運作');
          console.log('✅ 資料庫修復完成\n');
          
          db.close();
        });
      }
    });
  });
}

// 處理程序結束事件
process.on('SIGINT', () => {
  console.log('\n🛑 收到中斷信號，關閉資料庫連接...');
  db.close((err) => {
    if (err) console.error('關閉資料庫連接錯誤:', err.message);
    console.log('👋 程序結束');
    process.exit(0);
  });
});

process.on('uncaughtException', (err) => {
  console.error('❌ 未捕獲的異常:', err);
  db.close();
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ 未處理的 Promise 拒絕:', reason);
  db.close();
  process.exit(1);
}); 