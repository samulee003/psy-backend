const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// 連接資料庫
const dbPath = path.join(__dirname, 'database.sqlite');
const db = new sqlite3.Database(dbPath);

console.log('=== 為醫生 ID 9 創建測試預約 ===\n');

// 更新現有預約到新醫生 ID
function updateExistingAppointments() {
  return new Promise((resolve, reject) => {
    const updateQuery = `
      UPDATE appointments 
      SET doctor_id = 9 
      WHERE doctor_id = 2
    `;
    
    db.run(updateQuery, [], function(err) {
      if (err) {
        console.error('更新現有預約失敗:', err.message);
        reject(err);
      } else {
        console.log(`✅ 已將 ${this.changes} 個預約轉移到醫生 ID 9`);
        resolve(this.changes);
      }
    });
  });
}

// 特別為 abc 用戶創建預約（帶有 patient_info）
function createAbcAppointment() {
  return new Promise((resolve, reject) => {
    // 先檢查 abc 用戶是否存在
    db.get('SELECT * FROM users WHERE email = ?', ['abc@gmail.com'], (err, abcUser) => {
      if (err) {
        console.error('查詢 abc 用戶失敗:', err.message);
        reject(err);
        return;
      }
      
      if (!abcUser) {
        console.log('⚠️ abc 用戶不存在，需要先創建');
        resolve(null);
        return;
      }
      
      // 檢查是否已有預約
      db.get('SELECT * FROM appointments WHERE patient_id = ? AND doctor_id = 9', [abcUser.id], (err, existing) => {
        if (err) {
          console.error('查詢現有預約失敗:', err.message);
          reject(err);
          return;
        }
        
        if (existing) {
          console.log('✅ abc 用戶已有預約，ID:', existing.id);
          resolve(existing.id);
          return;
        }
        
        // 創建新預約
        const patientInfo = JSON.stringify({
          patientName: "SENG HANG LEI",
          isActualPatient: true,
          phone: '+85362998036',
          email: 'abc@gmail.com',
          gender: 'male',
          birthDate: '1988-05-11'
        });
        
        const appointmentQuery = `
          INSERT INTO appointments (doctor_id, patient_id, date, time, status, notes, patient_info, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
        `;
        
        db.run(appointmentQuery, [
          9,  // 醫生 ID 9
          abcUser.id,  // abc 用戶 ID
          '2025-07-10',
          '14:00',
          'confirmed',
          '心理諮詢 - SENG HANG LEI',
          patientInfo
        ], function(err) {
          if (err) {
            console.error('創建 abc 預約失敗:', err.message);
            reject(err);
          } else {
            console.log('✅ 成功為 abc 用戶創建預約');
            console.log(`  - 預約 ID: ${this.lastID}`);
            console.log(`  - 預約人: ${abcUser.name} (${abcUser.email})`);
            console.log(`  - 就診者: SENG HANG LEI`);
            console.log(`  - 日期時間: 2025-07-10 14:00`);
            resolve(this.lastID);
          }
        });
      });
    });
  });
}

// 檢查結果
function checkResults() {
  return new Promise((resolve, reject) => {
    const query = `
      SELECT a.*, 
          d.name as doctor_name, 
          p.name as patient_name,
          a.patient_info
      FROM appointments a
      JOIN users d ON a.doctor_id = d.id
      JOIN users p ON a.patient_id = p.id
      WHERE a.doctor_id = 9
      ORDER BY a.date DESC, a.time ASC
    `;
    
    db.all(query, [], (err, appointments) => {
      if (err) {
        console.error('查詢結果失敗:', err.message);
        reject(err);
        return;
      }
      
      console.log(`\n=== 醫生 ID 9 的預約列表 (${appointments.length} 筆) ===`);
      
      appointments.forEach((app, index) => {
        let displayPatientName = app.patient_name;
        
        if (app.patient_info) {
          try {
            const patientInfoObj = JSON.parse(app.patient_info);
            if (patientInfoObj.patientName) {
              displayPatientName = patientInfoObj.patientName;
            }
          } catch (e) {
            console.warn('解析 patient_info 失敗:', e.message);
          }
        }
        
        console.log(`\n預約 ${index + 1}:`);
        console.log(`  - ID: ${app.id}`);
        console.log(`  - 日期時間: ${app.date} ${app.time}`);
        console.log(`  - 醫生: ${app.doctor_name}`);
        console.log(`  - 預約人: ${app.patient_name}`);
        console.log(`  - 就診者: ${displayPatientName}`);
        console.log(`  - 狀態: ${app.status}`);
        console.log(`  - 備註: ${app.notes || '無'}`);
        if (app.patient_info) {
          console.log(`  - 詳細資訊: ${app.patient_info}`);
        }
      });
      
      resolve(appointments);
    });
  });
}

// 主執行函數
async function main() {
  try {
    // 1. 更新現有預約
    await updateExistingAppointments();
    
    // 2. 創建 abc 的特殊預約
    await createAbcAppointment();
    
    // 3. 檢查結果
    await checkResults();
    
    console.log('\n✅ 預約設置完成！');
    
  } catch (error) {
    console.error('操作失敗:', error.message);
  } finally {
    db.close();
  }
}

main(); 