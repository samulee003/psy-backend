const axios = require('axios');

async function testLogin() {
    try {
        console.log('🔐 測試登入 API...');
        
        const response = await axios.post('http://localhost:5000/api/auth/login', {
            email: 'abcdef2012cn@gmail.com',
            password: 'abc123'
        });
        
        console.log('✅ 登入成功!');
        console.log('📊 回應:', response.data);
        
        if (response.data.token) {
            console.log('🎫 Token 獲取成功');
            return response.data.token;
        } else {
            console.log('❌ 沒有收到 token');
            return null;
        }
        
    } catch (error) {
        console.log('❌ 登入失敗:', error.message);
        if (error.response) {
            console.log('   狀態碼:', error.response.status);
            console.log('   錯誤資料:', error.response.data);
        }
        return null;
    }
}

testLogin(); 