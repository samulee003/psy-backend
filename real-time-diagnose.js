const axios = require('axios');

const BASE_URL = 'http://localhost:5000';

// 使用真實用戶李昇恆
const REAL_USER = {
  email: 'samu003@gmail.com',
  password: 'sam003'
};

async function realTimeDiagnose() {
  try {
    console.log('🔍 即時診斷前端問題...\n');
    
    // 1. 登入
    console.log('1️⃣ 用戶登入...');
    const loginResponse = await axios.post(`${BASE_URL}/api/auth/login`, REAL_USER);
    if (!loginResponse.data.success) {
      console.log('❌ 登入失敗:', loginResponse.data.error);
      return;
    }
    
    const token = loginResponse.data.token;
    const user = loginResponse.data.user;
    const headers = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
    console.log('✅ 登入成功:', user.name, `(ID: ${user.id})`);
    
    // 2. 模擬前端完整流程
    console.log('\n2️⃣ 獲取醫生列表...');
    const doctorsResponse = await axios.get(`${BASE_URL}/api/users/doctors`, { headers });
    console.log('✅ 醫生API正常');
    
    // 3. 模擬用戶在前端頁面點擊時間段的情況
    console.log('\n3️⃣ 模擬用戶點擊 2025年7月2日 14:00 時間段...');
    
    // 這是根據你的錯誤日誌重現的請求
    const frontendRequest = {
      doctorId: '4', // 前端可能發送字串
      patientId: 3,
      appointmentDate: '2025-07-02',
      timeSlot: '14:00',
      reason: '', // 可能是空字串
      notes: '', // 可能是空字串
      isNewPatient: true, // 前端勾選初診
      patientInfo: {
        name: '假的', // 用戶輸入的假名
        phone: '62998036',
        email: 'samu003@gmail.com',
        gender: '',
        birthDate: ''
      }
    };
    
    console.log('📋 前端發送的請求數據:');
    console.log(JSON.stringify(frontendRequest, null, 2));
    
    try {
      const appointmentResponse = await axios.post(`${BASE_URL}/api/appointments`, frontendRequest, { 
        headers,
        timeout: 10000 // 10秒超時
      });
      
      console.log('✅ 預約創建成功');
      console.log('📊 回應:', appointmentResponse.data);
      
    } catch (error) {
      console.log('❌ 預約創建失敗');
      console.log('📊 錯誤狀態:', error.response?.status);
      console.log('📊 錯誤數據:', error.response?.data);
      console.log('📊 錯誤訊息:', error.message);
      
      // 詳細分析
      if (error.code === 'ECONNRESET') {
        console.log('⚠️ 連接重置錯誤 - 可能是服務器重啟或連接問題');
      } else if (error.code === 'ETIMEDOUT') {
        console.log('⚠️ 請求超時 - 可能是服務器響應緩慢');
      } else if (error.response?.status === 500) {
        console.log('⚠️ 500內部服務器錯誤 - 檢查服務器日誌');
      }
    }
    
    // 4. 再次測試獲取預約列表
    console.log('\n4️⃣ 測試獲取預約列表...');
    try {
      const myAppointments = await axios.get(`${BASE_URL}/api/appointments/my`, { headers });
      console.log('✅ 獲取預約列表成功');
      console.log('📊 預約數量:', myAppointments.data.appointments.length);
    } catch (error) {
      console.log('❌ 獲取預約列表失敗:', error.response?.status);
    }
    
    // 5. 檢查服務器狀態
    console.log('\n5️⃣ 檢查服務器狀態...');
    try {
      const healthCheck = await axios.get(`${BASE_URL}/api/health`, { 
        headers,
        timeout: 5000 
      });
      console.log('✅ 服務器健康檢查通過');
    } catch (error) {
      console.log('❌ 服務器健康檢查失敗:', error.message);
      console.log('可能原因：服務器未運行或無健康檢查端點');
    }
    
  } catch (error) {
    console.error('❌ 診斷過程錯誤:', error.message);
  }
}

// 執行診斷
if (require.main === module) {
  console.log('開始即時診斷...');
  realTimeDiagnose()
    .then(() => {
      console.log('\n🎉 診斷完成');
    })
    .catch(error => {
      console.error('\n❌ 診斷失敗:', error.message);
    });
}

module.exports = { realTimeDiagnose }; 