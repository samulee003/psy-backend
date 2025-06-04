const axios = require('axios');

// 配置
const BASE_URL = 'http://localhost:5000';

// 測試用戶憑證
const TEST_USER = {
  email: 'abc@gmail.com',
  password: 'test123'
};

// 測試預約數據
const TEST_APPOINTMENT = {
  doctorId: 4,
  patientId: null, // 將在登入後設置
  appointmentDate: '2025-07-15', // 使用未來日期
  timeSlot: '10:00',
  reason: 'Bug 診斷測試',
  notes: '測試預約創建是否正常',
  isNewPatient: true,
  patientInfo: {
    name: 'Bug 測試患者',
    phone: '12345678',
    email: 'test@example.com',
    gender: 'male',
    birthDate: '1990-01-01'
  }
};

async function diagnoseBug() {
  try {
    console.log('🔍 開始診斷預約創建問題...\n');
    
    // 1. 測試服務器連接
    console.log('1️⃣ 測試服務器連接...');
    try {
      const healthResponse = await axios.get(`${BASE_URL}/api/appointments`);
      console.log('❌ 無認證的請求應該返回 401，但返回了:', healthResponse.status);
    } catch (error) {
      if (error.response && error.response.status === 401) {
        console.log('✅ 服務器正常，認證中間件工作正常');
      } else {
        console.log('❌ 服務器連接問題:', error.message);
        return;
      }
    }
    
    // 2. 登入獲取 token
    console.log('\n2️⃣ 測試用戶登入...');
    let token, user;
    try {
      const loginResponse = await axios.post(`${BASE_URL}/api/auth/login`, TEST_USER);
      if (!loginResponse.data.success) {
        console.log('❌ 登入失敗:', loginResponse.data.error);
        return;
      }
      token = loginResponse.data.token;
      user = loginResponse.data.user;
      console.log('✅ 登入成功，用戶ID:', user.id);
    } catch (loginError) {
      console.log('❌ 登入錯誤:', loginError.response?.data || loginError.message);
      return;
    }

    // 3. 設置認證頭
    const headers = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };

    // 4. 更新測試數據
    TEST_APPOINTMENT.patientId = user.id;
    
    // 5. 測試醫生存在性
    console.log('\n3️⃣ 測試醫生存在性...');
    try {
      const doctorsResponse = await axios.get(`${BASE_URL}/api/users/doctors`, { headers });
      if (doctorsResponse.data.success) {
        const doctors = doctorsResponse.data.doctors;
        console.log('✅ 醫生列表獲取成功，醫生數量:', doctors.length);
        const targetDoctor = doctors.find(doc => doc.id === TEST_APPOINTMENT.doctorId);
        if (targetDoctor) {
          console.log('✅ 目標醫生存在:', targetDoctor.name);
        } else {
          console.log('❌ 目標醫生 ID', TEST_APPOINTMENT.doctorId, '不存在');
          if (doctors.length > 0) {
            console.log('📋 可用醫生 ID:', doctors.map(d => d.id));
            // 使用第一個可用醫生
            TEST_APPOINTMENT.doctorId = doctors[0].id;
            console.log('🔄 改用醫生 ID:', TEST_APPOINTMENT.doctorId);
          }
        }
      }
    } catch (doctorError) {
      console.log('❌ 獲取醫生列表錯誤:', doctorError.response?.data || doctorError.message);
    }
    
    // 6. 測試預約創建 - 完整請求
    console.log('\n4️⃣ 測試預約創建...');
    console.log('📋 請求數據:', JSON.stringify(TEST_APPOINTMENT, null, 2));
    
    try {
      const createResponse = await axios.post(`${BASE_URL}/api/appointments`, TEST_APPOINTMENT, { headers });
      
      if (createResponse.data.success) {
        console.log('✅ 預約創建成功');
        console.log('📊 返回數據:', JSON.stringify(createResponse.data, null, 2));
      } else {
        console.log('❌ 預約創建失敗:', createResponse.data.error);
      }
    } catch (createError) {
      console.log('❌ 預約創建請求錯誤:');
      console.log('   狀態碼:', createError.response?.status);
      console.log('   錯誤訊息:', createError.response?.data || createError.message);
      console.log('   詳細錯誤:', createError.response?.data?.error);
      
      // 如果是 500 錯誤，顯示更多診斷資訊
      if (createError.response?.status === 500) {
        console.log('\n🚨 檢測到 500 內部服務器錯誤！');
        console.log('可能的原因：');
        console.log('1. 資料庫連接問題');
        console.log('2. SQL 語法錯誤');
        console.log('3. 缺少必要的資料庫欄位');
        console.log('4. 驗證函數錯誤');
        console.log('5. 認證中間件問題');
        
        // 嘗試簡化的請求
        console.log('\n🔄 嘗試簡化的預約請求...');
        const simpleAppointment = {
          doctorId: TEST_APPOINTMENT.doctorId,
          patientId: TEST_APPOINTMENT.patientId,
          appointmentDate: TEST_APPOINTMENT.appointmentDate,
          timeSlot: TEST_APPOINTMENT.timeSlot,
          reason: 'Simple test',
          isNewPatient: false
        };
        
        try {
          const simpleResponse = await axios.post(`${BASE_URL}/api/appointments`, simpleAppointment, { headers });
          console.log('✅ 簡化請求成功:', simpleResponse.data);
        } catch (simpleError) {
          console.log('❌ 簡化請求也失敗:', simpleError.response?.data || simpleError.message);
        }
      }
    }
    
    console.log('\n🏁 診斷完成');
    
  } catch (error) {
    console.error('❌ 診斷過程中發生錯誤:', error.message);
  }
}

// 執行診斷
if (require.main === module) {
  diagnoseBug();
}

module.exports = { diagnoseBug }; 