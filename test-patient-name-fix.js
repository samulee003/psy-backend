const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./database.sqlite');

console.log('=== 測試就診者姓名顯示修復 ===\n');

// 模擬 getAppointments 函數的查詢邏輯
function testAppointmentQuery() {
  const query = `
    SELECT a.*, 
        d.name as doctor_name, 
        p.name as patient_name,
        a.patient_info
    FROM appointments a
    JOIN users d ON a.doctor_id = d.id
    JOIN users p ON a.patient_id = p.id
    ORDER BY a.date DESC, a.time ASC
  `;

  db.all(query, [], (err, appointments) => {
    if (err) {
      console.error('查詢預約失敗:', err.message);
      db.close();
      return;
    }

    console.log(`找到 ${appointments.length} 筆預約：\n`);

    const processedAppointments = appointments.map(app => {
      const { patient_name, doctor_name, patient_info, ...rest } = app;
      
      // 處理就診者姓名顯示邏輯
      let displayPatientName = patient_name; // 預設使用預約人姓名
      
      if (patient_info) {
        try {
          const patientInfoObj = JSON.parse(patient_info);
          if (patientInfoObj.patientName) {
            displayPatientName = patientInfoObj.patientName; // 優先使用就診者姓名
          }
        } catch (e) {
          console.warn('解析 patient_info 失敗:', e.message);
        }
      }
      
      return {
        ...rest,
        patientName: displayPatientName,
        doctorName: doctor_name,
        actualPatientName: displayPatientName, // 新增欄位，明確表示就診者姓名
        bookerName: patient_name // 新增欄位，表示預約人姓名
      };
    });

    // 顯示處理後的結果
    processedAppointments.forEach((apt, index) => {
      console.log(`預約 ${index + 1}:`);
      console.log(`  - 預約 ID: ${apt.id}`);
      console.log(`  - 日期時間: ${apt.date} ${apt.time}`);
      console.log(`  - 醫生: ${apt.doctorName}`);
      console.log(`  - 預約人: ${apt.bookerName}`);
      console.log(`  - 就診者: ${apt.actualPatientName}`);
      console.log(`  - 顯示姓名: ${apt.patientName}`);
      console.log(`  - 狀態: ${apt.status}`);
      console.log(`  - 備註: ${apt.notes || '無'}`);
      console.log(`  - patient_info: ${apt.patient_info || '無'}`);
      
      if (apt.bookerName !== apt.actualPatientName) {
        console.log(`  ✅ 成功！顯示就診者姓名 "${apt.actualPatientName}" 而非預約人姓名 "${apt.bookerName}"`);
      } else {
        console.log(`  ℹ️  預約人和就診者是同一人`);
      }
      console.log('  ---');
    });

    // 特別檢查 abc 用戶的預約
    const abcAppointment = processedAppointments.find(apt => apt.bookerName === 'abc');
    if (abcAppointment) {
      console.log('\n=== abc 用戶預約檢查結果 ===');
      console.log(`預約人帳號: abc`);
      console.log(`就診者姓名: ${abcAppointment.actualPatientName}`);
      console.log(`醫生端看到的姓名: ${abcAppointment.patientName}`);
      
      if (abcAppointment.actualPatientName === 'SENG HANG LEI') {
        console.log('✅ 修復成功！醫生端現在顯示就診者姓名 "SENG HANG LEI"');
      } else {
        console.log('❌ 修復失敗！醫生端仍顯示預約人姓名');
      }
    } else {
      console.log('\n⚠️  未找到 abc 用戶的預約');
    }

    db.close();
  });
}

testAppointmentQuery(); 