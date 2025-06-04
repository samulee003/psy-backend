const sqlite3 = require('sqlite3').verbose();

console.log('=== 添加 isNewPatient 欄位到 appointments 表 ===\n');

const db = new sqlite3.Database('database.sqlite', (err) => {
  if (err) {
    console.error('連接資料庫失敗:', err.message);
    return;
  }
  console.log('✅ 成功連接到資料庫');
});

// 檢查欄位是否已存在
db.all("PRAGMA table_info(appointments)", [], (err, columns) => {
  if (err) {
    console.error('查詢表結構失敗:', err.message);
    db.close();
    return;
  }
  
  const hasIsNewPatient = columns.some(col => col.name === 'isNewPatient');
  
  if (hasIsNewPatient) {
    console.log('✅ isNewPatient 欄位已存在，無需添加');
    db.close();
    return;
  }
  
  console.log('📋 準備添加 isNewPatient 欄位...');
  
  // 添加 isNewPatient 欄位
  db.run("ALTER TABLE appointments ADD COLUMN isNewPatient BOOLEAN DEFAULT FALSE", function(err) {
    if (err) {
      console.error('❌ 添加 isNewPatient 欄位失敗:', err.message);
      db.close();
      return;
    }
    
    console.log('✅ 成功添加 isNewPatient 欄位');
    
    // 驗證欄位已添加
    db.all("PRAGMA table_info(appointments)", [], (err, updatedColumns) => {
      if (err) {
        console.error('驗證表結構失敗:', err.message);
        db.close();
        return;
      }
      
      const newField = updatedColumns.find(col => col.name === 'isNewPatient');
      if (newField) {
        console.log('✅ 驗證成功，isNewPatient 欄位已添加');
        console.log(`   類型: ${newField.type}`);
        console.log(`   預設值: ${newField.dflt_value}`);
        console.log(`   是否必填: ${newField.notnull ? '是' : '否'}`);
      }
      
      // 查看更新後的表結構
      console.log('\n📋 更新後的 appointments 表結構:');
      console.log('─'.repeat(80));
      console.log('| cid | name           | type    | notnull | dflt_value | pk |');
      console.log('─'.repeat(80));
      
      updatedColumns.forEach(col => {
        const cid = col.cid.toString().padEnd(3);
        const name = col.name.padEnd(15);
        const type = col.type.padEnd(8);
        const notnull = col.notnull.toString().padEnd(7);
        const dflt = (col.dflt_value || '').toString().padEnd(10);
        const pk = col.pk.toString().padEnd(2);
        
        console.log(`| ${cid} | ${name} | ${type} | ${notnull} | ${dflt} | ${pk} |`);
      });
      console.log('─'.repeat(80));
      
      console.log('\n🎉 資料庫遷移完成！');
      
      db.close((err) => {
        if (err) {
          console.error('關閉資料庫失敗:', err.message);
        } else {
          console.log('✅ 資料庫已關閉');
        }
      });
    });
  });
}); 