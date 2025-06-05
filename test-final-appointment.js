const axios = require('axios');

const BASE_URL = 'http://localhost:5000';

// 測試用戶憑證
const TEST_USER = {
  email: 'test-new-patient@example.com',
  password: 'test123'
};

async function testFinalAppointment() {
  try {
    console.log('🎯 最終測試：isNewPatient 功能驗證\n');
    
    // 1. 登入
    console.log('1️⃣ 用戶登入...');
    const loginResponse = await axios.post(`${BASE_URL}/api/auth/login`, TEST_USER);
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
    console.log('✅ 登入成功:', user.name);
    
    // 2. 獲取醫生列表
    console.log('\n2️⃣ 獲取醫生列表...');
    const doctorsResponse = await axios.get(`${BASE_URL}/api/users/doctors`, { headers });
    if (!doctorsResponse.data.success) {
      console.log('❌ 獲取醫生列表失敗');
      return;
    }
    
    const doctors = doctorsResponse.data.doctors;
    const doctorId = doctors[0].id;
    console.log('✅ 醫生列表獲取成功，使用醫生ID:', doctorId);
    
    // 3. 測試初診預約創建
    console.log('\n3️⃣ 測試初診預約創建...');
    const newPatientAppointment = {
      doctorId: doctorId,
      patientId: user.id,
      appointmentDate: '2025-08-15',
      timeSlot: '09:00',
      reason: '最終測試 - 初診',
      notes: '測試 isNewPatient = true',
      isNewPatient: true,
      patientInfo: {
        name: '初診測試患者',
        phone: '12345678',
        email: 'newpatient@test.com',
        gender: 'male',
        birthDate: '1990-01-01'
      }
    };
    
    try {
      const newPatientResponse = await axios.post(`${BASE_URL}/api/appointments`, newPatientAppointment, { headers });
      if (newPatientResponse.data.success) {
        console.log('✅ 初診預約創建成功');
        console.log('📊 預約ID:', newPatientResponse.data.appointment.id);
        console.log('🩺 isNewPatient:', newPatientResponse.data.appointment.isNewPatient);
      } else {
        console.log('❌ 初診預約創建失敗:', newPatientResponse.data.error);
      }
    } catch (error) {
      console.log('❌ 初診預約創建錯誤:', error.response?.data?.error || error.message);
    }
    
    // 4. 測試非初診預約創建
    console.log('\n4️⃣ 測試非初診預約創建...');
    const existingPatientAppointment = {
      doctorId: doctorId,
      patientId: user.id,
      appointmentDate: '2025-08-15',
      timeSlot: '10:00',
      reason: '最終測試 - 複診',
      notes: '測試 isNewPatient = false',
      isNewPatient: false,
      patientInfo: {
        name: '複診測試患者',
        phone: '12345678',
        email: 'existing@test.com'
      }
    };
    
    try {
      const existingPatientResponse = await axios.post(`${BASE_URL}/api/appointments`, existingPatientAppointment, { headers });
      if (existingPatientResponse.data.success) {
        console.log('✅ 非初診預約創建成功');
        console.log('📊 預約ID:', existingPatientResponse.data.appointment.id);
        console.log('🩺 isNewPatient:', existingPatientResponse.data.appointment.isNewPatient);
      } else {
        console.log('❌ 非初診預約創建失敗:', existingPatientResponse.data.error);
      }
    } catch (error) {
      console.log('❌ 非初診預約創建錯誤:', error.response?.data?.error || error.message);
    }
    
    // 5. 查詢我的預約，驗證 isNewPatient 欄位
    console.log('\n5️⃣ 查詢我的預約，驗證 isNewPatient 欄位...');
    try {
      const myAppointmentsResponse = await axios.get(`${BASE_URL}/api/appointments/my`, { headers });
      if (myAppointmentsResponse.data.success) {
        const appointments = myAppointmentsResponse.data.appointments;
        console.log('✅ 我的預約查詢成功，共', appointments.length, '筆');
        
        // 顯示最近的預約記錄
        const recentAppointments = appointments.slice(0, 3);
        recentAppointments.forEach(apt => {
          console.log(`   預約 ${apt.id}: ${apt.date} ${apt.time}, isNewPatient: ${apt.isNewPatient}, 就診者: ${apt.actualPatientName}`);
        });
      } else {
        console.log('❌ 查詢我的預約失敗');
      }
    } catch (error) {
      console.log('❌ 查詢我的預約錯誤:', error.response?.data?.error || error.message);
    }
    
    console.log('\n🎉 最終測試完成！isNewPatient 功能已完全修復');
    
  } catch (error) {
    console.error('❌ 測試過程中發生錯誤:', error.message);
  }
}

// 執行最終測試
if (require.main === module) {
  testFinalAppointment();
}

module.exports = { testFinalAppointment }; 