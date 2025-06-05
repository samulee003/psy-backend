const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// 模擬與應用相同的資料庫路徑邏輯
const dbPath = process.env.DB_PATH || path.join(__dirname, 'database.sqlite');

console.log('🔍 診斷資料庫問題...');
console.log('📍 資料庫路徑:', dbPath);

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('❌ 連接資料庫失敗:', err.message);
    process.exit(1);
  }
  console.log('✅ 成功連接到資料庫');
});

// 1. 檢查表結構
console.log('\n1️⃣ 檢查 appointments 表結構...');
db.all("PRAGMA table_info(appointments)", (err, columns) => {
  if (err) {
    console.error('❌ 檢查表結構失敗:', err.message);
    return;
  }
  
  console.log('📋 當前欄位:');
  columns.forEach(col => {
    console.log(`  - ${col.name} (${col.type}) ${col.notnull ? 'NOT NULL' : ''} ${col.dflt_value ? 'DEFAULT ' + col.dflt_value : ''}`);
  });
  
  const hasIsNewPatient = columns.some(col => col.name === 'isNewPatient');
  const hasPatientInfo = columns.some(col => col.name === 'patient_info');
  
  console.log('\n🔍 關鍵欄位檢查:');
  console.log(`  - isNewPatient: ${hasIsNewPatient ? '✅ 存在' : '❌ 不存在'}`);
  console.log(`  - patient_info: ${hasPatientInfo ? '✅ 存在' : '❌ 不存在'}`);
  
  // 2. 測試創建預約的 SQL
  console.log('\n2️⃣ 測試創建預約的 SQL...');
  const testSQL = `
    INSERT INTO appointments (
      doctor_id, patient_id, date, time, notes, status, patient_info, isNewPatient, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
  `;
  const testParams = [4, 3, '2025-07-02', '14:00', '測試預約', 'confirmed', '{"name":"測試患者","phone":"12345678"}', true];
  
  console.log('🧪 執行 SQL:', testSQL.replace(/\s+/g, ' ').trim());
  console.log('📝 參數:', testParams);
  
  db.run(testSQL, testParams, function(err) {
    if (err) {
      console.error('❌ 測試失敗:', err.message);
    } else {
      console.log('✅ 測試成功！插入記錄 ID:', this.lastID);
      
      // 清理測試記錄
      db.run('DELETE FROM appointments WHERE id = ?', [this.lastID], () => {
        console.log('🧹 測試記錄已清理');
        
        // 3. 檢查應用是否存在多個資料庫檔案
        console.log('\n3️⃣ 檢查可能的資料庫檔案...');
        const fs = require('fs');
        const searchPaths = [
          path.join(__dirname, 'database.sqlite'),
          path.join(__dirname, '..', 'database.sqlite'),
          path.join(__dirname, 'config', 'database.sqlite'),
          path.join(__dirname, 'data', 'database.sqlite')
        ];
        
        searchPaths.forEach(searchPath => {
          try {
            if (fs.existsSync(searchPath)) {
              const stats = fs.statSync(searchPath);
              console.log(`📂 找到: ${searchPath} (大小: ${stats.size} bytes, 修改時間: ${stats.mtime})`);
            }
          } catch (e) {
            // 忽略錯誤
          }
        });
        
        console.log('\n🎯 診斷完成');
        db.close();
      });
    }
  });
}); 