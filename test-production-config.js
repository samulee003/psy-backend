require('dotenv').config();

console.log('🔍 生產環境 Google OAuth 配置測試\\n');

async function testProductionConfig() {
    console.log('=== 1. 環境變數驗證 ===');
    
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const nodeEnv = process.env.NODE_ENV;
    
    console.log(`NODE_ENV: ${nodeEnv}`);
    console.log(`Client ID: ${clientId}`);
    console.log(`Client Secret: ${clientSecret ? '已設置' : '未設置'}`);
    
    console.log('\\n=== 2. 模擬 API 端點回應 ===');
    
    // 模擬 /api/auth/google/config 端點
    const configResponse = {
        success: true,
        configured: !!clientId && !!clientSecret,
        details: {
            hasClientId: !!clientId,
            hasClientSecret: !!clientSecret,
            clientId: clientId
        }
    };
    
    console.log('API 回應:');
    console.log(JSON.stringify(configResponse, null, 2));
    
    console.log('\\n=== 3. Google Cloud Console 檢查清單 ===');
    console.log('請確認以下配置：');
    console.log('');
    console.log('📋 OAuth 2.0 客戶端設置：');
    console.log('1. 應用程式類型：Web 應用程式');
    console.log('2. 名稱：心理治療預約系統（或您的應用名稱）');
    console.log('');
    console.log('🌐 授權 JavaScript 來源：');
    console.log('   https://您的前端網域.zeabur.app');
    console.log('   https://therapy-booking.zeabur.app (如果這是您的前端網域)');
    console.log('');
    console.log('🔗 授權重定向 URI：');
    console.log('   https://您的前端網域.zeabur.app');
    console.log('   https://您的前端網域.zeabur.app/auth/callback');
    console.log('   https://您的前端網域.zeabur.app/login');
    console.log('');
    console.log('⚙️ OAuth 同意畫面：');
    console.log('   - 狀態：已發布（不是測試模式）');
    console.log('   - 用戶類型：外部');
    console.log('   - 範圍：email, profile, openid');
    
    console.log('\\n=== 4. 常見問題排除 ===');
    console.log('');
    console.log('❌ 如果仍然出現 missing_client_id：');
    console.log('1. 檢查前端是否正確調用 /api/auth/google/config');
    console.log('2. 檢查前端網域是否在 Google Cloud Console 中配置');
    console.log('3. 確認 OAuth 同意畫面已發布');
    console.log('4. 檢查瀏覽器是否阻擋了第三方 cookies');
    console.log('');
    console.log('🔧 調試步驟：');
    console.log('1. 在瀏覽器中直接訪問：');
    console.log('   https://您的後端網域.zeabur.app/api/auth/google/config');
    console.log('2. 檢查回應是否包含正確的 clientId');
    console.log('3. 在前端開發者工具中檢查 Network 標籤');
    console.log('4. 查看是否有 CORS 錯誤或其他網路錯誤');
    
    console.log('\\n=== 5. 下一步行動 ===');
    console.log('');
    console.log('🎯 立即檢查：');
    console.log('1. Google Cloud Console 的授權網域配置');
    console.log('2. 前端是否能成功調用後端 API');
    console.log('3. 瀏覽器控制台是否有其他錯誤訊息');
    
    console.log('\\n📞 如需協助，請提供：');
    console.log('- 您的前端網域名稱');
    console.log('- Google Cloud Console 的授權設置截圖');
    console.log('- 瀏覽器 Network 標籤的 API 調用結果');
}

testProductionConfig().catch(console.error); 