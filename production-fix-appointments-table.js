/**
 * 生產環境緊急修復腳本
 * 專門用於修復 appointments 表缺少 isNewPatient 和 patient_info 欄位的問題
 * 
 * 使用方法：
 * 1. 在 Zeabur 控制台執行此腳本
 * 2. 或者通過 SSH 連接執行
 * 3. 或者臨時修改 zeabur.config.json 來執行
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// 生產環境資料庫路徑
const dbPath = process.env.DB_PATH || '/data/database.sqlite';
console.log('🔧 生產環境修復腳本啟動');
console.log('📁 資料庫路徑:', dbPath);

// 連接資料庫
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('❌ 無法連接資料庫:', err.message);
    process.exit(1);
  }
  console.log('✅ 成功連接資料庫');
});

async function main() {
  try {
    console.log('\n🔍 檢查 appointments 表結構...');
    
    // 獲取表結構
    const columns = await new Promise((resolve, reject) => {
      db.all("PRAGMA table_info(appointments)", (err, cols) => {
        if (err) reject(err);
        else resolve(cols);
      });
    });
    
    if (!columns || columns.length === 0) {
      console.error('❌ appointments 表不存在！');
      process.exit(1);
    }
    
    console.log('📊 當前欄位:', columns.map(c => c.name).join(', '));
    
    // 檢查是否缺少欄位
    const hasIsNewPatient = columns.some(col => col.name === 'isNewPatient');
    const hasPatientInfo = columns.some(col => col.name === 'patient_info');
    
    console.log(`\n檢查結果:`);
    console.log(`  isNewPatient: ${hasIsNewPatient ? '✅ 存在' : '❌ 缺失'}`);
    console.log(`  patient_info: ${hasPatientInfo ? '✅ 存在' : '❌ 缺失'}`);
    
    let fixed = false;
    
    // 添加 isNewPatient 欄位
    if (!hasIsNewPatient) {
      console.log('\n🔧 添加 isNewPatient 欄位...');
      await new Promise((resolve, reject) => {
        db.run("ALTER TABLE appointments ADD COLUMN isNewPatient BOOLEAN DEFAULT FALSE", (err) => {
          if (err) reject(err);
          else resolve();
        });
      });
      console.log('✅ isNewPatient 欄位添加成功');
      fixed = true;
    }
    
    // 添加 patient_info 欄位
    if (!hasPatientInfo) {
      console.log('\n🔧 添加 patient_info 欄位...');
      await new Promise((resolve, reject) => {
        db.run("ALTER TABLE appointments ADD COLUMN patient_info TEXT", (err) => {
          if (err) reject(err);
          else resolve();
        });
      });
      console.log('✅ patient_info 欄位添加成功');
      fixed = true;
    }
    
    if (fixed) {
      // 驗證修復
      console.log('\n🔍 驗證修復結果...');
      const updatedColumns = await new Promise((resolve, reject) => {
        db.all("PRAGMA table_info(appointments)", (err, cols) => {
          if (err) reject(err);
          else resolve(cols);
        });
      });
      
      console.log('📊 修復後的欄位:', updatedColumns.map(c => c.name).join(', '));
      
      // 測試插入
      console.log('\n🧪 測試插入功能...');
      const testSql = `
        INSERT INTO appointments (
          doctor_id, patient_id, date, time, notes, status, patient_info, isNewPatient, created_at
        ) VALUES (1, 1, '2099-12-31', '23:59', 'test', 'cancelled', '{"test":true}', true, datetime('now'))
      `;
      
      await new Promise((resolve, reject) => {
        db.run(testSql, function(err) {
          if (err) reject(err);
          else resolve(this.lastID);
        });
      });
      
      console.log('✅ 測試插入成功！');
      
      // 清理測試資料
      await new Promise((resolve, reject) => {
        db.run("DELETE FROM appointments WHERE date = '2099-12-31'", (err) => {
          if (err) reject(err);
          else resolve();
        });
      });
      
      console.log('\n🎉 修復完成！appointments 表現在可以正常使用了。');
    } else {
      console.log('\n✅ appointments 表結構正常，無需修復。');
    }
    
    // 顯示一些統計資訊
    const stats = await new Promise((resolve, reject) => {
      db.get("SELECT COUNT(*) as count FROM appointments", (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
    
    console.log(`\n📊 統計資訊:`);
    console.log(`  總預約數: ${stats.count}`);
    
  } catch (error) {
    console.error('\n💥 修復失敗:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    db.close((err) => {
      if (err) {
        console.error('關閉資料庫時出錯:', err.message);
      } else {
        console.log('\n📁 資料庫連接已關閉');
      }
    });
  }
}

// 執行修復
main(); 