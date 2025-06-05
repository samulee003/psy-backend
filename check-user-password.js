const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');

const db = new sqlite3.Database('database.sqlite');

console.log('🔍 檢查用戶資料和密碼');
console.log('======================\n');

// 查詢目標用戶
db.get('SELECT id, name, email, password FROM users WHERE email = ?', ['samu003@gmail.com'], async (err, user) => {
  if (err) {
    console.error('❌ 查詢失敗:', err.message);
    db.close();
    return;
  }

  if (!user) {
    console.log('❌ 用戶不存在: samu003@gmail.com');
    db.close();
    return;
  }

  console.log('✅ 找到用戶:');
  console.log(`  ID: ${user.id}`);
  console.log(`  姓名: ${user.name}`);
  console.log(`  郵箱: ${user.email}`);
  console.log(`  密碼雜湊: ${user.password.substring(0, 30)}...`);

  // 測試常見密碼
  const testPasswords = ['password123', 'test123', '123456', 'admin', 'password', user.email.split('@')[0]];
  
  console.log('\n🔐 測試常見密碼:');
  
  for (const testPassword of testPasswords) {
    try {
      const isMatch = await bcrypt.compare(testPassword, user.password);
      console.log(`  ${testPassword}: ${isMatch ? '✅ 匹配' : '❌ 不匹配'}`);
      
      if (isMatch) {
        console.log(`\n🎉 找到正確密碼: "${testPassword}"`);
        break;
      }
    } catch (e) {
      console.log(`  ${testPassword}: ❌ 比對錯誤`);
    }
  }

  db.close();
}); 