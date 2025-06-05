const sqlite3 = require('sqlite3').verbose();

const db = new sqlite3.Database('database.sqlite');

console.log('🔍 快速檢查預約系統狀態');
console.log('========================\n');

// 1. 檢查預約狀態分佈
db.all('SELECT status, COUNT(*) as count FROM appointments GROUP BY status', [], (err, results) => {
  if (err) {
    console.error('❌ 查詢失敗:', err.message);
    return;
  }
  
  console.log('📊 預約狀態分佈:');
  if (results.length === 0) {
    console.log('  沒有預約記錄');
  } else {
    results.forEach(r => {
      console.log(`  ${r.status}: ${r.count}個`);
    });
  }
  
  console.log('\n📋 最新5個預約:');
  db.all('SELECT id, date, time, status, patient_id, doctor_id, created_at FROM appointments ORDER BY created_at DESC LIMIT 5', [], (err, appointments) => {
    if (err) {
      console.error('❌ 查詢最新預約失敗:', err.message);
    } else if (appointments.length === 0) {
      console.log('  沒有預約記錄');
    } else {
      appointments.forEach(a => {
        console.log(`  ID: ${a.id}, 日期: ${a.date}, 時間: ${a.time}, 狀態: ${a.status}, 患者ID: ${a.patient_id}, 醫生ID: ${a.doctor_id}`);
      });
    }
    
    console.log('\n🏥 檢查用戶數量:');
    db.get('SELECT COUNT(*) as total_users, SUM(CASE WHEN role="patient" THEN 1 ELSE 0 END) as patients, SUM(CASE WHEN role="doctor" THEN 1 ELSE 0 END) as doctors FROM users', [], (err, counts) => {
      if (err) {
        console.error('❌ 查詢用戶數量失敗:', err.message);
      } else {
        console.log(`  總用戶: ${counts.total_users}, 患者: ${counts.patients}, 醫生: ${counts.doctors}`);
      }
      
      console.log('\n✅ 檢查完成');
      db.close();
    });
  });
}); 