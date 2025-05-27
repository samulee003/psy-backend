/**
 * 全面後端檢查腳本
 * 檢查所有關鍵功能是否正常工作
 */

const http = require('http');
const https = require('https');

// 測試配置
const BASE_URL = 'http://localhost:5000';
const tests = [];
let passedTests = 0;
let totalTests = 0;

// 輔助函數：發送 HTTP 請求
function makeRequest(url, method = 'GET', data = null) {
    return new Promise((resolve, reject) => {
        const urlObj = new URL(url);
        const options = {
            hostname: urlObj.hostname,
            port: urlObj.port,
            path: urlObj.pathname + urlObj.search,
            method: method,
            headers: {
                'Content-Type': 'application/json',
            }
        };

        const req = http.request(options, (res) => {
            let responseData = '';
            res.on('data', chunk => responseData += chunk);
            res.on('end', () => {
                try {
                    const jsonData = JSON.parse(responseData);
                    resolve({
                        statusCode: res.statusCode,
                        data: jsonData,
                        headers: res.headers
                    });
                } catch (e) {
                    resolve({
                        statusCode: res.statusCode,
                        data: responseData,
                        headers: res.headers
                    });
                }
            });
        });

        req.on('error', reject);

        if (data) {
            req.write(JSON.stringify(data));
        }
        req.end();
    });
}

// 測試函數
async function runTest(name, testFn) {
    totalTests++;
    console.log(`\n🧪 測試: ${name}`);
    try {
        const result = await testFn();
        if (result) {
            console.log(`✅ 通過: ${name}`);
            passedTests++;
        } else {
            console.log(`❌ 失敗: ${name}`);
        }
    } catch (error) {
        console.log(`❌ 錯誤: ${name} - ${error.message}`);
    }
}

// 測試案例
async function testServerRunning() {
    try {
        const response = await makeRequest(`${BASE_URL}/api/auth/google/config`);
        return response.statusCode === 200;
    } catch (error) {
        console.log(`   伺服器連接失敗: ${error.message}`);
        return false;
    }
}

async function testGoogleOAuthConfig() {
    const response = await makeRequest(`${BASE_URL}/api/auth/google/config`);
    console.log(`   狀態碼: ${response.statusCode}`);
    console.log(`   回應: ${JSON.stringify(response.data, null, 2)}`);
    return response.statusCode === 200 && response.data.success && response.data.configured;
}

async function testGoogleLogin() {
    const response = await makeRequest(`${BASE_URL}/api/auth/google/login`, 'POST', {
        idToken: 'fake-token-for-testing'
    });
    console.log(`   狀態碼: ${response.statusCode}`);
    console.log(`   回應: ${JSON.stringify(response.data, null, 2)}`);
    // 應該返回 401 因為是假的 token
    return response.statusCode === 401 && response.data.error;
}

async function testGoogleRegister() {
    const response = await makeRequest(`${BASE_URL}/api/auth/google/register`, 'POST', {
        idToken: 'fake-token-for-testing',
        role: 'patient'
    });
    console.log(`   狀態碼: ${response.statusCode}`);
    console.log(`   回應: ${JSON.stringify(response.data, null, 2)}`);
    // 應該返回 401 因為是假的 token
    return response.statusCode === 401 && response.data.error;
}

async function testTraditionalRegister() {
    const testEmail = `test-${Date.now()}@example.com`;
    const response = await makeRequest(`${BASE_URL}/api/auth/register`, 'POST', {
        email: testEmail,
        password: 'password123',
        role: 'patient'
    });
    console.log(`   狀態碼: ${response.statusCode}`);
    console.log(`   回應: ${JSON.stringify(response.data, null, 2)}`);
    return response.statusCode === 200 && response.data.success;
}

async function testTraditionalLogin() {
    const response = await makeRequest(`${BASE_URL}/api/auth/login`, 'POST', {
        email: 'doctor@example.com',
        password: 'password123'
    });
    console.log(`   狀態碼: ${response.statusCode}`);
    console.log(`   回應: ${JSON.stringify(response.data, null, 2)}`);
    return response.statusCode === 200 && response.data.success;
}

async function testErrorHandling() {
    const response = await makeRequest(`${BASE_URL}/api/auth/register`, 'POST', {
        // 缺少必填欄位
        email: 'invalid-email'
    });
    console.log(`   狀態碼: ${response.statusCode}`);
    console.log(`   回應: ${JSON.stringify(response.data, null, 2)}`);
    return response.statusCode === 400 && response.data.error;
}

async function testCORS() {
    const response = await makeRequest(`${BASE_URL}/api/auth/google/config`);
    console.log(`   CORS Headers: ${JSON.stringify(response.headers, null, 2)}`);
    return response.headers['access-control-allow-origin'] !== undefined;
}

// 主測試函數
async function runAllTests() {
    console.log('🚀 開始全面後端檢查...\n');
    console.log('='.repeat(50));

    await runTest('伺服器運行狀態', testServerRunning);
    await runTest('Google OAuth 配置', testGoogleOAuthConfig);
    await runTest('Google 登入端點', testGoogleLogin);
    await runTest('Google 註冊端點', testGoogleRegister);
    await runTest('傳統註冊功能', testTraditionalRegister);
    await runTest('傳統登入功能', testTraditionalLogin);
    await runTest('錯誤處理機制', testErrorHandling);
    await runTest('CORS 配置', testCORS);

    console.log('\n' + '='.repeat(50));
    console.log(`🏁 測試完成: ${passedTests}/${totalTests} 通過`);
    
    if (passedTests === totalTests) {
        console.log('🎉 所有測試通過！後端功能正常');
    } else {
        console.log('⚠️  部分測試失敗，需要檢查相關功能');
    }
}

// 執行測試
runAllTests().catch(console.error); 