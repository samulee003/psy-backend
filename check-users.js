const sqlite3 = require('sqlite3').verbose();

console.log('🔍 檢查用戶數據\n');

const db = new sqlite3.Database('database.sqlite', (err) => {
    if (err) {
        console.error('❌ 無法連接到數據庫:', err.message);
        process.exit(1);
    }
    console.log('✅ 已連接到數據庫\n');
});

// 檢查所有用戶
db.all('SELECT id, email, name, role FROM users ORDER BY role, id', (err, users) => {
    if (err) {
        console.error('❌ 查詢失敗:', err.message);
    } else {
        console.log('📊 所有用戶:');
        users.forEach(user => {
            console.log(`  ${user.role.toUpperCase()}: ID ${user.id}, ${user.name} (${user.email})`);
        });
        
        const doctors = users.filter(u => u.role === 'doctor');
        console.log(`\n👨‍⚕️ 醫生總數: ${doctors.length}`);
        
        const patients = users.filter(u => u.role === 'patient');
        console.log(`👤 患者總數: ${patients.length}`);
    }
    
    db.close();
}); 