const axios = require('axios');

const BASE_URL = 'http://localhost:5000';

// 測試多個用戶憑證
const TEST_USERS = [
  { email: 'abc@gmail.com', password: 'test123' },
  { email: 'abc@gmail.com', password: '[REDACTED]' },
  { email: 'test-new-patient@example.com', password: 'test123' },
  { email: 'test@gmail.com', password: 'test123' }
];

async function testAppointmentCreation() {
  console.log('🔍 測試預約創建功能...\n');
  
  let token, user, headers;
  
  // 嘗試不同用戶登入
  for (const testUser of TEST_USERS) {
    console.log(`📝 嘗試登入: ${testUser.email}`);
    try {
      const loginResponse = await axios.post(`${BASE_URL}/api/auth/login`, testUser);
      if (loginResponse.data.success) {
        token = loginResponse.data.token;
        user = loginResponse.data.user;
        headers = {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        };
        console.log(`✅ 登入成功: ${user.name} (ID: ${user.id})`);
        break;
      }
    } catch (error) {
      console.log(`❌ 登入失敗: ${testUser.email}`);
    }
  }
  
  if (!token) {
    console.log('❌ 無法登入任何測試用戶');
    return;
  }
  
  // 獲取醫生列表
  console.log('\n📋 獲取醫生列表...');
  let doctorId;
  try {
    const doctorsResponse = await axios.get(`${BASE_URL}/api/users/doctors`, { headers });
    console.log('醫生 API 回應:', doctorsResponse.data);
    if (doctorsResponse.data.success && doctorsResponse.data.doctors && doctorsResponse.data.doctors.length > 0) {
      const doctors = doctorsResponse.data.doctors;
      doctorId = doctors[0].id;
      console.log(`✅ 找到醫生: ${doctors[0].name || doctors[0].email} (ID: ${doctorId})`);
    } else {
      console.log('❌ 醫生列表為空或 API 回應錯誤');
      console.log('完整回應:', JSON.stringify(doctorsResponse.data, null, 2));
      // 嘗試手動設置醫生 ID（基於之前的檢查結果）
      console.log('🔄 嘗試使用已知的醫生 ID...');
      doctorId = 4; // 惠筠心理治療師
      console.log(`使用醫生 ID: ${doctorId}`);
    }
  } catch (error) {
    console.log('❌ 無法獲取醫生列表:', error.response?.data || error.message);
    console.log('錯誤狀態碼:', error.response?.status);
    
    // 嘗試手動設置醫生 ID（基於之前的檢查結果）
    console.log('🔄 嘗試使用已知的醫生 ID...');
    doctorId = 4; // 惠筠心理治療師
    console.log(`使用醫生 ID: ${doctorId}`);
  }
  
  // 創建測試預約
  console.log('\n🏥 創建測試預約...');
  const appointment = {
    doctorId: doctorId,
    patientId: user.id,
    appointmentDate: '2025-07-20',
    timeSlot: '10:00',
    reason: 'Bug 診斷測試',
    notes: '測試預約創建',
    isNewPatient: true,
    patientInfo: {
      name: 'Bug 測試患者',
      phone: '12345678',
      email: 'test@example.com'
    }
  };
  
  console.log('📤 發送預約請求...');
  console.log('請求數據:', JSON.stringify(appointment, null, 2));
  
  try {
    const response = await axios.post(`${BASE_URL}/api/appointments`, appointment, { headers });
    console.log('✅ 預約創建成功!');
    console.log('回應:', JSON.stringify(response.data, null, 2));
  } catch (error) {
    console.log('❌ 預約創建失敗:');
    console.log('狀態碼:', error.response?.status);
    console.log('錯誤:', error.response?.data || error.message);
    
    // 嘗試更簡單的請求
    console.log('\n🔄 嘗試最簡化的預約請求...');
    const simpleAppointment = {
      doctorId: doctorId,
      patientId: user.id,
      appointmentDate: '2025-07-21',
      timeSlot: '11:00',
      reason: 'Simple test'
    };
    
    try {
      const simpleResponse = await axios.post(`${BASE_URL}/api/appointments`, simpleAppointment, { headers });
      console.log('✅ 簡化預約成功:', simpleResponse.data);
    } catch (simpleError) {
      console.log('❌ 簡化預約也失敗:', simpleError.response?.data || simpleError.message);
    }
  }
}

// 執行測試
if (require.main === module) {
  testAppointmentCreation();
}

module.exports = { testAppointmentCreation }; 