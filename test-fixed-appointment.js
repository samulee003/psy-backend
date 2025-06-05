/**
 * 測試修復後的預約功能
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:5000';

// 使用真實用戶
const REAL_USER = {
  email: 'samu003@gmail.com',
  password: 'sam003'
};

async function testFixedAppointment() {
  try {
    console.log('🎯 測試修復後的預約功能...\n');
    
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
    
    // 2. 測試非初診預約
    console.log('\n2️⃣ 測試非初診預約...');
    const regularAppointment = {
      doctorId: 4,
      patientId: user.id,
      appointmentDate: '2025-07-08',
      timeSlot: '10:00',
      reason: '修復後測試-非初診',
      notes: '測試非初診預約功能',
      isNewPatient: false,
      patientInfo: {
        name: user.name,
        phone: '62998036',
        email: user.email
      }
    };
    
    try {
      const regularResponse = await axios.post(`${BASE_URL}/api/appointments`, regularAppointment, { headers });
      console.log('✅ 非初診預約成功');
      console.log('📊 回應:', regularResponse.data);
      console.log('🆔 預約ID:', regularResponse.data.appointment.id);
      console.log('🩺 isNewPatient:', regularResponse.data.appointment.isNewPatient);
    } catch (error) {
      console.log('❌ 非初診預約失敗');
      console.log('錯誤:', error.response?.data || error.message);
    }
    
    // 3. 測試初診預約
    console.log('\n3️⃣ 測試初診預約...');
    const newPatientAppointment = {
      doctorId: 4,
      patientId: user.id,
      appointmentDate: '2025-07-09',
      timeSlot: '11:00',
      reason: '修復後測試-初診',
      notes: '測試初診預約功能',
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
      console.log('✅ 初診預約成功');
      console.log('📊 回應:', newPatientResponse.data);
      console.log('🆔 預約ID:', newPatientResponse.data.appointment.id);
      console.log('🩺 isNewPatient:', newPatientResponse.data.appointment.isNewPatient);
    } catch (error) {
      console.log('❌ 初診預約失敗');
      console.log('錯誤:', error.response?.data || error.message);
    }
    
    // 4. 查詢我的預約
    console.log('\n4️⃣ 查詢我的預約...');
    try {
      const myAppointments = await axios.get(`${BASE_URL}/api/appointments/my`, { headers });
      console.log('✅ 查詢預約成功');
      console.log('📊 預約總數:', myAppointments.data.appointments.length);
      
      // 顯示最近3個預約
      const recentAppointments = myAppointments.data.appointments.slice(0, 3);
      console.log('\n📋 最近的預約:');
      recentAppointments.forEach(apt => {
        console.log(`  - ID ${apt.id}: ${apt.date} ${apt.time}`);
        console.log(`    就診者: ${apt.actualPatientName || apt.patientName}`);
        console.log(`    初診: ${apt.isNewPatient ? '是' : '否'}`);
        console.log(`    狀態: ${apt.status}`);
        console.log('');
      });
      
    } catch (error) {
      console.log('❌ 查詢預約失敗');
      console.log('錯誤:', error.response?.data || error.message);
    }
    
    // 5. 測試模擬前端請求
    console.log('\n5️⃣ 模擬前端完整請求...');
    const frontendRequest = {
      patientId: user.id,
      doctorId: '4', // 字串格式
      appointmentDate: '2025-07-10',
      timeSlot: '14:30',
      reason: '',
      notes: '',
      isNewPatient: false,
      patientInfo: {
        name: '前端測試用戶',
        phone: '62998036',
        email: user.email,
        gender: 'male',
        birthDate: ''
      }
    };
    
    try {
      const frontendResponse = await axios.post(`${BASE_URL}/api/appointments`, frontendRequest, { headers });
      console.log('✅ 前端模擬請求成功');
      console.log('📊 回應:', frontendResponse.data);
      console.log('🆔 預約ID:', frontendResponse.data.appointment.id);
      console.log('🩺 isNewPatient:', frontendResponse.data.appointment.isNewPatient);
    } catch (error) {
      console.log('❌ 前端模擬請求失敗');
      console.log('錯誤狀態:', error.response?.status);
      console.log('錯誤內容:', error.response?.data || error.message);
    }
    
  } catch (error) {
    console.error('❌ 測試過程錯誤:', error.message);
  }
}

// 執行測試
if (require.main === module) {
  console.log('開始測試修復後的預約功能...');
  testFixedAppointment()
    .then(() => {
      console.log('\n🎉 測試完成');
    })
    .catch(error => {
      console.error('\n❌ 測試失敗:', error.message);
    });
}

module.exports = { testFixedAppointment }; 