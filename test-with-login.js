const http = require('http');

console.log('🔐 完整登入和預約測試流程');
console.log('================================\n');

// 步驟1：先登入獲取有效的cookie
function performLogin() {
  return new Promise((resolve, reject) => {
    const loginData = {
      email: 'samu003@gmail.com',
      password: 'test123' // 假設的密碼，您需要確認正確的密碼
    };

    const requestData = JSON.stringify(loginData);

    const options = {
      hostname: 'localhost',
      port: 5000,
      path: '/api/auth/login',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(requestData)
      }
    };

    console.log('1️⃣ 嘗試登入...');
    console.log('登入資料:', loginData);

    const req = http.request(options, (res) => {
      console.log(`登入狀態碼: ${res.statusCode}`);
      
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          
          if (res.statusCode === 200 && response.success) {
            console.log('✅ 登入成功！');
            
            // 提取cookie
            const setCookieHeader = res.headers['set-cookie'];
            let authCookie = '';
            
            if (setCookieHeader) {
              const tokenCookie = setCookieHeader.find(cookie => cookie.startsWith('token='));
              if (tokenCookie) {
                authCookie = tokenCookie.split(';')[0]; // 只取 token=xxx 部分
                console.log('🍪 獲得認證cookie:', authCookie.substring(0, 50) + '...');
              }
            }
            
            resolve({
              success: true,
              cookie: authCookie,
              user: response.user,
              token: response.token
            });
          } else {
            console.log('❌ 登入失敗:', response.error || '未知錯誤');
            resolve({ success: false, error: response.error });
          }
        } catch (e) {
          console.log('登入回應解析失敗:', data);
          reject(e);
        }
      });
    });

    req.on('error', (error) => {
      console.error('登入請求錯誤:', error.message);
      reject(error);
    });

    req.write(requestData);
    req.end();
  });
}

// 步驟2：使用cookie創建預約
function createAppointment(authCookie, token) {
  return new Promise((resolve, reject) => {
    const appointmentData = {
      doctorId: '4',
      patientId: '3',
      appointmentDate: '2025-08-16',
      timeSlot: '16:00',
      reason: '完整流程測試預約',
      notes: '通過登入後創建的測試預約',
      isNewPatient: true,
      patientInfo: {
        name: '假的',
        phone: '62998036',
        email: 'samu003@gmail.com',
        gender: '',
        birthDate: ''
      },
      timezone: 'Asia/Hong_Kong'
    };

    const requestData = JSON.stringify(appointmentData);

    const headers = {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(requestData)
    };

    // 同時使用 cookie 和 Authorization header
    if (authCookie) {
      headers['Cookie'] = authCookie;
    }
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const options = {
      hostname: 'localhost',
      port: 5000,
      path: '/api/appointments',
      method: 'POST',
      headers: headers
    };

    console.log('\n2️⃣ 創建預約...');
    console.log('預約資料:', JSON.stringify(appointmentData, null, 2));
    console.log('使用認證:', {
      cookie: authCookie ? '✅' : '❌',
      token: token ? '✅' : '❌'
    });

    const req = http.request(options, (res) => {
      console.log(`\n預約創建狀態碼: ${res.statusCode}`);
      
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        console.log('回應內容:');
        try {
          const response = JSON.parse(data);
          console.log(JSON.stringify(response, null, 2));
          
          if (res.statusCode === 201 && response.success) {
            console.log('\n🎉 預約創建成功！');
            console.log(`預約ID: ${response.appointment.id}`);
            console.log(`isNewPatient: ${response.appointment.isNewPatient}`);
          } else {
            console.log('\n❌ 預約創建失敗');
            if (response.error) {
              console.log(`錯誤信息: ${response.error}`);
            }
          }
          
          resolve(response);
        } catch (e) {
          console.log('原始回應:', data);
          console.log('JSON 解析失敗:', e.message);
          resolve({ success: false, rawResponse: data });
        }
      });
    });

    req.on('error', (error) => {
      console.error('預約創建請求錯誤:', error.message);
      reject(error);
    });

    req.write(requestData);
    req.end();
  });
}

// 執行完整流程
async function runFullTest() {
  try {
    // 步驟1：登入
    const loginResult = await performLogin();
    
    if (!loginResult.success) {
      console.log('\n❌ 登入失敗，無法繼續測試');
      console.log('💡 請確認：');
      console.log('1. 用戶 samu003@gmail.com 存在');
      console.log('2. 密碼正確');
      console.log('3. 伺服器正在運行');
      return;
    }

    // 步驟2：創建預約
    await createAppointment(loginResult.cookie, loginResult.token);
    
    console.log('\n🏁 測試完成！');
    
  } catch (error) {
    console.error('\n💥 測試過程中發生錯誤:', error.message);
  }
}

// 開始測試
runFullTest(); 