#!/usr/bin/env node

/**
 * 🚑 生產環境緊急修復腳本
 * 
 * 問題：SQLITE_ERROR: table appointments has no column named isNewPatient
 * 原因：生產環境資料庫與本地環境結構不同步
 * 解決：添加缺失的欄位，確保向後相容
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

// 獲取正確的生產環境資料庫路徑
function getDatabasePath() {
  // 檢查常見的生產環境資料庫路徑
  const possiblePaths = [
    process.env.DATABASE_URL,
    process.env.DB_PATH,
    '/app/database.sqlite',
    './database.sqlite',
    path.join(__dirname, 'database.sqlite'),
    '/data/database.sqlite',
    '/tmp/database.sqlite'
  ];

  for (const dbPath of possiblePaths) {
    if (dbPath && fs.existsSync(dbPath)) {
      return dbPath;
    }
  }

  // 如果找不到現有資料庫，使用預設路徑
  return path.join(__dirname, 'database.sqlite');
}

const dbPath = getDatabasePath();

console.log('🚑 生產環境緊急修復啟動');
console.log('================================');
console.log(`📍 資料庫路徑: ${dbPath}`);
console.log(`📂 資料庫存在: ${fs.existsSync(dbPath) ? '✅' : '❌'}`);

if (!fs.existsSync(dbPath)) {
  console.error('❌ 資料庫文件不存在，無法修復');
  process.exit(1);
}

const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READWRITE, (err) => {
  if (err) {
    console.error('❌ 無法連接資料庫:', err.message);
    
    // 如果無法以讀寫模式打開，嘗試只讀模式檢查
    console.log('🔍 嘗試以只讀模式檢查...');
    const readOnlyDb = new sqlite3.Database(dbPath, sqlite3.OPEN_READONLY, (readErr) => {
      if (readErr) {
        console.error('❌ 連只讀模式都無法打開:', readErr.message);
        process.exit(1);
      }
      console.log('⚠️ 資料庫只能以只讀模式打開，請檢查文件權限');
      readOnlyDb.close();
      process.exit(1);
    });
    return;
  }
  
  console.log('✅ 資料庫連接成功');
  startRepair();
});

function startRepair() {
  console.log('\n🔍 步驟 1: 檢查現有表結構');
  
  // 檢查 appointments 表是否存在
  db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='appointments'", (err, table) => {
    if (err) {
      console.error('❌ 檢查表存在性失敗:', err.message);
      db.close();
      return;
    }
    
    if (!table) {
      console.error('❌ appointments 表不存在！這是嚴重問題');
      console.log('💡 建議：需要完整重建資料庫結構');
      db.close();
      return;
    }
    
    console.log('✅ appointments 表存在');
    checkColumns();
  });
}

function checkColumns() {
  console.log('\n🔍 步驟 2: 檢查欄位結構');
  
  db.all("PRAGMA table_info(appointments)", (err, columns) => {
    if (err) {
      console.error('❌ 檢查欄位失敗:', err.message);
      db.close();
      return;
    }
    
    console.log('\n📋 當前 appointments 表結構:');
    console.log('─'.repeat(60));
    console.log('| 序號 | 欄位名稱       | 類型     | 必填 |');
    console.log('─'.repeat(60));
    
    columns.forEach((col, index) => {
      const seq = (index + 1).toString().padEnd(4);
      const name = col.name.padEnd(15);
      const type = col.type.padEnd(8);
      const notnull = col.notnull ? '是' : '否';
      console.log(`| ${seq} | ${name} | ${type} | ${notnull}  |`);
    });
    console.log('─'.repeat(60));
    
    const existingColumns = columns.map(col => col.name);
    const hasIsNewPatient = existingColumns.includes('isNewPatient');
    const hasPatientInfo = existingColumns.includes('patient_info');
    
    console.log('\n🔍 關鍵欄位檢查:');
    console.log(`  📊 總欄位數: ${columns.length}`);
    console.log(`  🆔 isNewPatient: ${hasIsNewPatient ? '✅ 存在' : '❌ 缺失'}`);
    console.log(`  📝 patient_info: ${hasPatientInfo ? '✅ 存在' : '❌ 缺失'}`);
    
    const missingColumns = [];
    if (!hasIsNewPatient) missingColumns.push('isNewPatient');
    if (!hasPatientInfo) missingColumns.push('patient_info');
    
    if (missingColumns.length === 0) {
      console.log('\n🎉 表結構正常！所有必要欄位都存在');
      console.log('💡 如果仍有錯誤，可能需要：');
      console.log('   1. 重啟應用服務');
      console.log('   2. 檢查應用是否連接到正確的資料庫');
      console.log('   3. 驗證環境變數設定');
      testConnection();
      return;
    }
    
    console.log(`\n🚨 發現缺失欄位: ${missingColumns.join(', ')}`);
    repairColumns(missingColumns);
  });
}

function repairColumns(missingColumns) {
  console.log('\n🔧 步驟 3: 修復欄位結構');
  
  let completed = 0;
  const total = missingColumns.length;
  let hasError = false;
  
  missingColumns.forEach((column, index) => {
    console.log(`\n  [${index + 1}/${total}] 修復 ${column} 欄位...`);
    
    let sql = '';
    if (column === 'isNewPatient') {
      sql = 'ALTER TABLE appointments ADD COLUMN isNewPatient BOOLEAN DEFAULT FALSE';
    } else if (column === 'patient_info') {
      sql = 'ALTER TABLE appointments ADD COLUMN patient_info TEXT';
    }
    
    console.log(`    📝 SQL: ${sql}`);
    
    db.run(sql, (err) => {
      if (err) {
        console.error(`    ❌ 失敗: ${err.message}`);
        hasError = true;
      } else {
        console.log(`    ✅ 成功添加 ${column} 欄位`);
      }
      
      completed++;
      
      if (completed === total) {
        if (hasError) {
          console.log('\n⚠️ 修復完成，但有部分錯誤');
          console.log('💡 建議手動檢查資料庫狀態');
        } else {
          console.log('\n🎉 所有欄位修復成功！');
        }
        verifyRepair();
      }
    });
  });
}

function verifyRepair() {
  console.log('\n🔍 步驟 4: 驗證修復結果');
  
  db.all("PRAGMA table_info(appointments)", (err, columns) => {
    if (err) {
      console.error('❌ 驗證失敗:', err.message);
      db.close();
      return;
    }
    
    const existingColumns = columns.map(col => col.name);
    const hasIsNewPatient = existingColumns.includes('isNewPatient');
    const hasPatientInfo = existingColumns.includes('patient_info');
    
    console.log('\n📊 修復後的欄位檢查:');
    console.log(`  🆔 isNewPatient: ${hasIsNewPatient ? '✅' : '❌'}`);
    console.log(`  📝 patient_info: ${hasPatientInfo ? '✅' : '❌'}`);
    console.log(`  📊 總欄位數: ${columns.length}`);
    
    if (hasIsNewPatient && hasPatientInfo) {
      console.log('\n🎯 所有欄位修復成功！');
      testConnection();
    } else {
      console.log('\n⚠️ 修復不完整，請手動檢查');
      db.close();
    }
  });
}

function testConnection() {
  console.log('\n🧪 步驟 5: 測試預約創建功能');
  
  // 獲取一些測試用的用戶ID
  db.get("SELECT id FROM users WHERE role = 'doctor' LIMIT 1", (err, doctor) => {
    if (err || !doctor) {
      console.log('⚠️ 無法找到醫生進行測試，跳過功能測試');
      db.close();
      return;
    }
    
    db.get("SELECT id FROM users WHERE role = 'patient' LIMIT 1", (err, patient) => {
      if (err || !patient) {
        console.log('⚠️ 無法找到患者進行測試，跳過功能測試');
        db.close();
        return;
      }
      
      // 嘗試創建測試預約
      const testSQL = `
        INSERT INTO appointments (
          doctor_id, patient_id, date, time, notes, status, patient_info, isNewPatient, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
      `;
      
      const testParams = [
        doctor.id,
        patient.id,
        '2025-12-25',
        '09:00',
        '修復測試預約',
        'confirmed',
        '{"name":"測試患者","phone":"12345678"}',
        true
      ];
      
      console.log('  📝 執行測試 SQL...');
      
      db.run(testSQL, testParams, function(err) {
        if (err) {
          console.error('  ❌ 測試失敗:', err.message);
          console.log('  💡 雖然欄位存在，但可能還有其他問題');
        } else {
          console.log('  ✅ 測試成功！預約創建功能正常');
          console.log(`  📝 測試記錄 ID: ${this.lastID}`);
          
          // 清理測試記錄
          db.run('DELETE FROM appointments WHERE id = ?', [this.lastID], (delErr) => {
            if (delErr) {
              console.log('  ⚠️ 測試記錄清理失敗，請手動刪除 ID:', this.lastID);
            } else {
              console.log('  🧹 測試記錄已清理');
            }
          });
        }
        
        finishRepair();
      });
    });
  });
}

function finishRepair() {
  console.log('\n🏁 修復完成！');
  console.log('=======================================');
  console.log('✅ 資料庫結構修復完成');
  console.log('💡 建議接下來的步驟：');
  console.log('   1. 重啟應用服務');
  console.log('   2. 清除瀏覽器快取');
  console.log('   3. 測試前端預約功能');
  console.log('   4. 檢查生產環境日誌');
  console.log('=======================================');
  
  db.close((err) => {
    if (err) {
      console.error('關閉資料庫時出錯:', err.message);
    } else {
      console.log('📖 資料庫已安全關閉');
    }
  });
}

// 處理意外錯誤
process.on('uncaughtException', (err) => {
  console.error('\n💥 發生未處理的錯誤:', err.message);
  console.error('📍 錯誤堆疊:', err.stack);
  if (db) {
    db.close();
  }
  process.exit(1);
});

process.on('SIGINT', () => {
  console.log('\n👋 收到中斷信號，正在安全關閉...');
  if (db) {
    db.close();
  }
  process.exit(0);
}); 