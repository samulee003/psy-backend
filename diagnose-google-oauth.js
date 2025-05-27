const https = require('https');
const { OAuth2Client } = require('google-auth-library');
require('dotenv').config();

console.log('🔍 Google OAuth 連接診斷工具\n');

async function diagnoseGoogleOAuth() {
    console.log('=== 1. 環境變數檢查 ===');
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    
    console.log(`Client ID: ${clientId ? clientId.substring(0, 20) + '...' : '❌ 未設置'}`);
    console.log(`Client Secret: ${clientSecret ? '✅ 已設置' : '❌ 未設置'}`);
    
    if (!clientId || !clientSecret) {
        console.log('❌ Google OAuth 憑證未正確配置');
        return;
    }
    
    console.log('\n=== 2. Google APIs 連接測試 ===');
    
    // 測試 Google OAuth2 服務連接
    try {
        console.log('📡 測試 Google OAuth2 服務連接...');
        const client = new OAuth2Client(clientId, clientSecret);
        
        // 嘗試獲取 token info（這會測試網路連接）
        const testUrl = 'https://oauth2.googleapis.com/tokeninfo';
        
        await new Promise((resolve, reject) => {
            const req = https.get(testUrl + '?access_token=test', (res) => {
                console.log(`✅ Google OAuth2 服務可達，狀態碼: ${res.statusCode}`);
                resolve();
            });
            
            req.on('error', (error) => {
                console.log(`❌ 無法連接到 Google OAuth2 服務: ${error.message}`);
                reject(error);
            });
            
            req.setTimeout(5000, () => {
                console.log('❌ 連接 Google OAuth2 服務超時');
                req.destroy();
                reject(new Error('Timeout'));
            });
        });
        
    } catch (error) {
        console.log(`❌ Google OAuth2 服務連接失敗: ${error.message}`);
    }
    
    console.log('\n=== 3. Client ID 格式驗證 ===');
    
    // 檢查 Client ID 格式
    const clientIdPattern = /^\d+-[a-z0-9]+\.apps\.googleusercontent\.com$/;
    if (clientIdPattern.test(clientId)) {
        console.log('✅ Client ID 格式正確');
    } else {
        console.log('❌ Client ID 格式不正確');
        console.log('   正確格式應為: 123456789-abcdef.apps.googleusercontent.com');
    }
    
    console.log('\n=== 4. 本地伺服器測試 ===');
    
    // 測試本地 API 端點
    try {
        const response = await fetch('http://localhost:5000/api/auth/google/config');
        const data = await response.json();
        
        if (data.success) {
            console.log('✅ 本地 Google OAuth 配置端點正常');
        } else {
            console.log('❌ 本地 Google OAuth 配置端點異常');
        }
    } catch (error) {
        console.log(`❌ 無法連接到本地伺服器: ${error.message}`);
        console.log('   請確保伺服器正在運行 (npm start)');
    }
    
    console.log('\n=== 5. 常見問題檢查 ===');
    
    // 檢查常見配置問題
    console.log('📋 常見問題檢查清單:');
    
    // 檢查 .env 文件編碼
    const fs = require('fs');
    try {
        const envContent = fs.readFileSync('.env', 'utf8');
        if (envContent.includes('GOOGLE_CLIENT_ID')) {
            console.log('✅ .env 文件存在且包含 Google 配置');
        } else {
            console.log('❌ .env 文件不包含 Google 配置');
        }
    } catch (error) {
        console.log('❌ .env 文件不存在或無法讀取');
        console.log('   請從 env.example 複製並配置 .env 文件');
    }
    
    console.log('\n=== 6. 解決建議 ===');
    console.log('如果遇到連接問題，請檢查:');
    console.log('1. 🌐 網路連接是否正常');
    console.log('2. 🔐 Google Cloud Console 中的 OAuth 2.0 憑證是否正確');
    console.log('3. 🏗️ OAuth 同意畫面是否已配置');
    console.log('4. 🔗 授權重定向 URI 是否包含您的網域');
    console.log('5. 🚫 防火牆是否阻擋了 Google APIs 的連接');
    console.log('6. 📱 如果是前端問題，檢查 CORS 設置');
    
    console.log('\n📞 如需進一步協助，請提供:');
    console.log('- 具體的錯誤訊息');
    console.log('- 瀏覽器開發者工具的 Network 標籤截圖');
    console.log('- 是否在本地開發環境或生產環境');
}

// 執行診斷
diagnoseGoogleOAuth().catch(console.error); 