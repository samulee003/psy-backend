const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'database.sqlite');
const db = new sqlite3.Database(dbPath);

console.log('=== 檢查資料庫中的預約和用戶資料 ===\n');

// 檢查用戶資料
db.all('SELECT id, name, email, role FROM users', [], (err, users) => {
  if (err) {
    console.error('查詢用戶失敗:', err.message);
    return;
  }
  
  console.log('=== 用戶列表 ===');
  console.log('用戶總數:', users.length);
  users.forEach(user => {
    console.log(`ID: ${user.id}, 姓名: ${user.name}, 郵箱: ${user.email}, 角色: ${user.role}`);
  });
  
  // 檢查預約資料
  const query = `
    SELECT a.*, 
           u_patient.name as patient_name,
           u_patient.email as patient_email,
           u_doctor.name as doctor_name,
           u_doctor.email as doctor_email
    FROM appointments a
    LEFT JOIN users u_patient ON a.patient_id = u_patient.id
    LEFT JOIN users u_doctor ON a.doctor_id = u_doctor.id
    ORDER BY a.date DESC, a.time ASC
  `;
  
  db.all(query, [], (err, appointments) => {
    if (err) {
      console.error('查詢預約失敗:', err.message);
      return;
    }
    
    console.log('\n=== 預約列表 ===');
    console.log('預約總數:', appointments.length);
    
    if (appointments.length === 0) {
      console.log('⚠️  資料庫中沒有任何預約！');
      
      // 創建一些測試預約資料
      console.log('\n正在創建測試預約資料...');
      
      // 找醫生和患者的 ID
      const doctor = users.find(u => u.role === 'doctor');
      const patients = users.filter(u => u.role === 'patient');
      
      if (!doctor) {
        console.log('❌ 沒有找到醫生帳號');
        db.close();
        return;
      }
      
      if (patients.length === 0) {
        console.log('❌ 沒有找到患者帳號');
        db.close();
        return;
      }
      
      // 創建測試預約
      const testAppointments = [
        {
          doctor_id: doctor.id,
          patient_id: patients[0].id,
          date: '2025-08-13',
          time: '17:00',
          status: 'confirmed',
          notes: '首次諮詢'
        }
      ];
      
      // 如果有多個患者，創建更多預約
      if (patients.length > 1) {
        testAppointments.push({
          doctor_id: doctor.id,
          patient_id: patients[1]?.id || patients[0].id,
          date: '2025-08-13',
          time: '18:30',
          status: 'confirmed',
          notes: '後續治療'
        });
      }
      
      let insertCount = 0;
      testAppointments.forEach(apt => {
        const insertQuery = `
          INSERT INTO appointments (doctor_id, patient_id, date, time, status, notes, created_at)
          VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
        `;
        
        db.run(insertQuery, [apt.doctor_id, apt.patient_id, apt.date, apt.time, apt.status, apt.notes], function(err) {
          if (err) {
            console.error('插入預約失敗:', err.message);
          } else {
            console.log(`✅ 已創建預約 ID: ${this.lastID} - 醫生: ${doctor.name}, 患者: ${patients.find(p => p.id === apt.patient_id).name}`);
          }
          
          insertCount++;
          if (insertCount === testAppointments.length) {
            console.log('\n測試預約創建完成！請重新執行測試腳本。');
            db.close();
          }
        });
      });
      
    } else {
      appointments.forEach((apt, index) => {
        console.log(`預約 ${index + 1}:`);
        console.log(`  - ID: ${apt.id}`);
        console.log(`  - 日期: ${apt.date}`);
        console.log(`  - 時間: ${apt.time}`);
        console.log(`  - 醫生: ${apt.doctor_name} (${apt.doctor_email})`);
        console.log(`  - 患者: ${apt.patient_name} (${apt.patient_email})`);
        console.log(`  - 狀態: ${apt.status}`);
        console.log(`  - 備註: ${apt.notes || '無'}`);
        console.log('  ---');
      });
      
      // 檢查是否所有預約都顯示相同的患者姓名
      const patientNames = appointments.map(apt => apt.patient_name);
      const uniquePatientNames = [...new Set(patientNames)];
      
      console.log('\n=== 分析 ===');
      console.log('所有患者姓名:', patientNames);
      console.log('唯一患者姓名:', uniquePatientNames);
      
      if (uniquePatientNames.length === 1 && uniquePatientNames[0]) {
        console.log('⚠️  警告: 所有預約都顯示相同的患者姓名:', uniquePatientNames[0]);
        console.log('這可能是前端顯示問題，而不是後端資料問題。');
      } else if (uniquePatientNames.length > 1) {
        console.log('✅ 預約資料顯示了不同的患者姓名，資料結構正確');
      }
      
      db.close();
    }
  });
}); 