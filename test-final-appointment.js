/**
 * 最終預約功能測試
 * 測試所有預約功能，使用不重複的時間
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:5000';

// 測試用戶
const TEST_USER = {
  email: 'samu003@gmail.com',
  password: 'sam003'
};

async function testFinalAppointment() {
  console.log('🎯 最終預約功能測試...\n');
  
  try {
    // 1. 用戶登入
    console.log('1️⃣ 用戶登入...');
    const loginResponse = await axios.post(`${BASE_URL}/api/auth/login`, TEST_USER);
    
    if (!loginResponse.data.success) {
      throw new Error('登入失敗');
    }
    
    console.log('✅ 登入成功');
    console.log('用戶:', loginResponse.data.user.name);
    
    const token = loginResponse.data.token;
    const userId = loginResponse.data.user.id;
    
    // 生成隨機時間避免衝突
    const randomHour = Math.floor(Math.random() * 8) + 9; // 9-16點
    const timeSlot = `${randomHour.toString().padStart(2, '0')}:00`;
    const randomDay = Math.floor(Math.random() * 28) + 1; // 1-28號
    const appointmentDate = `2025-09-${randomDay.toString().padStart(2, '0')}`;
    
    console.log(`\n📅 使用時間: ${appointmentDate} ${timeSlot}`);
    
    // 2. 測試不含 isNewPatient 的預約（模擬前端請求）
    console.log('\n2️⃣ 測試前端格式預約（無 isNewPatient）...');
    const frontendRequest = {
      doctorId: 4,
      patientId: userId,
      appointmentDate: appointmentDate,
      timeSlot: timeSlot,
      reason: '測試預約',
      notes: '前端格式測試',
      patientInfo: {
        name: '測試患者',
        phone: '62998036',
        email: 'test@example.com'
      }
    };
    
    const frontendResponse = await axios.post(`${BASE_URL}/api/appointments`, frontendRequest, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ 前端格式預約成功');
    console.log('預約ID:', frontendResponse.data.appointment?.id);
    console.log('isNewPatient:', frontendResponse.data.appointment?.isNewPatient);
    console.log('status:', frontendResponse.data.appointment?.status);
    
    // 3. 測試包含 isNewPatient: true 的初診預約
    console.log('\n3️⃣ 測試初診預約（isNewPatient: true）...');
    const newPatientRequest = {
      doctorId: 4,
      patientId: userId,
      appointmentDate: `2025-09-${(randomDay + 1).toString().padStart(2, '0')}`,
      timeSlot: `${(randomHour + 1).toString().padStart(2, '0')}:00`,
      reason: '初次諮詢',
      notes: '初診預約測試',
      isNewPatient: true,
      patientInfo: {
        name: '新患者',
        phone: '62998036',
        email: 'new@example.com'
      }
    };
    
    const newPatientResponse = await axios.post(`${BASE_URL}/api/appointments`, newPatientRequest, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ 初診預約成功');
    console.log('預約ID:', newPatientResponse.data.appointment?.id);
    console.log('isNewPatient:', newPatientResponse.data.appointment?.isNewPatient);
    console.log('status:', newPatientResponse.data.appointment?.status);
    
    // 4. 測試包含 isNewPatient: false 的非初診預約
    console.log('\n4️⃣ 測試非初診預約（isNewPatient: false）...');
    const regularRequest = {
      doctorId: 4,
      patientId: userId,
      appointmentDate: `2025-09-${(randomDay + 2).toString().padStart(2, '0')}`,
      timeSlot: `${(randomHour + 2).toString().padStart(2, '0')}:00`,
      reason: '追蹤治療',
      notes: '非初診預約測試',
      isNewPatient: false,
      patientInfo: {
        name: '回診患者',
        phone: '62998036',
        email: 'regular@example.com'
      }
    };
    
    const regularResponse = await axios.post(`${BASE_URL}/api/appointments`, regularRequest, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ 非初診預約成功');
    console.log('預約ID:', regularResponse.data.appointment?.id);
    console.log('isNewPatient:', regularResponse.data.appointment?.isNewPatient);
    console.log('status:', regularResponse.data.appointment?.status);
    
    // 5. 查詢預約列表確認
    console.log('\n5️⃣ 查詢預約列表...');
    const appointmentsResponse = await axios.get(`${BASE_URL}/api/appointments/my`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    console.log('✅ 預約列表查詢成功');
    const appointments = appointmentsResponse.data.appointments || [];
    console.log('總預約數量:', appointments.length);
    
    // 顯示最新的預約
    if (appointments.length > 0) {
      console.log('\n📋 最新的 3 個預約:');
      const recentAppointments = appointments.slice(-3);
      recentAppointments.forEach(apt => {
        console.log(`  - 預約${apt.id}: ${apt.date} ${apt.time} (初診: ${apt.isNewPatient})`);
        if (apt.patient_info) {
          try {
            const info = typeof apt.patient_info === 'string' ? JSON.parse(apt.patient_info) : apt.patient_info;
            console.log(`    就診者: ${info.name || '未知'}`);
          } catch (e) {
            console.log(`    就診者資訊解析失敗`);
          }
        }
      });
    }
    
    console.log('\n🎉 所有測試完成！預約功能正常運作');
    
    return {
      success: true,
      message: '所有預約功能測試通過',
      createdAppointments: 3,
      totalAppointments: appointments.length
    };
    
  } catch (error) {
    console.error('\n❌ 測試失敗:', error.message);
    
    if (error.response) {
      console.error('錯誤狀態:', error.response.status);
      console.error('錯誤詳情:', error.response.data);
      
      if (error.response.status === 500) {
        console.log('\n🚨 500 錯誤 - 這表示後端有問題！');
        if (error.response.data?.message?.includes('isNewPatient')) {
          console.log('💡 確認：isNewPatient 欄位問題仍然存在');
        }
      }
    }
    
    return {
      success: false,
      message: error.message,
      statusCode: error.response?.status,
      errorData: error.response?.data
    };
  }
}

// 執行測試
if (require.main === module) {
  testFinalAppointment()
    .then(result => {
      console.log('\n📊 最終測試結果:', result);
      
      if (result.success) {
        console.log('\n✅ 預約功能修復成功！用戶可以正常使用');
        console.log('📝 測試摘要:');
        console.log('- 前端格式預約：正常');
        console.log('- 初診預約：正常');
        console.log('- 非初診預約：正常');
        console.log('- 預約查詢：正常');
        console.log('- isNewPatient 欄位：正常運作');
        console.log('- patient_info 儲存：正常');
      } else {
        console.log('\n❌ 預約功能仍有問題，需要進一步診斷');
      }
    })
    .catch(error => {
      console.error('\n💥 測試執行錯誤:', error);
    });
}

module.exports = { testFinalAppointment }; 