const http = require('http');
const querystring = require('querystring');

// 配置
const config = {
  host: 'localhost',
  port: 5000,
  timeout: 10000
};

// 測試用戶憑證
const testCredentials = {
  doctor: {
    email: 'doctor@example.com',
    password: 'password123'
  }
};

// 登入函數
function login(credentials) {
  return new Promise((resolve, reject) => {
    const postData = querystring.stringify(credentials);
    
    const options = {
      hostname: config.host,
      port: config.port,
      path: '/api/auth/login',
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(postData)
      },
      timeout: config.timeout
    };

    console.log('發送登入請求到:', `http://${config.host}:${config.port}/api/auth/login`);
    console.log('請求資料:', credentials);

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        console.log('登入回應狀態碼:', res.statusCode);
        console.log('登入回應資料:', data);
        
        try {
          const response = JSON.parse(data);
          if (response.success) {
            // 提取 Set-Cookie 標頭
            const cookies = res.headers['set-cookie'];
            console.log('收到的 cookies:', cookies);
            resolve({ response, cookies });
          } else {
            reject(new Error(`登入失敗: ${response.error}`));
          }
        } catch (error) {
          reject(new Error(`解析回應失敗: ${error.message}, 原始資料: ${data}`));
        }
      });
    });

    req.on('error', (error) => {
      console.error('請求錯誤詳情:', error);
      reject(new Error(`請求失敗: ${error.message}`));
    });

    req.on('timeout', () => {
      req.destroy();
      reject(new Error('請求超時'));
    });

    req.write(postData);
    req.end();
  });
}

// 獲取預約列表
function getAppointments(cookies) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: config.host,
      port: config.port,
      path: '/api/appointments',
      method: 'GET',
      headers: {
        'Cookie': cookies ? cookies.join('; ') : ''
      },
      timeout: config.timeout
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          resolve({ statusCode: res.statusCode, response });
        } catch (error) {
          reject(new Error(`解析回應失敗: ${error.message}`));
        }
      });
    });

    req.on('error', (error) => {
      reject(new Error(`請求失敗: ${error.message}`));
    });

    req.on('timeout', () => {
      req.destroy();
      reject(new Error('請求超時'));
    });

    req.end();
  });
}

// 主測試函數
async function testAppointmentsAPI() {
  console.log('=== 測試預約 API 的就診者姓名顯示 ===\n');

  try {
    // 1. 醫生登入
    console.log('1. 醫生登入...');
    const { response: loginResponse, cookies } = await login(testCredentials.doctor);
    console.log('✅ 醫生登入成功');
    console.log('登入回應:', loginResponse);

    // 2. 獲取預約列表
    console.log('\n2. 獲取預約列表...');
    const { statusCode, response: appointmentsResponse } = await getAppointments(cookies);
    
    if (statusCode === 200 && appointmentsResponse.success) {
      console.log('✅ 成功獲取預約列表');
      console.log(`找到 ${appointmentsResponse.appointments.length} 筆預約\n`);
      
      // 分析每個預約
      appointmentsResponse.appointments.forEach((apt, index) => {
        console.log(`預約 ${index + 1}:`);
        console.log(`  - 預約 ID: ${apt.id}`);
        console.log(`  - 日期時間: ${apt.date} ${apt.time}`);
        console.log(`  - 醫生: ${apt.doctorName}`);
        console.log(`  - 患者姓名: ${apt.patientName}`);
        console.log(`  - 實際就診者: ${apt.actualPatientName || '未設定'}`);
        console.log(`  - 預約人: ${apt.bookerName || '未設定'}`);
        console.log(`  - 狀態: ${apt.status}`);
        console.log(`  - 備註: ${apt.notes || '無'}`);
        
        // 檢查是否有就診者資訊
        if (apt.actualPatientName && apt.bookerName && apt.actualPatientName !== apt.bookerName) {
          console.log(`  ✅ 成功！顯示就診者姓名 "${apt.actualPatientName}" 而非預約人姓名 "${apt.bookerName}"`);
        } else if (apt.patientName === 'SENG HANG LEI') {
          console.log(`  ✅ 成功！顯示就診者姓名 "SENG HANG LEI"`);
        } else {
          console.log(`  ℹ️  預約人和就診者是同一人或未設定就診者資訊`);
        }
        console.log('  ---');
      });

      // 特別檢查 abc 用戶的預約
      const abcAppointment = appointmentsResponse.appointments.find(apt => 
        apt.patientName === 'SENG HANG LEI' || 
        apt.actualPatientName === 'SENG HANG LEI' ||
        apt.bookerName === 'abc'
      );
      
      if (abcAppointment) {
        console.log('\n=== abc 用戶預約檢查結果 ===');
        console.log(`醫生端看到的患者姓名: ${abcAppointment.patientName}`);
        console.log(`實際就診者: ${abcAppointment.actualPatientName || '未設定'}`);
        console.log(`預約人: ${abcAppointment.bookerName || '未設定'}`);
        
        if (abcAppointment.patientName === 'SENG HANG LEI') {
          console.log('✅ 修復成功！醫生端現在顯示就診者姓名 "SENG HANG LEI"');
        } else {
          console.log('❌ 修復失敗！醫生端仍顯示預約人姓名');
        }
      } else {
        console.log('\n⚠️  未找到 abc 用戶的預約或 SENG HANG LEI 的預約');
      }
      
    } else {
      console.error('❌ 獲取預約列表失敗');
      console.error('狀態碼:', statusCode);
      console.error('回應:', appointmentsResponse);
    }

  } catch (error) {
    console.error('❌ 測試失敗:', error.message);
  }
}

// 執行測試
testAppointmentsAPI(); 