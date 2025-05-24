const sqlite3 = require('sqlite3').verbose();

const db = new sqlite3.Database('./database.sqlite');

console.log('=== 檢查所有用戶帳號 ===\n');

db.all('SELECT id, email, name, role, password FROM users', [], (err, users) => {
  if (err) {
    console.error('錯誤:', err);
  } else {
    users.forEach(user => {
      console.log(`用戶 ${user.id}:`);
      console.log(`  Email: ${user.email}`);
      console.log(`  Name: ${user.name}`);
      console.log(`  Role: ${user.role}`);
      console.log(`  Password Hash: ${user.password.substring(0, 20)}...`);
      console.log('');
    });
    
    console.log('=== 測試患者登入 ===');
    const bcrypt = require('bcrypt');
    const testPassword = 'password123';
    
    // 找到患者用戶
    const patient = users.find(u => u.email === 'wang.xiaoming@example.com');
    if (patient) {
      bcrypt.compare(testPassword, patient.password, (err, result) => {
        if (err) {
          console.error('密碼比較錯誤:', err);
        } else {
          console.log(`患者 ${patient.email} 密碼驗證:`, result ? '✅ 成功' : '❌ 失敗');
        }
        db.close();
      });
    } else {
      console.log('❌ 未找到患者帳號');
      db.close();
    }
  }
}); 