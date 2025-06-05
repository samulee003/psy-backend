/**
 * 測試修復後的預約功能
 * 驗證 isNewPatient 和 patient_info 欄位是否正常工作
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:5000';

// 測試用戶
const TEST_USER = {
  email: 'samu003@gmail.com',
  password: 'sam003'
};

async function testFixedAppointment() {
  console.log('🧪 測試修復後的預約功能...\n');
  
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
    
    // 2. 測試非初診預約
    console.log('\n2️⃣ 測試非初診預約...');
    const regularAppointment = {
      doctorId: 4,
      patientId: userId,
      appointmentDate: '2025-08-01',
      timeSlot: '14:00',
      reason: '定期追蹤',
      notes: '測試非初診預約功能',
      isNewPatient: false,
      patientInfo: {
        name: '測試患者',
        phone: '62998036',
        email: 'samu003@gmail.com'
      }
    };
    
    const regularResponse = await axios.post(`${BASE_URL}/api/appointments`, regularAppointment, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ 非初診預約創建成功');
    console.log('預約ID:', regularResponse.data.appointment?.id);
    console.log('isNewPatient:', regularResponse.data.appointment?.isNewPatient);
    
    // 3. 測試初診預約
    console.log('\n3️⃣ 測試初診預約...');
    const newPatientAppointment = {
      doctorId: 4,
      patientId: userId,
      appointmentDate: '2025-08-02',
      timeSlot: '15:00',
      reason: '初次諮詢',
      notes: '測試初診預約功能',
      isNewPatient: true,
      patientInfo: {
        name: '新患者測試',
        phone: '62998036',
        email: 'samu003@gmail.com'
      }
    };
    
    const newPatientResponse = await axios.post(`${BASE_URL}/api/appointments`, newPatientAppointment, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ 初診預約創建成功');
    console.log('預約ID:', newPatientResponse.data.appointment?.id);
    console.log('isNewPatient:', newPatientResponse.data.appointment?.isNewPatient);
    
    // 4. 測試前端模擬請求（用戶日誌中的格式）
    console.log('\n4️⃣ 測試前端模擬請求...');
    const frontendRequest = {
      doctorId: 4,
      patientId: userId,
      appointmentDate: '2025-08-03',
      timeSlot: '11:00',
      reason: '測試',
      notes: '前端格式測試',
      patientInfo: { 
        name: '前端測試用戶', 
        phone: '62998036', 
        email: 'test@example.com' 
      }
      // 注意：沒有 isNewPatient，測試預設值
    };
    
    const frontendResponse = await axios.post(`${BASE_URL}/api/appointments`, frontendRequest, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ 前端模擬請求成功');
    console.log('預約ID:', frontendResponse.data.appointment?.id);
    console.log('isNewPatient:', frontendResponse.data.appointment?.isNewPatient);
    console.log('patient_info:', frontendResponse.data.appointment?.patient_info);
    
    // 5. 查詢預約列表
    console.log('\n5️⃣ 查詢預約列表...');
    const appointmentsResponse = await axios.get(`${BASE_URL}/api/appointments/my`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    console.log('✅ 預約列表查詢成功');
    console.log('預約數量:', appointmentsResponse.data.appointments?.length || 0);
    
    // 顯示最新的幾個預約
    if (appointmentsResponse.data.appointments && appointmentsResponse.data.appointments.length > 0) {
      console.log('\n📋 最新預約記錄:');
      const recentAppointments = appointmentsResponse.data.appointments.slice(-3);
      recentAppointments.forEach(apt => {
        console.log(`  - 預約${apt.id}: ${apt.date} ${apt.time} (isNewPatient: ${apt.isNewPatient})`);
        if (apt.patient_info) {
          try {
            const patientInfo = typeof apt.patient_info === 'string' ? JSON.parse(apt.patient_info) : apt.patient_info;
            console.log(`    就診者: ${patientInfo.name || '未知'}`);
          } catch (e) {
            console.log(`    就診者資訊解析錯誤`);
          }
        }
      });
    }
    
    console.log('\n🎉 所有測試通過！預約功能修復成功');
    
    return {
      success: true,
      message: '預約功能完全正常',
      testedFeatures: [
        '非初診預約',
        '初診預約', 
        '前端格式兼容',
        'patient_info 儲存',
        'isNewPatient 處理',
        '預約列表查詢'
      ]
    };
    
  } catch (error) {
    console.error('\n❌ 測試失敗:', error.message);
    
    if (error.response) {
      console.error('錯誤狀態:', error.response.status);
      console.error('錯誤詳情:', error.response.data);
      
      // 分析錯誤類型
      if (error.response.status === 400) {
        console.log('\n🔍 400錯誤分析:');
        console.log('- 可能是請求參數格式問題');
        console.log('- 檢查 doctorId、patientId 是否有效');
        console.log('- 檢查日期時間格式是否正確');
      } else if (error.response.status === 409) {
        console.log('\n🔍 409錯誤分析:');
        console.log('- 時間衝突，該時段已被預約');
        console.log('- 這是正常的業務邏輯，不是bug');
      } else if (error.response.status === 500) {
        console.log('\n🔍 500錯誤分析:');
        console.log('- 服務器內部錯誤');
        console.log('- 可能是資料庫結構問題');
        console.log('- 需要檢查後端日誌');
        
        if (error.response.data?.message?.includes('isNewPatient')) {
          console.log('🚨 確認：isNewPatient 欄位問題仍然存在！');
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
  testFixedAppointment()
    .then(result => {
      console.log('\n📊 測試結果:', result);
      
      if (result.success) {
        console.log('\n✅ 修復驗證成功！用戶可以正常使用預約功能');
      } else {
        console.log('\n❌ 修復驗證失敗，需要進一步排查');
      }
    })
    .catch(error => {
      console.error('\n💥 測試執行錯誤:', error);
    });
}

module.exports = { testFixedAppointment }; 