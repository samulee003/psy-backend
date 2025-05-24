const http = require('http');
const querystring = require('querystring');
const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./database.sqlite');

// 配置
const HOST = 'localhost';
const PORT = 5000;
let authToken = '';

// 發送 HTTP 請求的輔助函數
function makeRequest(options, data = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => {
        body += chunk;
      });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          resolve({ status: res.statusCode, data: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, data: body });
        }
      });
    });

    req.on('error', (err) => {
      reject(err);
    });

    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
}

// 測試預約 API 是否正確返回患者姓名
async function testAppointmentsAPI() {
  try {
    console.log('=== 測試預約 API 的患者姓名顯示 ===\n');

    // 1. 首先登入醫生帳號
    console.log('1. 登入醫生帳號...');
    const loginOptions = {
      hostname: HOST,
      port: PORT,
      path: '/api/auth/login',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    };

    const loginData = {
      email: 'doctor@example.com',
      password: 'password123'
    };

    const loginResponse = await makeRequest(loginOptions, loginData);

    if (loginResponse.data.success) {
      authToken = loginResponse.data.token;
      console.log('✅ 醫生登入成功');
      console.log('Token:', authToken.substring(0, 50) + '...');
    } else {
      throw new Error('醫生登入失敗: ' + JSON.stringify(loginResponse.data));
    }

    // 2. 獲取預約列表
    console.log('\n2. 獲取預約列表...');
    const appointmentsOptions = {
      hostname: HOST,
      port: PORT,
      path: '/api/appointments',
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    };

    const appointmentsResponse = await makeRequest(appointmentsOptions);

    if (appointmentsResponse.data.success) {
      console.log('✅ 成功獲取預約列表');
      console.log('預約數量:', appointmentsResponse.data.appointments.length);
      
      // 檢查每個預約的患者姓名
      console.log('\n=== 預約詳細資訊 ===');
      appointmentsResponse.data.appointments.forEach((apt, index) => {
        console.log(`預約 ${index + 1}:`);
        console.log(`  - ID: ${apt.id}`);
        console.log(`  - 日期: ${apt.date}`);
        console.log(`  - 時間: ${apt.time}`);
        console.log(`  - 醫生姓名: ${apt.doctorName || apt.doctor_name || '未設置'}`);
        console.log(`  - 患者姓名: ${apt.patientName || apt.patient_name || '未設置'}`);
        console.log(`  - 狀態: ${apt.status}`);
        console.log(`  - 備註: ${apt.notes || '無'}`);
        console.log('  ---');
      });

      // 檢查是否有患者姓名資料不正確的問題
      const problematicAppointments = appointmentsResponse.data.appointments.filter(apt => 
        !apt.patientName && !apt.patient_name
      );
      
      if (problematicAppointments.length > 0) {
        console.log(`\n❌ 發現 ${problematicAppointments.length} 個預約沒有患者姓名！`);
      } else {
        console.log('\n✅ 所有預約都有患者姓名資料');
      }

      // 測試用不同患者建立的預約是否會顯示正確的患者姓名
      console.log('\n=== 檢查是否所有患者姓名都顯示為同一人 ===');
      const patientNames = appointmentsResponse.data.appointments.map(apt => 
        apt.patientName || apt.patient_name
      );
      const uniquePatientNames = [...new Set(patientNames)];
      
      console.log('所有患者姓名:', patientNames);
      console.log('唯一患者姓名:', uniquePatientNames);
      
      if (uniquePatientNames.length === 1 && uniquePatientNames[0] !== undefined) {
        console.log('⚠️  警告: 所有預約都顯示相同的患者姓名，這可能是問題所在！');
        console.log('問題患者姓名:', uniquePatientNames[0]);
      } else if (uniquePatientNames.length > 1) {
        console.log('✅ 預約顯示了不同的患者姓名，這是正確的');
      } else {
        console.log('⚠️  沒有找到任何患者姓名資料');
      }

    } else {
      throw new Error('獲取預約列表失敗: ' + JSON.stringify(appointmentsResponse.data));
    }

  } catch (error) {
    console.error('❌ 測試過程中發生錯誤:', error.message);
  }
}

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
    WHERE a.doctor_id = 2
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

// 執行測試
testAppointmentsAPI();
testAppointmentQuery(); 