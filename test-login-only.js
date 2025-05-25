/**
 * 測試登入功能
 */

const fetch = require('node-fetch');

const API_BASE = 'http://localhost:5000/api';

async function testLogin() {
  console.log('🔐 測試登入功能...\n');
  
  // 先註冊一個測試用戶
  console.log('📝 創建測試用戶...');
  const registerResponse = await fetch(`${API_BASE}/auth/register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      email: 'login-test@example.com',
      password: 'password123',
      role: 'patient'
    })
  });
  
  const registerResult = await registerResponse.json();
  console.log('註冊結果:', registerResult.success ? '✅ 成功' : '❌ 失敗');
  
  if (!registerResult.success) {
    console.log('註冊失敗，無法測試登入');
    return;
  }
  
  // 測試登入
  console.log('\n🔑 測試登入...');
  const loginResponse = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      email: 'login-test@example.com',
      password: 'password123'
    })
  });
  
  const loginResult = await loginResponse.json();
  console.log('登入狀態:', loginResponse.status);
  console.log('登入結果:', JSON.stringify(loginResult, null, 2));
  
  if (loginResult.success) {
    console.log('✅ 登入功能正常工作');
  } else {
    console.log('❌ 登入功能異常');
  }
  
  // 清理測試用戶
  const db = require('sqlite3').verbose();
  const database = new db.Database('./database.sqlite');
  
  database.run('DELETE FROM users WHERE email = ?', ['login-test@example.com'], function(err) {
    if (err) {
      console.log('⚠️ 清理測試用戶失敗:', err.message);
    } else {
      console.log('🧹 測試用戶已清理');
    }
    database.close();
  });
}

testLogin().catch(console.error); 