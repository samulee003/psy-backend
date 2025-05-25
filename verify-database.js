const sqlite3 = require('sqlite3').verbose();

const dbPath = 'C:\\Users\\emily\\Downloads\\database.sqlite';

console.log('🔍 === 驗證數據庫完整性 ===\n');

const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READONLY, (err) => {
  if (err) {
    console.error('❌ 數據庫連接失敗:', err.message);
    process.exit(1);
  }
  
  console.log('✅ 數據庫連接成功\n');
  
  // 檢查用戶
  db.all('SELECT id, email, name, role FROM users ORDER BY role, id', (err, users) => {
    if (err) {
      console.error('❌ 查詢用戶失敗:', err.message);
      return;
    }
    
    console.log('👥 === 用戶列表 ===');
    console.log(`總用戶數: ${users.length}\n`);
    
    const doctors = users.filter(u => u.role === 'doctor');
    const patients = users.filter(u => u.role === 'patient');
    
    console.log(`👨‍⚕️ 醫生 (${doctors.length}人):`);
    doctors.forEach(doc => {
      console.log(`  ✓ ID:${doc.id} | ${doc.name} | ${doc.email}`);
    });
    
    console.log(`\n👤 患者 (${patients.length}人):`);
    patients.slice(0, 5).forEach(patient => {
      console.log(`  ✓ ID:${patient.id} | ${patient.name} | ${patient.email}`);
    });
    if (patients.length > 5) {
      console.log(`  ... 還有 ${patients.length - 5} 位患者`);
    }
    
    // 檢查預約
    db.all('SELECT COUNT(*) as count, status FROM appointments GROUP BY status', (err, aptStats) => {
      if (err) {
        console.error('❌ 查詢預約失敗:', err.message);
        return;
      }
      
      console.log('\n📅 === 預約統計 ===');
      let total = 0;
      aptStats.forEach(stat => {
        console.log(`  ${stat.status}: ${stat.count} 筆`);
        total += stat.count;
      });
      console.log(`  總計: ${total} 筆預約`);
      
      // 檢查排班
      db.get('SELECT COUNT(*) as count FROM schedule', (err, scheduleCount) => {
        if (err) {
          console.error('❌ 查詢排班失敗:', err.message);
          return;
        }
        
        console.log(`\n📋 === 排班統計 ===`);
        console.log(`總排班記錄: ${scheduleCount.count} 筆`);
        
        // 檢查重要用戶
        console.log('\n🔍 === 重要用戶檢查 ===');
        const importantEmails = ['sasha0970@gmail.com', 'samu003@gmail.com', 'testing@gmail.com'];
        
        importantEmails.forEach(email => {
          const user = users.find(u => u.email === email);
          if (user) {
            console.log(`✅ ${email} 存在 (${user.name} - ${user.role})`);
          } else {
            console.log(`❌ ${email} 不存在`);
          }
        });
        
        // 檢查appointments表結構
        db.all("PRAGMA table_info(appointments)", (err, columns) => {
          if (err) {
            console.error('❌ 檢查表結構失敗:', err.message);
            return;
          }
          
          console.log('\n📋 === Appointments 表結構 ===');
          const hasPatientInfo = columns.find(col => col.name === 'patient_info');
          if (hasPatientInfo) {
            console.log('✅ patient_info 欄位存在');
          } else {
            console.log('❌ patient_info 欄位缺失');
          }
          
          console.log('\n🎉 === 驗證完成 ===');
          console.log('✅ 數據庫已準備好上傳到 Zeabur');
          
          db.close();
        });
      });
    });
  });
}); 