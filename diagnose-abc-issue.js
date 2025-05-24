const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./database.sqlite');

console.log('=== 診斷 abc 用戶的預約顯示問題 ===\n');

// 檢查 appointments 表結構
console.log('1. 檢查 appointments 表結構：');
db.all('PRAGMA table_info(appointments)', [], (err, rows) => {
  if (err) {
    console.error('查詢表結構失敗:', err);
    return;
  }
  
  console.log('Appointments 表結構:');
  rows.forEach(row => {
    console.log(`- ${row.name}: ${row.type}${row.notnull ? ' NOT NULL' : ''}${row.dflt_value ? ' DEFAULT ' + row.dflt_value : ''}`);
  });
  
  // 查找 abc 用戶
  console.log('\n2. 查找 abc 用戶：');
  db.get('SELECT * FROM users WHERE name = ? OR email LIKE ?', ['abc', '%abc%'], (err, user) => {
    if (err) {
      console.error('查詢用戶失敗:', err);
      return;
    }
    
    if (!user) {
      console.log('未找到 abc 用戶');
      db.close();
      return;
    }
    
    console.log('找到用戶:', user);
    
    // 查找該用戶的預約
    console.log('\n3. 查找 abc 用戶的預約：');
    const query = `
      SELECT a.*, 
             u_patient.name as patient_name,
             u_patient.email as patient_email,
             u_doctor.name as doctor_name,
             u_doctor.email as doctor_email
      FROM appointments a
      LEFT JOIN users u_patient ON a.patient_id = u_patient.id
      LEFT JOIN users u_doctor ON a.doctor_id = u_doctor.id
      WHERE a.patient_id = ?
      ORDER BY a.date DESC, a.time ASC
    `;
    
    db.all(query, [user.id], (err, appointments) => {
      if (err) {
        console.error('查詢預約失敗:', err);
        return;
      }
      
      if (appointments.length === 0) {
        console.log('該用戶沒有預約記錄');
      } else {
        console.log(`找到 ${appointments.length} 筆預約：`);
        appointments.forEach((apt, index) => {
          console.log(`\n預約 ${index + 1}:`);
          console.log(`  - ID: ${apt.id}`);
          console.log(`  - 日期: ${apt.date}`);
          console.log(`  - 時間: ${apt.time}`);
          console.log(`  - 醫生: ${apt.doctor_name} (${apt.doctor_email})`);
          console.log(`  - 預約人: ${apt.patient_name} (${apt.patient_email})`);
          console.log(`  - 狀態: ${apt.status}`);
          console.log(`  - 備註: ${apt.notes || '無'}`);
        });
      }
      
      // 檢查是否有 patient_info 或其他可能儲存就診者姓名的欄位
      console.log('\n4. 檢查預約備註中是否包含就診者資訊：');
      db.all('SELECT id, notes FROM appointments WHERE patient_id = ?', [user.id], (err, rows) => {
        if (err) {
          console.error('查詢備註失敗:', err);
          return;
        }
        
        rows.forEach(row => {
          console.log(`預約 ${row.id} 的備註: ${row.notes || '(空)'}`);
          if (row.notes && row.notes.includes('SENG HANG LEI')) {
            console.log('  → 發現就診者姓名在備註中！');
          }
        });
        
        // 提供診斷結論
        console.log('\n=== 診斷結論 ===');
        console.log('1. appointments 表沒有專門的欄位儲存就診者姓名');
        console.log('2. 系統只能顯示預約人（users 表中的姓名）');
        console.log('3. 如果需要顯示不同的就診者姓名（如 SENG HANG LEI），需要：');
        console.log('   a. 在 appointments 表新增 patient_info 欄位');
        console.log('   b. 修改預約創建邏輯，儲存就診者資訊');
        console.log('   c. 修改預約查詢邏輯，優先顯示就診者姓名');
        
        db.close();
      });
    });
  });
}); 