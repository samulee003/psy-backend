/**
 * 快速測試密碼更新 API
 */

const { connectDatabase } = require('./config/db');
const fetch = require('node-fetch');

const API_BASE = 'http://localhost:5000';

// 檢查資料庫中的用戶
async function checkUsers() {
  return new Promise((resolve, reject) => {
    const db = connectDatabase();
    db.all('SELECT email, username, name FROM users LIMIT 5', (err, users) => {
      if (err) {
        reject(err);
      } else {
        resolve(users);
      }
    });
  });
}

// API 請求函數
async function apiRequest(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;
  
  const defaultOptions = {
    headers: {
      'Content-Type': 'application/json'
    }
  };
  
  const finalOptions = {
    ...defaultOptions,
    ...options,
    headers: {
      ...defaultOptions.headers,
      ...options.headers
    }
  };
  
  if (finalOptions.body && typeof finalOptions.body === 'object') {
    finalOptions.body = JSON.stringify(finalOptions.body);
  }
  
  try {
    const response = await fetch(url, finalOptions);
    const data = await response.json();
    return { response, data };
  } catch (error) {
    return { response: null, data: { error: error.message } };
  }
}

// 主測試函數
async function quickTest() {
  console.log('🔍 檢查資料庫用戶...');
  
  try {
    const users = await checkUsers();
    console.log('用戶列表:', users);
    
    if (users.length === 0) {
      console.log('❌ 資料庫中沒有用戶，無法測試');
      return;
    }
    
    // 使用第一個用戶測試
    const testUser = users[0];
    const testEmail = testUser.email || testUser.username;
    
    console.log(`\n🧪 使用用戶 ${testUser.name} (${testEmail}) 測試...`);
    
    // 測試密碼更新 API
    const { response, data } = await apiRequest('/api/auth/update-password', {
      method: 'PUT',
      body: { 
        email: testEmail,
        newPassword: 'testPassword123'
      }
    });
    
    if (response && response.ok) {
      console.log('✅ 密碼更新成功！');
      console.log('📨 回應:', data.message);
      
      // 測試登入
      const { response: loginRes, data: loginData } = await apiRequest('/api/auth/login', {
        method: 'POST',
        body: { 
          username: testEmail,
          password: 'testPassword123'
        }
      });
      
      if (loginRes && loginRes.ok) {
        console.log('✅ 新密碼登入成功！');
        console.log('🎉 API 工作正常');
      } else {
        console.log('❌ 新密碼登入失敗:', loginData.error);
      }
      
    } else {
      console.log('❌ 密碼更新失敗:', data.error);
    }
    
  } catch (error) {
    console.error('❌ 測試失敗:', error.message);
  }
}

quickTest(); 