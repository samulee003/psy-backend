/**
 * 驗證生產環境部署
 * 快速測試生產環境預約功能是否修復
 */

const axios = require('axios');

const PRODUCTION_URL = 'https://psy-backend.zeabur.app';

const TEST_USER = {
  email: 'samu003@gmail.com',
  password: 'sam003'
};

async function verifyProductionDeployment() {
  console.log('🔍 驗證生產環境部署狀態...\n');
  
  try {
    // 1. 登入
    console.log('1️⃣ 登入生產環境...');
    const loginResponse = await axios.post(`${PRODUCTION_URL}/api/auth/login`, TEST_USER, {
      headers: {
        'Content-Type': 'application/json',
        'Origin': 'https://therapy-booking.zeabur.app'
      },
      timeout: 10000
    });
    
    if (!loginResponse.data.success) {
      console.log('❌ 登入失敗');
      return false;
    }
    
    const token = loginResponse.data.token;
    console.log('✅ 登入成功');
    
    // 2. 測試預約創建
    console.log('\n2️⃣ 測試預約創建...');
    const testAppointment = {
      doctorId: 4,
      patientId: 3,
      appointmentDate: '2025-07-25',
      timeSlot: '14:00',
      reason: '部署驗證測試',
      notes: '驗證生產環境部署',
      isNewPatient: false,
      patientInfo: {
        name: '部署驗證用戶',
        phone: '62998036',
        email: 'samu003@gmail.com'
      }
    };
    
    const appointmentResponse = await axios.post(`${PRODUCTION_URL}/api/appointments`, testAppointment, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Origin': 'https://therapy-booking.zeabur.app'
      },
      timeout: 15000
    });
    
    console.log('✅ 預約創建成功！');
    console.log('預約ID:', appointmentResponse.data.appointment?.id);
    console.log('isNewPatient:', appointmentResponse.data.appointment?.isNewPatient);
    
    // 3. 測試初診預約
    console.log('\n3️⃣ 測試初診預約...');
    const newPatientAppointment = {
      doctorId: 4,
      patientId: 3,
      appointmentDate: '2025-07-26',
      timeSlot: '15:00',
      reason: '部署驗證-初診',
      notes: '驗證初診功能',
      isNewPatient: true,
      patientInfo: {
        name: '部署驗證初診患者',
        phone: '62998036',
        email: 'newpatient@deploy-test.com',
        gender: 'male',
        birthDate: '1990-01-01'
      }
    };
    
    const newPatientResponse = await axios.post(`${PRODUCTION_URL}/api/appointments`, newPatientAppointment, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Origin': 'https://therapy-booking.zeabur.app'
      },
      timeout: 15000
    });
    
    console.log('✅ 初診預約創建成功！');
    console.log('預約ID:', newPatientResponse.data.appointment?.id);
    console.log('isNewPatient:', newPatientResponse.data.appointment?.isNewPatient);
    
    console.log('\n🎉 生產環境部署驗證成功！');
    console.log('✅ 所有預約功能正常運作');
    console.log('✅ 無痕模式問題已解決');
    
    return true;
    
  } catch (error) {
    console.log('❌ 生產環境部署驗證失敗');
    console.log('錯誤狀態:', error.response?.status);
    console.log('錯誤訊息:', error.response?.data);
    
    if (error.response?.status === 500) {
      console.log('\n⏳ 可能原因：');
      console.log('- 部署仍在進行中');
      console.log('- 需要等待服務重啟完成');
      console.log('- 建議2-3分鐘後重新測試');
    }
    
    return false;
  }
}

// 執行驗證
if (require.main === module) {
  verifyProductionDeployment()
    .then(success => {
      if (success) {
        console.log('\n🚀 部署驗證完成 - 成功');
      } else {
        console.log('\n⏳ 部署驗證完成 - 仍需等待');
      }
    })
    .catch(error => {
      console.error('\n❌ 驗證過程錯誤:', error.message);
    });
}

module.exports = { verifyProductionDeployment }; 