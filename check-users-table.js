const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./database.sqlite');

console.log('=== 檢查 users 表結構 ===');
db.all('PRAGMA table_info(users)', [], (err, rows) => {
  if (err) {
    console.error(err);
  } else {
    console.log('Users 表結構:');
    rows.forEach(row => {
      console.log(`- ${row.name}: ${row.type}${row.notnull ? ' NOT NULL' : ''}${row.dflt_value ? ' DEFAULT ' + row.dflt_value : ''}`);
    });
  }
  db.close();
}); 