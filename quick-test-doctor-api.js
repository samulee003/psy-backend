const https = require('http');

let cookieJar = ''; // 儲存 cookie

// 登入醫生帳號
function loginDoctor() {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({
      email: 'sasha0970@gmail.com',
      password: 'jesus511907'
    });

    const options = {
      hostname: 'localhost',
      port: 5000,
      path: '/api/auth/login',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length
      }
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        console.log('登入回應狀態:', res.statusCode);
        console.log('登入回應:', body);
        
        // 儲存 cookie
        if (res.headers['set-cookie']) {
          cookieJar = res.headers['set-cookie'].join('; ');
          console.log('儲存的 cookie:', cookieJar);
        }
        
        if (res.statusCode === 200) {
          const response = JSON.parse(body);
          resolve(response.user);
        } else {
          reject(new Error(`登入失敗: ${body}`));
        }
      });
    });

    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

// 測試獲取預約
function getMyAppointments() {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 5000,
      path: '/api/appointments/my',
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': cookieJar
      }
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        console.log('獲取預約回應狀態:', res.statusCode);
        console.log('獲取預約回應:', body);
        if (res.statusCode === 200) {
          resolve(JSON.parse(body));
        } else {
          reject(new Error(`獲取預約失敗: ${body}`));
        }
      });
    });

    req.on('error', reject);
    req.end();
  });
}

// 主測試函數
async function testDoctorAPI() {
  try {
    console.log('=== 測試醫生端 API ===\n');
    
    console.log('1. 登入醫生帳號...');
    const user = await loginDoctor();
    console.log('登入成功，用戶:', user);
    
    // 等待一秒確保 cookie 設置完成
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    console.log('\n2. 獲取醫生的預約列表...');
    const appointments = await getMyAppointments();
    console.log('預約列表:', JSON.stringify(appointments, null, 2));
    
  } catch (error) {
    console.error('測試失敗:', error.message);
  }
}

testDoctorAPI(); 