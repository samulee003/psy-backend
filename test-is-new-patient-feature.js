const axios = require('axios');

// 配置
const BASE_URL = 'http://localhost:5000';
const TEST_USER = {
  email: 'test-new-patient@example.com',
  password: 'test123',
  name: 'Test User',
  role: 'patient'
};

// 生成當前日期後的日期
const getTestDates = () => {
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  
  const dayAfter = new Date(today);
  dayAfter.setDate(today.getDate() + 2);
  
  const dayAfter2 = new Date(today);
  dayAfter2.setDate(today.getDate() + 3);
  
  return {
    tomorrow: tomorrow.toISOString().split('T')[0], // YYYY-MM-DD 格式
    dayAfter: dayAfter.toISOString().split('T')[0],
    dayAfter2: dayAfter2.toISOString().split('T')[0]
  };
};

const testDates = getTestDates();

// 測試數據 - 初診患者
const NEW_PATIENT_APPOINTMENT = {
  doctorId: 4, // 使用存在的醫生 ID
  patientId: null, // 將在登入後設置
  appointmentDate: testDates.tomorrow,
  timeSlot: '10:00',
  reason: '初診測試 - 壓力和焦慮',
  notes: '希望了解放鬆技巧',
  isNewPatient: true, // 布林值：初診
  patientInfo: {
    name: '測試初診患者',
    phone: '12345678',
    email: 'newpatient@example.com',
    gender: 'male',
    birthDate: '1990-01-01'
  }
};

// 測試數據 - 非初診患者
const EXISTING_PATIENT_APPOINTMENT = {
  doctorId: 4, // 使用存在的醫生 ID
  patientId: null, // 將在登入後設置
  appointmentDate: testDates.dayAfter,
  timeSlot: '14:00',
  reason: '非初診測試 - 後續治療',
  notes: '繼續上次的治療',
  isNewPatient: false, // 布林值：非初診
  patientInfo: {
    name: '測試非初診患者',
    phone: '12345678',
    email: 'existingpatient@example.com'
  }
};

