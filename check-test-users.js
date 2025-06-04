const sqlite3 = require('sqlite3').verbose();

console.log('=== 檢查測試用戶 ===\n');

const db = new sqlite3.Database('database.sqlite');

// 查詢所有用戶
db.all('SELECT id, name, email, role FROM users ORDER BY id', [], (err, users) => {
  if (err) {
    console.error('查詢用戶失敗:', err.message);
    return;
  }
  
  console.log(`找到 ${users.length} 個用戶:`);
  console.log('─'.repeat(70));
  console.log('| ID | Name         | Email                  | Role    |');
  console.log('─'.repeat(70));
  
  users.forEach(user => {
    const id = user.id.toString().padEnd(2);
    const name = (user.name || '無').padEnd(12);
    const email = user.email.padEnd(22);
    const role = user.role.padEnd(7);
    
    console.log(`| ${id} | ${name} | ${email} | ${role} |`);
  });
  console.log('─'.repeat(70));
  
  // 查找有 abc 相關的用戶
  const abcUsers = users.filter(u => 
    u.email.includes('abc') || 
    (u.name && u.name.includes('abc'))
  );
  
  if (abcUsers.length > 0) {
    console.log('\n🔍 找到 abc 相關用戶:');
    abcUsers.forEach(user => {
      console.log(`  - ID: ${user.id}, Name: ${user.name || '無'}, Email: ${user.email}, Role: ${user.role}`);
    });
  }
  
  // 查找醫生用戶
  const doctors = users.filter(u => u.role === 'doctor');
  if (doctors.length > 0) {
    console.log('\n👨‍⚕️ 找到醫生用戶:');
    doctors.forEach(doctor => {
      console.log(`  - ID: ${doctor.id}, Name: ${doctor.name || '無'}, Email: ${doctor.email}`);
    });
  }
  
  db.close();
}); 