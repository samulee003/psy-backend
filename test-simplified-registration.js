/**
 * 測試簡化註冊流程
 * 驗證新的註冊邏輯是否正確工作
 */

const fetch = require('node-fetch');

const API_BASE = 'http://localhost:5000/api';

/**
 * 測試簡化註冊
 */
async function testSimplifiedRegistration() {
  console.log('\n🧪 === 測試簡化註冊流程 ===\n');
  
  // 測試用例
  const testCases = [
    {
      name: '完整資訊註冊',
      data: {
        name: '測試用戶完整',
        email: 'test-complete@example.com',
        password: '[REDACTED]',
        role: 'patient',
        phone: '12345678'
      },
      expectSuccess: true
    },
    {
      name: '簡化註冊（無姓名）',
      data: {
        email: 'test-simple@example.com',
        password: '[REDACTED]',
        role: 'patient'
      },
      expectSuccess: true,
      expectedName: 'test-simple' // 期望的預設姓名
    },
    {
      name: '簡化註冊（無姓名和電話）',
      data: {
        email: 'test-minimal@example.com',
        password: '[REDACTED]',
        role: 'doctor'
      },
      expectSuccess: true,
      expectedName: 'test-minimal'
    },
    {
      name: '缺少電子郵件（應該失敗）',
      data: {
        password: '[REDACTED]',
        role: 'patient'
      },
      expectSuccess: false
    },
    {
      name: '缺少密碼（應該失敗）',
      data: {
        email: 'test-no-password@example.com',
        role: 'patient'
      },
      expectSuccess: false
    }
  ];
  
  let passedTests = 0;
  let totalTests = testCases.length;
  
  for (const testCase of testCases) {
    console.log(`\n📋 測試: ${testCase.name}`);
    console.log(`請求數據:`, JSON.stringify(testCase.data, null, 2));
    
    try {
      const response = await fetch(`${API_BASE}/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(testCase.data)
      });
      
      const result = await response.json();
      
      console.log(`回應狀態: ${response.status}`);
      console.log(`回應內容:`, JSON.stringify(result, null, 2));
      
      if (testCase.expectSuccess) {
        if (response.status === 201 && result.success) {
          console.log('✅ 測試通過：註冊成功');
          
          // 檢查預設姓名
          if (testCase.expectedName) {
            if (result.user.name === testCase.expectedName) {
              console.log(`✅ 預設姓名正確：${result.user.name}`);
            } else {
              console.log(`❌ 預設姓名錯誤：期望 ${testCase.expectedName}，實際 ${result.user.name}`);
              continue;
            }
          }
          
          // 檢查用戶資料完整性
          if (result.user.id && result.user.email && result.user.role) {
            console.log('✅ 用戶資料完整');
            passedTests++;
          } else {
            console.log('❌ 用戶資料不完整');
          }
        } else {
          console.log(`❌ 測試失敗：期望註冊成功，但收到 ${response.status}`);
        }
      } else {
        if (response.status >= 400 && !result.success) {
          console.log('✅ 測試通過：正確拒絕無效註冊');
          passedTests++;
        } else {
          console.log(`❌ 測試失敗：期望註冊失敗，但收到 ${response.status}`);
        }
      }
      
    } catch (error) {
      console.log(`❌ 測試錯誤: ${error.message}`);
    }
    
    console.log('---');
  }
  
  console.log(`\n📊 測試總結: ${passedTests}/${totalTests} 通過`);
  
  if (passedTests === totalTests) {
    console.log('🎉 所有測試通過！簡化註冊功能正常工作。');
    return true;
  } else {
    console.log('⚠️ 部分測試失敗，需要檢查。');
    return false;
  }
}

/**
 * 測試現有用戶登入功能
 */
async function testExistingUserLogin() {
  console.log('\n🔐 === 測試現有用戶登入 ===\n');
  
  try {
    const response = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: '[REDACTED]@gmail.com',
        password: '[REDACTED]'
      })
    });
    
    const result = await response.json();
    
    console.log(`回應狀態: ${response.status}`);
    console.log(`回應內容:`, JSON.stringify(result, null, 2));
    
    if (response.status === 200 && result.success) {
      console.log('✅ 現有用戶登入功能正常');
      return true;
    } else {
      console.log('❌ 現有用戶登入功能異常');
      return false;
    }
    
  } catch (error) {
    console.log(`❌ 登入測試錯誤: ${error.message}`);
    return false;
  }
}

/**
 * 清理測試數據
 */
async function cleanupTestData() {
  console.log('\n🧹 === 清理測試數據 ===\n');
  
  const testEmails = [
    'test-complete@example.com',
    'test-simple@example.com',
    'test-minimal@example.com'
  ];
  
  const db = require('sqlite3').verbose();
  const database = new db.Database('./database.sqlite');
  
  for (const email of testEmails) {
    await new Promise((resolve) => {
      database.run('DELETE FROM users WHERE email = ?', [email], function(err) {
        if (err) {
          console.log(`⚠️ 清理 ${email} 失敗: ${err.message}`);
        } else if (this.changes > 0) {
          console.log(`✅ 已清理測試用戶: ${email}`);
        }
        resolve();
      });
    });
  }
  
  database.close();
  console.log('🧹 測試數據清理完成');
}

/**
 * 主測試函數
 */
async function runTests() {
  console.log('🚀 開始測試簡化註冊功能...\n');
  
  try {
    // 先清理可能存在的測試數據
    await cleanupTestData();
    
    // 測試現有用戶登入
    const loginTest = await testExistingUserLogin();
    
    // 測試簡化註冊
    const registrationTest = await testSimplifiedRegistration();
    
    // 再次清理測試數據
    await cleanupTestData();
    
    console.log('\n🏁 === 最終結果 ===');
    console.log(`現有登入功能: ${loginTest ? '✅ 正常' : '❌ 異常'}`);
    console.log(`簡化註冊功能: ${registrationTest ? '✅ 正常' : '❌ 異常'}`);
    
    if (loginTest && registrationTest) {
      console.log('\n🎉 所有功能測試通過！註冊流程簡化實施成功。');
      process.exit(0);
    } else {
      console.log('\n⚠️ 發現問題，需要進一步檢查。');
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
  testSimplifiedRegistration,
  testExistingUserLogin,
  cleanupTestData
}; 