const sqlite3 = require('sqlite3').verbose();

// 清理後的數據庫文件路徑
const dbPath = 'C:\\Users\\emily\\Downloads\\database_to_clean.sqlite';

console.log('=== 展示所有真實數據 ===');
console.log('');

const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READONLY, (err) => {
  if (err) {
    console.error('無法打開數據庫:', err.message);
    process.exit(1);
  }
  console.log('✅ 成功連接到數據庫');
  showData();
});

function showData() {
  // 1. 顯示所有用戶
  console.log('\n=== 📋 所有用戶 ===');
  db.all('SELECT id, email, name, role, phone, created_at FROM users ORDER BY role, id', (err, users) => {
    if (err) {
      console.error('查詢用戶失敗:', err);
      return;
    }
    
    console.log(`總用戶數: ${users.length}\n`);
    
    const doctors = users.filter(u => u.role === 'doctor');
    const patients = users.filter(u => u.role === 'patient');
    
    console.log(`👨‍⚕️ 醫生 (${doctors.length}人):`);
    doctors.forEach(user => {
      console.log(`  ✓ ID:${user.id} | ${user.name} | ${user.email} | 電話:${user.phone || '未設定'}`);
    });
    
    console.log(`\n👤 患者 (${patients.length}人):`);
    patients.forEach(user => {
      console.log(`  ✓ ID:${user.id} | ${user.name} | ${user.email} | 電話:${user.phone || '未設定'}`);
    });
    
    // 2. 顯示排班統計
    console.log('\n=== 📅 排班統計 ===');
    db.all(`
      SELECT u.email, u.name, COUNT(s.id) as schedule_count,
             MIN(s.date) as earliest_date, MAX(s.date) as latest_date
      FROM users u 
      LEFT JOIN schedule s ON u.id = s.doctor_id 
      WHERE u.role = 'doctor' 
      GROUP BY u.id
    `, (err, scheduleStats) => {
      if (err) {
        console.error('查詢排班失敗:', err);
        return;
      }
      
      scheduleStats.forEach(stat => {
        console.log(`  👨‍⚕️ ${stat.name} (${stat.email}): ${stat.schedule_count} 筆排班`);
        if (stat.schedule_count > 0) {
          console.log(`      時間範圍: ${stat.earliest_date} 到 ${stat.latest_date}`);
        }
      });
      
      // 3. 顯示預約統計
      console.log('\n=== 📞 預約統計 ===');
      db.all(`
        SELECT status, COUNT(*) as count 
        FROM appointments 
        GROUP BY status
      `, (err, appointmentStats) => {
        if (err) {
          console.error('查詢預約失敗:', err);
          return;
        }
        
        let totalAppointments = 0;
        appointmentStats.forEach(stat => {
          console.log(`  ${stat.status}: ${stat.count} 筆`);
          totalAppointments += stat.count;
        });
        console.log(`  總計: ${totalAppointments} 筆預約`);
        
        // 4. 顯示預約詳情
        console.log('\n=== 📞 預約詳情 ===');
        db.all(`
          SELECT a.id, a.date, a.time, a.status, a.created_at,
                 p.name as patient_name, p.email as patient_email,
                 d.name as doctor_name, d.email as doctor_email
          FROM appointments a
          JOIN users p ON a.patient_id = p.id
          JOIN users d ON a.doctor_id = d.id
          ORDER BY a.date, a.time
        `, (err, appointments) => {
          if (err) {
            console.error('查詢預約詳情失敗:', err);
            return;
          }
          
          appointments.forEach(apt => {
            console.log(`  📞 預約ID:${apt.id} | ${apt.date} ${apt.time} | ${apt.status}`);
            console.log(`      患者: ${apt.patient_name} (${apt.patient_email})`);
            console.log(`      醫生: ${apt.doctor_name} (${apt.doctor_email})`);
            console.log(`      建立時間: ${apt.created_at}`);
            console.log('');
          });
          
          console.log('🎉 所有真實數據展示完成！');
          console.log('\n=== 📈 數據摘要 ===');
          console.log(`👥 總用戶數: ${users.length}`);
          console.log(`👨‍⚕️ 醫生數量: ${doctors.length}`);
          console.log(`👤 患者數量: ${patients.length}`);
          console.log(`📅 排班記錄: ${scheduleStats[0].schedule_count} 筆`);
          console.log(`📞 預約記錄: ${totalAppointments} 筆`);
          
          db.close();
        });
      });
    });
  });
} 