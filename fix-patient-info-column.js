const sqlite3 = require('sqlite3').verbose();

// 修復數據庫 - 添加 patient_info 欄位
const dbPath = 'C:\\Users\\emily\\Downloads\\database.sqlite';

console.log('🔧 === 修復數據庫：添加 patient_info 欄位 ===');
console.log('數據庫路徑:', dbPath);

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('❌ 無法打開數據庫:', err.message);
    process.exit(1);
  }
  console.log('✅ 成功連接到數據庫');
  fixDatabase();
});

async function fixDatabase() {
  try {
    // 1. 檢查當前 appointments 表結構
    console.log('\n🔍 檢查當前 appointments 表結構...');
    const columns = await query("PRAGMA table_info(appointments)");
    
    console.log('當前欄位:');
    columns.forEach(col => {
      console.log(`  - ${col.name} (${col.type})`);
    });
    
    // 2. 檢查是否已有 patient_info 欄位
    const hasPatientInfo = columns.find(col => col.name === 'patient_info');
    
    if (hasPatientInfo) {
      console.log('✅ patient_info 欄位已存在，無需添加');
    } else {
      console.log('⚠️  缺少 patient_info 欄位，正在添加...');
      
      // 3. 添加 patient_info 欄位
      await runQuery('ALTER TABLE appointments ADD COLUMN patient_info TEXT');
      console.log('✅ 成功添加 patient_info 欄位');
    }
    
    // 4. 驗證修復結果
    console.log('\n🔍 驗證修復結果...');
    const newColumns = await query("PRAGMA table_info(appointments)");
    
    console.log('修復後的欄位:');
    newColumns.forEach(col => {
      console.log(`  - ${col.name} (${col.type})`);
    });
    
    // 5. 檢查數據完整性
    console.log('\n📊 檢查數據完整性...');
    const appointmentCount = await query('SELECT COUNT(*) as count FROM appointments');
    console.log(`總預約記錄: ${appointmentCount[0].count} 筆`);
    
    const userCount = await query('SELECT COUNT(*) as count FROM users');
    console.log(`總用戶數: ${userCount[0].count} 人`);
    
    const doctorInfo = await query("SELECT email, name FROM users WHERE role = 'doctor'");
    console.log('醫生信息:');
    doctorInfo.forEach(doc => {
      console.log(`  - ${doc.name} (${doc.email})`);
    });
    
    console.log('\n🎉 數據庫修復完成！');
    console.log('✅ 現在可以重新上傳這個數據庫到 Zeabur');
    
  } catch (error) {
    console.error('❌ 修復過程中出錯:', error.message);
  } finally {
    db.close();
    console.log('\n💾 數據庫連接已關閉');
  }
}

function query(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

function runQuery(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function(err) {
      if (err) reject(err);
      else resolve({ changes: this.changes, lastID: this.lastID });
    });
  });
}

// 執行修復
fixDatabase(); 