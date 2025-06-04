const sqlite3 = require('sqlite3').verbose();

const db = new sqlite3.Database('database.sqlite');

console.log('檢查 appointments 表結構...\n');

db.all("PRAGMA table_info(appointments)", [], (err, columns) => {
  if (err) {
    console.error('錯誤:', err.message);
    return;
  }
  
  console.log('欄位列表:');
  columns.forEach(col => {
    console.log(`- ${col.name} (${col.type})`);
  });
  
  const hasIsNewPatient = columns.some(col => col.name === 'isNewPatient');
  console.log(`\nisNewPatient 欄位: ${hasIsNewPatient ? '✅ 存在' : '❌ 不存在'}`);
  
  db.close();
}); 