async function runTests() {
  try {
    console.log('🧪 開始測試初診預約功能...\n');
    
    // 1. 先註冊測試用戶（如果不存在）
    console.log('1️⃣ 註冊/確認測試用戶...');
    try {
      const registerResponse = await axios.post(`${BASE_URL}/api/auth/register`, TEST_USER);
      if (registerResponse.data.success) {
        console.log('✅ 測試用戶註冊成功');
      }
    } catch (registerError) {
      if (registerError.response && registerError.response.status === 409) {
        console.log('✅ 測試用戶已存在，繼續登入');
      } else if (registerError.response && registerError.response.data && registerError.response.data.suggestion === 'login') {
        console.log('✅ 測試用戶已存在，繼續登入');
      } else {
        console.error('❌ 註冊測試用戶失敗:', registerError.response?.data || registerError.message);
        return;
      }
    }
    
    // 2. 登入測試用戶
    console.log('2️⃣ 登入測試用戶...');
    const loginResponse = await axios.post(`${BASE_URL}/api/auth/login`, {
      email: TEST_USER.email,
      password: TEST_USER.password
    });
    
    if (!loginResponse.data.success) {
      console.error('❌ 登入失敗:', loginResponse.data.error);
      return;
    }
    
    const token = loginResponse.data.token;
    const user = loginResponse.data.user;
    console.log('✅ 登入成功，用戶ID:', user.id);
    
    // 設置請求頭
    const headers = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
    
    // 更新測試數據中的 patientId
    NEW_PATIENT_APPOINTMENT.patientId = user.id;
    EXISTING_PATIENT_APPOINTMENT.patientId = user.id;
    
    // 3. 測試創建初診預約
    console.log('\n3️⃣ 測試創建初診預約...');
    console.log('📋 預約數據:', JSON.stringify(NEW_PATIENT_APPOINTMENT, null, 2));
    
    try {
      const newPatientResponse = await axios.post(`${BASE_URL}/api/appointments`, NEW_PATIENT_APPOINTMENT, { headers });
      
      if (!newPatientResponse.data.success) {
        console.error('❌ 創建初診預約失敗:', newPatientResponse.data.error);
      } else {
        const newAppointment = newPatientResponse.data.appointment;
        console.log('✅ 初診預約創建成功');
        console.log('📊 預約 ID:', newAppointment.id);
        console.log('🩺 isNewPatient:', newAppointment.isNewPatient);
      }
    } catch (appointmentError) {
      console.error('❌ 創建初診預約錯誤:', appointmentError.response?.data || appointmentError.message);
    }
    
    // 4. 測試創建非初診預約
    console.log('\n4️⃣ 測試創建非初診預約...');
    console.log('📋 預約數據:', JSON.stringify(EXISTING_PATIENT_APPOINTMENT, null, 2));
    
    try {
      const existingPatientResponse = await axios.post(`${BASE_URL}/api/appointments`, EXISTING_PATIENT_APPOINTMENT, { headers });
      
      if (!existingPatientResponse.data.success) {
        console.error('❌ 創建非初診預約失敗:', existingPatientResponse.data.error);
      } else {
        const existingAppointment = existingPatientResponse.data.appointment;
        console.log('✅ 非初診預約創建成功');
        console.log('📊 預約 ID:', existingAppointment.id);
        console.log('🩺 isNewPatient:', existingAppointment.isNewPatient);
      }
    } catch (appointmentError) {
      console.error('❌ 創建非初診預約錯誤:', appointmentError.response?.data || appointmentError.message);
    }
    
    // 5. 查詢我的預約，檢查 isNewPatient 欄位
    console.log('\n5️⃣ 查詢我的預約，檢查 isNewPatient 欄位...');
    try {
      const myAppointmentsResponse = await axios.get(`${BASE_URL}/api/appointments/my`, { headers });
      
      if (!myAppointmentsResponse.data.success) {
        console.error('❌ 查詢我的預約失敗:', myAppointmentsResponse.data.error);
      } else {
        const appointments = myAppointmentsResponse.data.appointments;
        console.log('✅ 成功查詢我的預約');
        console.log(`📊 總預約數: ${appointments.length}`);
        
        // 顯示最近的幾個預約及其 isNewPatient 狀態
        const recentAppointments = appointments.slice(0, 3);
        recentAppointments.forEach((apt, index) => {
          console.log(`\n[${index + 1}] 預約 ID: ${apt.id}`);
          console.log(`    日期時間: ${apt.date} ${apt.time}`);
          console.log(`    就診者: ${apt.actualPatientName}`);
          console.log(`    🩺 是否初診: ${apt.isNewPatient}`);
          console.log(`    狀態: ${apt.status}`);
          console.log(`    備註: ${apt.notes || '無'}`);
        });
      }
    } catch (queryError) {
      console.error('❌ 查詢我的預約錯誤:', queryError.response?.data || queryError.message);
    }
    
    // 6. 測試邊界情況 - 字串形式的 isNewPatient
    console.log('\n6️⃣ 測試邊界情況 - 字串形式的 isNewPatient...');
    const stringTestAppointment = {
      ...NEW_PATIENT_APPOINTMENT,
      appointmentDate: testDates.dayAfter2,
      timeSlot: '16:00',
      isNewPatient: 'true', // 字串形式
      reason: '測試字串 isNewPatient'
    };
    
    try {
      const stringTestResponse = await axios.post(`${BASE_URL}/api/appointments`, stringTestAppointment, { headers });
      
      if (!stringTestResponse.data.success) {
        console.error('❌ 字串 isNewPatient 測試失敗:', stringTestResponse.data.error);
      } else {
        const stringTestAppointmentResult = stringTestResponse.data.appointment;
        console.log('✅ 字串 isNewPatient 測試成功');
        console.log('📊 預約 ID:', stringTestAppointmentResult.id);
        console.log('🩺 isNewPatient (應該是 true):', stringTestAppointmentResult.isNewPatient);
      }
    } catch (stringTestError) {
      console.error('❌ 字串 isNewPatient 測試錯誤:', stringTestError.response?.data || stringTestError.message);
    }
    
    console.log('\n🎉 所有測試完成！');
    
  } catch (error) {
    console.error('❌ 測試過程中發生錯誤:', error.message);
    if (error.response) {
      console.error('響應狀態:', error.response.status);
      console.error('響應數據:', error.response.data);
    }
  }
}

// 執行測試
if (require.main === module) {
  runTests();
}

module.exports = { runTests }; 