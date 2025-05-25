const sqlite3 = require('sqlite3').verbose();

const dbPath = 'C:\\Users\\emily\\Downloads\\database.sqlite';

console.log('🔧 修復數據庫：添加 patient_info 欄位');

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('❌ 數據庫連接失敗:', err.message);
    process.exit(1);
  }
  
  console.log('✅ 數據庫連接成功');
  
  // 檢查表結構
  db.all("PRAGMA table_info(appointments)", (err, columns) => {
    if (err) {
      console.error('❌ 檢查表結構失敗:', err.message);
      db.close();
      return;
    }
    
    console.log('\n當前 appointments 表欄位:');
    columns.forEach(col => {
      console.log(`  - ${col.name} (${col.type})`);
    });
    
    // 檢查是否有 patient_info 欄位
    const hasPatientInfo = columns.find(col => col.name === 'patient_info');
    
    if (hasPatientInfo) {
      console.log('\n✅ patient_info 欄位已存在');
      db.close();
    } else {
      console.log('\n⚠️  缺少 patient_info 欄位，正在添加...');
      
      // 添加欄位
      db.run('ALTER TABLE appointments ADD COLUMN patient_info TEXT', (err) => {
        if (err) {
          console.error('❌ 添加欄位失敗:', err.message);
        } else {
          console.log('✅ 成功添加 patient_info 欄位');
        }
        
        // 驗證結果
        db.all("PRAGMA table_info(appointments)", (err, newColumns) => {
          if (err) {
            console.error('❌ 驗證失敗:', err.message);
          } else {
            console.log('\n修復後的欄位:');
            newColumns.forEach(col => {
              console.log(`  - ${col.name} (${col.type})`);
            });
            
            // 檢查數據
            db.get('SELECT COUNT(*) as count FROM appointments', (err, result) => {
              if (err) {
                console.error('❌ 檢查數據失敗:', err.message);
              } else {
                console.log(`\n📊 總預約記錄: ${result.count} 筆`);
              }
              
              console.log('\n🎉 修復完成！');
              db.close();
            });
          }
        });
      });
    }
  });
}); 