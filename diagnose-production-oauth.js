require('dotenv').config();

console.log('🔍 生產環境 Google OAuth 診斷工具\n');

async function diagnoseProductionOAuth() {
    console.log('=== 生產環境配置檢查 ===');
    
    // 檢查環境變數
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const jwtSecret = process.env.JWT_SECRET;
    const nodeEnv = process.env.NODE_ENV;
    
    console.log(`NODE_ENV: ${nodeEnv || '未設置'}`);
    console.log(`Client ID: ${clientId ? '✅ 已設置 (' + clientId.substring(0, 20) + '...)' : '❌ 未設置'}`);
    console.log(`Client Secret: ${clientSecret ? '✅ 已設置' : '❌ 未設置'}`);
    console.log(`JWT Secret: ${jwtSecret ? '✅ 已設置' : '❌ 未設置'}`);
    
    if (!clientId || !clientSecret) {
        console.log('\n❌ 關鍵問題：Google OAuth 憑證在生產環境中未設置！');
        console.log('\n🚀 解決步驟：');
        console.log('1. 登入 Zeabur 控制台');
        console.log('2. 進入您的項目設置');
        console.log('3. 在環境變數區域添加：');
        console.log('   GOOGLE_CLIENT_ID=18566096794-vmvdqvt1k5f3bl40fm7u7c9plk7jq767.apps.googleusercontent.com');
        console.log('   GOOGLE_CLIENT_SECRET=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');
        console.log('4. 重新部署應用');
        return;
    }
    
    console.log('\n=== Google Cloud Console 檢查清單 ===');
    console.log('請確認以下配置：');
    console.log('1. 🌐 授權重定向 URI 包含生產網域');
    console.log('2. 🏗️ OAuth 同意畫面已發布（不是測試模式）');
    console.log('3. 🔐 憑證狀態為啟用');
    console.log('4. 📱 應用類型設置為 "Web 應用程式"');
    
    console.log('\n=== 常見生產環境問題 ===');
    console.log('❌ 問題：missing_client_id');
    console.log('✅ 原因：前端無法獲取 Client ID');
    console.log('🔧 解決：確保 /api/auth/google/config 端點返回正確的 Client ID');
    
    console.log('\n=== 測試生產環境 API ===');
    
    // 模擬 API 回應
    const mockApiResponse = {
        success: true,
        configured: !!clientId && !!clientSecret,
        details: {
            hasClientId: !!clientId,
            hasClientSecret: !!clientSecret,
            clientId: clientId ? clientId.substring(0, 20) + '...' : null
        }
    };
    
    console.log('模擬 /api/auth/google/config 回應：');
    console.log(JSON.stringify(mockApiResponse, null, 2));
    
    if (mockApiResponse.configured) {
        console.log('\n✅ 配置看起來正確！');
        console.log('如果仍有問題，請檢查：');
        console.log('1. 前端是否正確調用 API');
        console.log('2. CORS 設置是否允許生產網域');
        console.log('3. Google Cloud Console 的網域配置');
    }
    
    console.log('\n=== Zeabur 部署檢查 ===');
    console.log('確認以下步驟：');
    console.log('1. 環境變數已在 Zeabur 控制台設置');
    console.log('2. 應用已重新部署');
    console.log('3. 日誌中沒有環境變數載入錯誤');
    console.log('4. .env 文件不應該被部署到生產環境');
    
    console.log('\n📋 下一步行動：');
    console.log('1. 設置 Zeabur 環境變數');
    console.log('2. 重新部署應用');
    console.log('3. 檢查生產環境日誌');
    console.log('4. 測試 Google OAuth 功能');
}

// 執行診斷
diagnoseProductionOAuth().catch(console.error); 