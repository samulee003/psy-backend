const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./database.sqlite');

db.all('SELECT * FROM users', [], (err, users) => {
  if (err) {
    console.error(err);
  } else {
    console.log('所有用戶:');
    users.forEach(u => {
      console.log(`${u.role}: ${u.email} (${u.name}) - ID: ${u.id}`);
    });
  }
  db.close();
}); 