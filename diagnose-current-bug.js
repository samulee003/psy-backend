const axios = require('axios');

const BASE_URL = 'http://localhost:5000';

// 使用真實用戶李昇恆
const REAL_USER = {
  email: 'samu003@gmail.com',
  password: 'sam003'
};

async function diagnoseBug() {
  try {
    console.log('🔍 診斷當前預約Bug...\n');
    
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
    
    // 2. 獲取醫生列表
    console.log('\n2️⃣ 測試醫生API...');
    try {
      const doctorsResponse = await axios.get(`${BASE_URL}/api/users/doctors`, { headers });
      console.log('✅ 醫生API狀態:', doctorsResponse.status);
      console.log('📊 醫生API回應:', doctorsResponse.data);
      
      if (!doctorsResponse.data.success) {
        console.log('❌ 醫生API回應格式錯誤');
        return;
      }
      
      const doctors = doctorsResponse.data.doctors;
      const doctor = doctors.find(d => d.id === 4);
      if (!doctor) {
        console.log('❌ 找不到醫生ID 4');
        return;
      }
      console.log('✅ 找到醫生:', doctor.name);
      
    } catch (error) {
      console.log('❌ 醫生API錯誤:', error.response?.status, error.response?.data);
      return;
    }
    
    // 3. 測試非初診預約（簡單版本）
    console.log('\n3️⃣ 測試非初診預約...');
    const appointment = {
      doctorId: 4,
      patientId: user.id,
      appointmentDate: '2025-09-01',
      timeSlot: '14:00',
      reason: 'Bug診斷測試',
      notes: '測試非初診預約',
      isNewPatient: false,
      patientInfo: {
        name: user.name,
        phone: '62998036',
        email: user.email
      }
    };
    
    console.log('📋 預約數據:', JSON.stringify(appointment, null, 2));
    
    try {
      const appointmentResponse = await axios.post(`${BASE_URL}/api/appointments`, appointment, { headers });
      console.log('✅ 預約創建成功');
      console.log('📊 預約回應:', appointmentResponse.data);
    } catch (error) {
      console.log('❌ 預約創建失敗');
      console.log('📊 錯誤狀態:', error.response?.status);
      console.log('📊 錯誤內容:', error.response?.data);
      console.log('📊 錯誤訊息:', error.message);
      
      // 詳細分析錯誤
      if (error.response?.status === 500) {
        console.log('\n🔍 500錯誤詳細分析:');
        console.log('這通常表示後端服務器內部錯誤');
        console.log('請檢查後端日誌以獲取更多資訊');
      }
    }
    
    // 4. 測試初診預約
    console.log('\n4️⃣ 測試初診預約...');
    const newPatientAppointment = {
      ...appointment,
      appointmentDate: '2025-09-02',
      timeSlot: '15:00',
      reason: 'Bug診斷測試-初診',
      notes: '測試初診預約',
      isNewPatient: true,
      patientInfo: {
        name: '初診測試患者',
        phone: '62998036',
        email: 'newpatient@test.com',
        gender: 'male',
        birthDate: '1990-01-01'
      }
    };
    
    try {
      const newPatientResponse = await axios.post(`${BASE_URL}/api/appointments`, newPatientAppointment, { headers });
      console.log('✅ 初診預約創建成功');
      console.log('📊 初診預約回應:', newPatientResponse.data);
    } catch (error) {
      console.log('❌ 初診預約創建失敗');
      console.log('📊 錯誤狀態:', error.response?.status);
      console.log('📊 錯誤內容:', error.response?.data);
    }
    
  } catch (error) {
    console.error('❌ 診斷過程錯誤:', error.message);
  }
}

// 執行診斷
if (require.main === module) {
  diagnoseBug();
}

module.exports = { diagnoseBug }; 