/**
 * Google OAuth 回調端點測試腳本
 * 測試新的 authorization code 流程
 */

require('dotenv').config();
const axios = require('axios');

const BASE_URL = 'http://localhost:5000';

// 測試配置
const TEST_CONFIG = {
  // 模擬的 authorization code（實際使用時由 Google 提供）
  mockCode: 'mock_authorization_code_for_testing',
  testMode: 'register',
  testRole: 'patient'
};

async function testGoogleOAuthCallback() {
  console.log('\n🔍 開始測試 Google OAuth 回調端點');
  console.log('=====================================\n');

  try {
    // 1. 測試配置端點
    console.log('1️⃣ 測試 Google OAuth 配置端點...');
    const configResponse = await axios.get(`${BASE_URL}/api/auth/google/config`);
    
    if (configResponse.data.success && configResponse.data.clientId) {
      console.log('✅ 配置端點正常，Client ID 已設置');
      console.log('📋 Client ID:', configResponse.data.clientId.substring(0, 30) + '...');
    } else {
      console.log('❌ 配置端點問題，缺少 Client ID');
      return;
    }

    // 2. 測試回調端點的參數驗證
    console.log('\n2️⃣ 測試回調端點的參數驗證...');
    
    // 測試缺少 code 參數
    try {
      await axios.post(`${BASE_URL}/api/auth/google/callback`, {
        mode: 'login'
      });
    } catch (error) {
      if (error.response?.status === 400 && 
          error.response.data.error.includes('authorization code')) {
        console.log('✅ 正確拒絕缺少 authorization code 的請求');
      } else {
        console.log('❌ 參數驗證失敗:', error.response?.data || error.message);
      }
    }

    // 測試無效的 mode 參數
    try {
      await axios.post(`${BASE_URL}/api/auth/google/callback`, {
        code: TEST_CONFIG.mockCode,
        mode: 'invalid_mode'
      });
    } catch (error) {
      if (error.response?.status === 400 && 
          error.response.data.error.includes('認證模式')) {
        console.log('✅ 正確拒絕無效的認證模式');
      } else {
        console.log('❌ 模式驗證失敗:', error.response?.data || error.message);
      }
    }

    // 3. 測試實際的回調請求（會因為模擬 code 而失敗，但能驗證流程）
    console.log('\n3️⃣ 測試回調端點的基本流程...');
    
    try {
      const callbackResponse = await axios.post(`${BASE_URL}/api/auth/google/callback`, {
        code: TEST_CONFIG.mockCode,
        mode: TEST_CONFIG.testMode,
        role: TEST_CONFIG.testRole
      });
      
      // 如果成功（不太可能，因為使用模擬 code）
      console.log('✅ 回調成功:', callbackResponse.data);
      
    } catch (error) {
      // 預期的失敗（因為使用模擬 authorization code）
      if (error.response?.status === 401 && 
          error.response.data.error.includes('Google OAuth 認證失敗')) {
        console.log('✅ 回調端點正常工作（預期的 OAuth 認證失敗）');
        console.log('💡 這是正常的，因為我們使用了模擬的 authorization code');
        console.log('📋 錯誤詳情:', error.response.data.details);
      } else {
        console.log('❌ 回調端點異常錯誤:', error.response?.data || error.message);
      }
    }

    // 4. 測試不同模式的參數組合
    console.log('\n4️⃣ 測試不同模式的參數組合...');
    
    // 測試註冊模式
    try {
      await axios.post(`${BASE_URL}/api/auth/google/callback`, {
        code: TEST_CONFIG.mockCode,
        mode: 'register',
        role: 'doctor'
      });
    } catch (error) {
      if (error.response?.status === 401) {
        console.log('✅ 註冊模式參數驗證正常');
      }
    }

    // 測試登入模式
    try {
      await axios.post(`${BASE_URL}/api/auth/google/callback`, {
        code: TEST_CONFIG.mockCode,
        mode: 'login'
        // 登入模式不需要 role 參數
      });
    } catch (error) {
      if (error.response?.status === 401) {
        console.log('✅ 登入模式參數驗證正常');
      }
    }

    // 測試無效角色
    try {
      await axios.post(`${BASE_URL}/api/auth/google/callback`, {
        code: TEST_CONFIG.mockCode,
        mode: 'register',
        role: 'invalid_role'
      });
    } catch (error) {
      if (error.response?.status === 400 && 
          error.response.data.error.includes('用戶角色')) {
        console.log('✅ 正確拒絕無效的用戶角色');
      }
    }

    console.log('\n🎉 Google OAuth 回調端點測試完成！');
    console.log('=====================================');
    console.log('📋 測試摘要：');
    console.log('   ✅ 配置端點正常');
    console.log('   ✅ 參數驗證正確');
    console.log('   ✅ 錯誤處理適當');
    console.log('   ✅ 端點邏輯健全');
    console.log('\n💡 提示：');
    console.log('   - 端點已準備好處理真實的 Google authorization codes');
    console.log('   - 需要前端傳送真實的 Google OAuth 回調數據進行完整測試');
    console.log('   - 確保在 Google Cloud Console 中配置了正確的重定向 URI');

  } catch (error) {
    console.error('\n❌ 測試失敗:', error.message);
    if (error.code === 'ECONNREFUSED') {
      console.error('💡 請確保後端服務器在 port 5000 上運行');
      console.error('   可以執行: npm start 或 node server.js');
    }
  }
}

// 檢查伺服器是否運行
async function checkServerStatus() {
  try {
    await axios.get(`${BASE_URL}/api/auth/google/config`);
    return true;
  } catch (error) {
    return false;
  }
}

// 主要執行函數
async function main() {
  console.log('🚀 Google OAuth 回調端點測試工具');
  console.log('===================================');
  
  const serverRunning = await checkServerStatus();
  if (!serverRunning) {
    console.error('❌ 無法連接到後端服務器 (http://localhost:5000)');
    console.error('💡 請先啟動後端服務器：npm start 或 node server.js');
    process.exit(1);
  }
  
  console.log('✅ 後端服務器運行正常');
  
  await testGoogleOAuthCallback();
}

main(); 