const sqlite3 = require('sqlite3').verbose();

const dbPath = 'C:\\Users\\emily\\Downloads\\database_to_clean.sqlite';

const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READONLY, (err) => {
  if (err) {
    console.error('無法打開數據庫:', err.message);
    process.exit(1);
  }
  
  console.log('=== 所有預約詳情 ===\n');
  
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
      console.error('查詢失敗:', err.message);
      db.close();
      return;
    }
    
    console.log(`總預約數: ${appointments.length}\n`);
    
    appointments.forEach((apt, index) => {
      console.log(`${index + 1}. 預約ID: ${apt.id}`);
      console.log(`   日期時間: ${apt.date} ${apt.time}`);
      console.log(`   狀態: ${apt.status}`);
      console.log(`   患者: ${apt.patient_name} (${apt.patient_email})`);
      console.log(`   醫生: ${apt.doctor_name} (${apt.doctor_email})`);
      console.log(`   建立時間: ${apt.created_at}`);
      console.log('');
    });
    
    // 統計
    const confirmed = appointments.filter(a => a.status === 'confirmed').length;
    const cancelled = appointments.filter(a => a.status === 'cancelled').length;
    
    console.log('=== 統計 ===');
    console.log(`已確認預約: ${confirmed} 筆`);
    console.log(`已取消預約: ${cancelled} 筆`);
    console.log(`總計: ${appointments.length} 筆`);
    
    db.close();
  });
}); 