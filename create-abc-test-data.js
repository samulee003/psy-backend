const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');
const db = new sqlite3.Database('./database.sqlite');

console.log('=== 創建 abc 用戶和預約測試資料 ===\n');

// 創建 abc 用戶
const hashedPassword = bcrypt.hashSync('123456', 10);
const createUserQuery = `
  INSERT INTO users (username, name, email, password, role, phone, created_at)
  VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
`;

db.run(createUserQuery, ['abc', 'abc', 'abc@example.com', hashedPassword, 'patient', '12345678'], function(err) {
  if (err) {
    console.error('創建 abc 用戶失敗:', err);
    if (err.message.includes('UNIQUE constraint failed')) {
      console.log('abc 用戶已存在，嘗試查找現有用戶...');
      
      // 查找現有用戶
      db.get('SELECT * FROM users WHERE email = ? OR username = ?', ['abc@example.com', 'abc'], (err, user) => {
        if (err || !user) {
          console.error('查找用戶失敗');
          db.close();
          return;
        }
        console.log('找到現有 abc 用戶:', user);
        createAppointment(user.id);
      });
    } else {
      db.close();
    }
    return;
  }
  
  const userId = this.lastID;
  console.log('✅ 成功創建 abc 用戶，ID:', userId);
  
  createAppointment(userId);
});

function createAppointment(patientId) {
  // 查找一個醫生
  db.get('SELECT id FROM users WHERE role = "doctor" LIMIT 1', [], (err, doctor) => {
    if (err || !doctor) {
      console.error('未找到醫生');
      db.close();
      return;
    }
    
    console.log('找到醫生 ID:', doctor.id);
    
    // 創建預約，備註中包含就診者姓名
    const appointmentQuery = `
      INSERT INTO appointments (doctor_id, patient_id, date, time, status, notes, created_at)
      VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
    `;
    
    const notes = '就診者：SENG HANG LEI\n預約原因：心理諮詢';
    
    db.run(appointmentQuery, [
      doctor.id,
      patientId,
      '2025-07-10',
      '14:00',
      'confirmed',
      notes
    ], function(err) {
      if (err) {
        console.error('創建預約失敗:', err);
        db.close();
        return;
      }
      
      console.log('✅ 成功創建預約，ID:', this.lastID);
      console.log('預約資訊：');
      console.log('  - 預約人帳號：abc');
      console.log('  - 就診者姓名：SENG HANG LEI（儲存在備註中）');
      console.log('  - 日期時間：2025-07-10 14:00');
      console.log('  - 備註：', notes);
      
      // 查詢並顯示預約
      const query = `
        SELECT a.*, 
               u_patient.name as patient_name,
               u_doctor.name as doctor_name
        FROM appointments a
        LEFT JOIN users u_patient ON a.patient_id = u_patient.id
        LEFT JOIN users u_doctor ON a.doctor_id = u_doctor.id
        WHERE a.id = ?
      `;
      
      db.get(query, [this.lastID], (err, appointment) => {
        if (err) {
          console.error('查詢預約失敗:', err);
          db.close();
          return;
        }
        
        console.log('\n=== 目前系統顯示的預約資訊 ===');
        console.log('醫生看到的預約人姓名:', appointment.patient_name, '（這是帳號名稱，不是就診者姓名）');
        console.log('備註:', appointment.notes);
        console.log('\n❌ 問題：醫生看到的是 "abc" 而不是 "SENG HANG LEI"');
        console.log('📌 原因：系統沒有專門的欄位儲存就診者姓名，只能顯示帳號名稱');
        
        db.close();
      });
    });
  });
} 