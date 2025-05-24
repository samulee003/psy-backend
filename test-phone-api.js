/**
 * 測試電話號碼 API 功能
 */

const http = require('http');

// 測試登入並獲取用戶資料
async function testPhoneAPI() {
  console.log('🔍 開始測試電話號碼 API 功能...');
  
  try {
    // 1. 測試登入
    console.log('\n1️⃣ 測試登入 API...');
    const loginData = JSON.stringify({
      email: 'patient@example.com',
      password: '[REDACTED]'
    });
    
    const loginResponse = await makeRequest('POST', '/api/auth/login', loginData);
    console.log('登入回應:', loginResponse);
    
    if (!loginResponse.success) {
      console.error('❌ 登入失敗:', loginResponse.error);
      return;
    }
    
    const token = loginResponse.token;
    console.log('✅ 登入成功，獲得 token:', token.substring(0, 20) + '...');
    
    // 2. 測試獲取當前用戶資料
    console.log('\n2️⃣ 測試獲取用戶資料 API...');
    const userResponse = await makeRequest('GET', '/api/auth/me', null, {
      'Authorization': `Bearer ${token}`
    });
    
    console.log('用戶資料回應:', JSON.stringify(userResponse, null, 2));
    
    if (userResponse.success && userResponse.user) {
      const user = userResponse.user;
      console.log('\n📋 用戶資料分析:');
      console.log(`- ID: ${user.id}`);
      console.log(`- 姓名: ${user.name}`);
      console.log(`- 電子郵件: ${user.email}`);
      console.log(`- 角色: ${user.role}`);
      console.log(`- 電話號碼: ${user.phone || '❌ 未提供'}`);
      console.log(`- 建立時間: ${user.created_at}`);
      
      if (user.phone) {
        console.log('✅ 電話號碼欄位存在且有值！');
      } else {
        console.log('❌ 電話號碼欄位缺失或為空！');
      }
    } else {
      console.error('❌ 獲取用戶資料失敗:', userResponse.error);
    }
    
  } catch (error) {
    console.error('❌ 測試過程中發生錯誤:', error.message);
  }
}

// HTTP 請求輔助函數
function makeRequest(method, path, data, headers = {}) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 5000,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      }
    };
    
    if (data) {
      options.headers['Content-Length'] = Buffer.byteLength(data);
    }
    
    const req = http.request(options, (res) => {
      let responseData = '';
      
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        try {
          const parsedData = JSON.parse(responseData);
          resolve(parsedData);
        } catch (error) {
          reject(new Error(`解析回應失敗: ${responseData}`));
        }
      });
    });
    
    req.on('error', (error) => {
      reject(error);
    });
    
    if (data) {
      req.write(data);
    }
    
    req.end();
  });
}

// 執行測試
testPhoneAPI(); 