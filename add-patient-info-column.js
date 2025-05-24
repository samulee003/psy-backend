const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./database.sqlite');

console.log('=== 為 appointments 表新增 patient_info 欄位 ===\n');

// 檢查欄位是否已存在
db.all('PRAGMA table_info(appointments)', [], (err, columns) => {
  if (err) {
    console.error('檢查表結構失敗:', err);
    db.close();
    return;
  }
  
  const hasPatientInfo = columns.some(col => col.name === 'patient_info');
  
  if (hasPatientInfo) {
    console.log('patient_info 欄位已存在，無需新增');
    db.close();
    return;
  }
  
  // 新增 patient_info 欄位
  const alterTableQuery = `ALTER TABLE appointments ADD COLUMN patient_info TEXT`;
  
  db.run(alterTableQuery, [], function(err) {
    if (err) {
      console.error('新增欄位失敗:', err);
      db.close();
      return;
    }
    
    console.log('✅ 成功新增 patient_info 欄位');
    
    // 將現有預約的就診者資訊從備註中提取到 patient_info 欄位
    console.log('\n開始遷移現有資料...');
    
    db.all('SELECT id, notes FROM appointments WHERE notes LIKE "%就診者：%" OR notes LIKE "%SENG HANG LEI%"', [], (err, appointments) => {
      if (err) {
        console.error('查詢預約失敗:', err);
        db.close();
        return;
      }
      
      if (appointments.length === 0) {
        console.log('沒有需要遷移的資料');
        db.close();
        return;
      }
      
      console.log(`找到 ${appointments.length} 筆需要遷移的預約`);
      
      let updatedCount = 0;
      appointments.forEach(apt => {
        let patientInfo = null;
        
        // 嘗試從備註中提取就診者資訊
        if (apt.notes) {
          const match = apt.notes.match(/就診者：(.+?)(?:\n|$)/);
          if (match) {
            patientInfo = JSON.stringify({
              patientName: match[1].trim(),
              isActualPatient: true
            });
          } else if (apt.notes.includes('SENG HANG LEI')) {
            patientInfo = JSON.stringify({
              patientName: 'SENG HANG LEI',
              isActualPatient: true
            });
          }
        }
        
        if (patientInfo) {
          db.run('UPDATE appointments SET patient_info = ? WHERE id = ?', [patientInfo, apt.id], (err) => {
            if (err) {
              console.error(`更新預約 ${apt.id} 失敗:`, err);
            } else {
              console.log(`✅ 更新預約 ${apt.id} 的就診者資訊`);
            }
            
            updatedCount++;
            if (updatedCount === appointments.length) {
              console.log('\n資料遷移完成！');
              console.log('\n=== 驗證遷移結果 ===');
              
              // 驗證遷移結果
              db.get('SELECT * FROM appointments WHERE id = ?', [7], (err, appointment) => {
                if (appointment && appointment.patient_info) {
                  console.log('預約 ID 7 的 patient_info:', appointment.patient_info);
                  const info = JSON.parse(appointment.patient_info);
                  console.log('就診者姓名:', info.patientName);
                }
                db.close();
              });
            }
          });
        } else {
          updatedCount++;
        }
      });
    });
  });
}); 