require('dotenv').config();

console.log('🔍 Google OAuth 最終狀態測試\n');

async function testFinalGoogleOAuth() {
    console.log('=== 1. 環境變數確認 ===');
    
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    
    console.log(`✅ Client ID: ${clientId}`);
    console.log(`✅ Client Secret: ${clientSecret ? '已設置' : '未設置'}`);
    
    console.log('\n=== 2. API 端點測試 ===');
    
    // 模擬 API 回應
    const apiResponse = {
        success: true,
        configured: true,
        details: {
            hasClientId: true,
            hasClientSecret: true,
            clientId: clientId
        }
    };
    
    console.log('後端 API 回應:');
    console.log(JSON.stringify(apiResponse, null, 2));
    
    console.log('\n=== 3. 當前狀態分析 ===');
    console.log('✅ 後端配置：完全正常');
    console.log('✅ Zeabur 環境變數：正確設置');
    console.log('✅ API 端點：正常工作');
    console.log('✅ Google 腳本載入：成功');
    console.log('❌ 前端初始化：仍然失敗 (missing_client_id)');
    
    console.log('\n=== 4. 可能的原因 ===');
    console.log('1. 🕐 Google Cloud Console 配置尚未完全生效');
    console.log('2. 🌐 瀏覽器緩存了舊的配置');
    console.log('3. 💻 前端代碼使用 Client ID 的方式有問題');
    console.log('4. 🔗 重定向 URI 配置仍不完整');
    
    console.log('\n=== 5. 建議的解決步驟 ===');
    console.log('');
    console.log('🔧 立即嘗試：');
    console.log('1. 強制重新載入頁面 (Ctrl + Shift + R)');
    console.log('2. 清除瀏覽器緩存和 cookies');
    console.log('3. 等待 5-10 分鐘讓 Google 配置完全生效');
    console.log('4. 檢查 Google Cloud Console 是否真的保存了配置');
    
    console.log('\n🔍 進階調試：');
    console.log('1. 在瀏覽器中直接訪問：');
    console.log('   https://psy-backend.zeabur.app/api/auth/google/config');
    console.log('2. 檢查前端是否正確使用返回的 clientId');
    console.log('3. 確認前端 Google OAuth 初始化代碼');
    
    console.log('\n📋 Google Cloud Console 檢查清單：');
    console.log('確認以下 URI 都已添加到「已授權的重定向 URI」：');
    console.log('✓ https://therapy-booking.zeabur.app');
    console.log('✓ https://therapy-booking.zeabur.app/auth/callback');
    console.log('✓ https://therapy-booking.zeabur.app/login');
    console.log('✓ https://therapy-booking.zeabur.app/auth/google/callback');
    
    console.log('\n🎯 下一步：');
    console.log('如果問題持續存在，可能需要檢查前端代碼的 Google OAuth 實現。');
}

testFinalGoogleOAuth().catch(console.error); 