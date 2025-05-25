/**
 * 測試 Google OAuth 2.0 功能
 * 驗證新的 Google 認證端點是否正確工作
 */

const fetch = require('node-fetch');

const API_BASE = 'http://localhost:5000/api';

/**
 * 測試 Google OAuth 配置檢查
 */
async function testGoogleOAuthConfig() {
  console.log('\n🔧 === 測試 Google OAuth 配置檢查 ===\n');
  
  try {
    const response = await fetch(`${API_BASE}/auth/google/config`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    const result = await response.json();
    
    console.log(`回應狀態: ${response.status}`);
    console.log(`回應內容:`, JSON.stringify(result, null, 2));
    
    if (response.status === 200 && result.success) {
      if (result.configured) {
        console.log('✅ Google OAuth 已正確配置');
      } else {
        console.log('⚠️ Google OAuth 尚未配置（預期情況，因為使用測試值）');
      }
      return true;
    } else {
      console.log('❌ Google OAuth 配置檢查失敗');
      return false;
    }
    
  } catch (error) {
    console.log(`❌ 配置檢查錯誤: ${error.message}`);
    return false;
  }
}

/**
 * 測試 Google 登入端點（使用無效 token）
 */
async function testGoogleLogin() {
  console.log('\n🔐 === 測試 Google 登入端點 ===\n');
  
  try {
    // 使用假的 token 測試端點邏輯
    const response = await fetch(`${API_BASE}/auth/google/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        idToken: 'fake-google-id-token-for-testing'
      })
    });
    
    const result = await response.json();
    
    console.log(`回應狀態: ${response.status}`);
    console.log(`回應內容:`, JSON.stringify(result, null, 2));
    
    // 預期這會失敗，因為我們使用的是假 token
    if (response.status === 401 && !result.success) {
      console.log('✅ Google 登入端點正確處理無效 token（預期行為）');
      return true;
    } else if (response.status === 500 && result.error.includes('Google OAuth 配置不完整')) {
      console.log('✅ Google 登入端點正確檢測到配置問題（預期行為）');
      return true;
    } else {
      console.log('❌ Google 登入端點行為異常');
      return false;
    }
    
  } catch (error) {
    console.log(`❌ Google 登入測試錯誤: ${error.message}`);
    return false;
  }
}

/**
 * 測試 Google 註冊端點（使用無效 token）
 */
async function testGoogleRegister() {
  console.log('\n📝 === 測試 Google 註冊端點 ===\n');
  
  try {
    const response = await fetch(`${API_BASE}/auth/google/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        idToken: 'fake-google-id-token-for-testing',
        role: 'patient'
      })
    });
    
    const result = await response.json();
    
    console.log(`回應狀態: ${response.status}`);
    console.log(`回應內容:`, JSON.stringify(result, null, 2));
    
    // 預期這會失敗，因為我們使用的是假 token
    if (response.status === 401 && !result.success) {
      console.log('✅ Google 註冊端點正確處理無效 token（預期行為）');
      return true;
    } else if (response.status === 500 && result.error.includes('Google OAuth 配置不完整')) {
      console.log('✅ Google 註冊端點正確檢測到配置問題（預期行為）');
      return true;
    } else {
      console.log('❌ Google 註冊端點行為異常');
      return false;
    }
    
  } catch (error) {
    console.log(`❌ Google 註冊測試錯誤: ${error.message}`);
    return false;
  }
}

/**
 * 測試缺少參數的錯誤處理
 */
async function testErrorHandling() {
  console.log('\n❌ === 測試錯誤處理 ===\n');
  
  const testCases = [
    {
      name: '缺少 idToken - Google 登入',
      endpoint: '/auth/google/login',
      data: {},
      expectedStatus: 400
    },
    {
      name: '缺少 idToken - Google 註冊',
      endpoint: '/auth/google/register',
      data: { role: 'patient' },
      expectedStatus: 400
    },
    {
      name: '無效角色 - Google 註冊',
      endpoint: '/auth/google/register',
      data: { idToken: 'fake-token', role: 'invalid-role' },
      expectedStatus: 400
    }
  ];
  
  let passed = 0;
  
  for (const testCase of testCases) {
    console.log(`\n📋 測試: ${testCase.name}`);
    
    try {
      const response = await fetch(`${API_BASE}${testCase.endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(testCase.data)
      });
      
      const result = await response.json();
      
      console.log(`期望狀態: ${testCase.expectedStatus}, 實際狀態: ${response.status}`);
      
      if (response.status === testCase.expectedStatus && !result.success) {
        console.log('✅ 測試通過：正確處理錯誤');
        passed++;
      } else {
        console.log('❌ 測試失敗：錯誤處理異常');
        console.log('回應:', JSON.stringify(result, null, 2));
      }
      
    } catch (error) {
      console.log(`❌ 測試錯誤: ${error.message}`);
    }
  }
  
  console.log(`\n📊 錯誤處理測試結果: ${passed}/${testCases.length} 通過`);
  return passed === testCases.length;
}

/**
 * 主測試函數
 */
async function runTests() {
  console.log('🚀 開始測試 Google OAuth 2.0 功能...\n');
  
  try {
    const results = [];
    
    // 測試配置檢查
    results.push(await testGoogleOAuthConfig());
    
    // 測試 Google 登入
    results.push(await testGoogleLogin());
    
    // 測試 Google 註冊
    results.push(await testGoogleRegister());
    
    // 測試錯誤處理
    results.push(await testErrorHandling());
    
    const passed = results.filter(Boolean).length;
    const total = results.length;
    
    console.log('\n🏁 === 最終結果 ===');
    console.log(`通過測試: ${passed}/${total}`);
    
    if (passed === total) {
      console.log('\n🎉 所有 Google OAuth 端點測試通過！');
      console.log('📝 注意：實際 Google 認證需要有效的 Google Client ID 和 Secret');
      console.log('📚 請參考 env.example 文件配置真實的 Google OAuth 憑證');
      process.exit(0);
    } else {
      console.log('\n⚠️ 部分測試失敗，需要檢查。');
      process.exit(1);
    }
    
  } catch (error) {
    console.error('測試過程中發生錯誤:', error.message);
    process.exit(1);
  }
}

// 運行測試
if (require.main === module) {
  runTests();
}

module.exports = {
  testGoogleOAuthConfig,
  testGoogleLogin,
  testGoogleRegister,
  testErrorHandling
}; 