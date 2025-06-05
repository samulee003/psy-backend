const axios = require('axios');

const BASE_URL = 'http://localhost:5000';

// 使用真實用戶李昇恆
const REAL_USER = {
  email: 'samu003@gmail.com',
  password: 'sam003'
};

async function testFrontendFormats() {
  try {
    console.log('🔍 測試前端可能的數據格式...\n');
    
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
    
    // 測試不同的數據格式
    const testCases = [
      {
        name: '測試1: 標準格式',
        data: {
          doctorId: 4,
          patientId: user.id,
          appointmentDate: '2025-09-03',
          timeSlot: '10:00',
          reason: '測試標準格式',
          notes: '標準格式測試',
          isNewPatient: false,
          patientInfo: {
            name: user.name,
            phone: '62998036',
            email: user.email
          }
        }
      },
      {
        name: '測試2: 字串ID格式',
        data: {
          doctorId: '4', // 字串格式的ID
          patientId: user.id.toString(), // 字串格式的ID
          appointmentDate: '2025-09-04',
          timeSlot: '11:00',
          reason: '測試字串ID格式',
          notes: '字串ID格式測試',
          isNewPatient: 'false', // 字串格式的布林值
          patientInfo: {
            name: user.name,
            phone: '62998036',
            email: user.email
          }
        }
      },
      {
        name: '測試3: 缺少非必填欄位',
        data: {
          doctorId: 4,
          patientId: user.id,
          appointmentDate: '2025-09-05',
          timeSlot: '12:00',
          isNewPatient: false,
          patientInfo: {
            name: user.name,
            phone: '62998036',
            email: user.email
          }
          // 缺少 reason 和 notes
        }
      },
      {
        name: '測試4: 空值處理',
        data: {
          doctorId: 4,
          patientId: user.id,
          appointmentDate: '2025-09-06',
          timeSlot: '13:00',
          reason: '',
          notes: '',
          isNewPatient: false,
          patientInfo: {
            name: user.name,
            phone: '62998036',
            email: user.email
          }
        }
      },
      {
        name: '測試5: 初診格式',
        data: {
          doctorId: 4,
          patientId: user.id,
          appointmentDate: '2025-09-07',
          timeSlot: '14:00',
          reason: '初診測試',
          notes: '初診格式測試',
          isNewPatient: true,
          patientInfo: {
            name: '新患者姓名',
            phone: '62998036',
            email: 'newpatient@test.com',
            gender: 'male',
            birthDate: '1990-01-01'
          }
        }
      }
    ];
    
    for (let i = 0; i < testCases.length; i++) {
      const testCase = testCases[i];
      console.log(`\n${i + 2}️⃣ ${testCase.name}...`);
      console.log('📋 數據:', JSON.stringify(testCase.data, null, 2));
      
      try {
        const response = await axios.post(`${BASE_URL}/api/appointments`, testCase.data, { headers });
        console.log('✅ 成功:', response.data.message);
        console.log('📊 預約ID:', response.data.appointment.id);
      } catch (error) {
        console.log('❌ 失敗');
        console.log('📊 狀態碼:', error.response?.status);
        console.log('📊 錯誤內容:', error.response?.data);
        
        if (error.response?.status === 500) {
          console.log('⚠️ 500錯誤 - 可能是此格式導致的問題');
        }
      }
    }
    
  } catch (error) {
    console.error('❌ 測試過程錯誤:', error.message);
  }
}

// 執行測試
if (require.main === module) {
  testFrontendFormats();
}

module.exports = { testFrontendFormats }; 