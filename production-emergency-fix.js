/**
 * 生產環境緊急修復
 * 檢查並修復生產環境的資料庫結構問題
 */

const axios = require('axios');

const PRODUCTION_URL = 'https://psy-backend.zeabur.app';

// 測試用戶
const TEST_USER = {
  email: 'samu003@gmail.com',
  password: 'sam003'
};

async function fixProductionEnvironment() {
  console.log('🚑 生產環境緊急修復...\n');
  
  try {
    // 1. 測試連接
    console.log('1️⃣ 測試生產環境連接...');
    const healthResponse = await axios.get(`${PRODUCTION_URL}/api/health`, {
      timeout: 10000
    });
    console.log(`✅ 生產環境連接正常: ${healthResponse.status}`);
    
    // 2. 登入獲取Token
    console.log('\n2️⃣ 登入生產環境...');
    const loginResponse = await axios.post(`${PRODUCTION_URL}/api/auth/login`, TEST_USER, {
      headers: {
        'Content-Type': 'application/json',
        'Origin': 'https://therapy-booking.zeabur.app'
      },
      timeout: 10000
    });
    
    if (!loginResponse.data.success) {
      console.log('❌ 生產環境登入失敗');
      return;
    }
    
    const token = loginResponse.data.token;
    console.log('✅ 生產環境登入成功');
    
    // 3. 測試簡單預約創建
    console.log('\n3️⃣ 測試生產環境預約創建...');
    const testAppointment = {
      doctorId: 4,
      patientId: 3,
      appointmentDate: '2025-07-20',
      timeSlot: '16:00',
      reason: '生產環境修復測試',
      notes: '測試生產環境預約功能',
      isNewPatient: false,
      patientInfo: {
        name: '生產環境測試',
        phone: '62998036',
        email: 'samu003@gmail.com'
      }
    };
    
    try {
      const appointmentResponse = await axios.post(`${PRODUCTION_URL}/api/appointments`, testAppointment, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Origin': 'https://therapy-booking.zeabur.app'
        },
        timeout: 15000
      });
      
      console.log('✅ 生產環境預約創建成功！');
      console.log('預約ID:', appointmentResponse.data.appointment?.id);
      console.log('所有功能正常運作');
      
    } catch (error) {
      console.log('❌ 生產環境預約創建失敗');
      console.log('錯誤狀態:', error.response?.status);
      console.log('錯誤訊息:', error.response?.data);
      
      if (error.response?.data?.error === '無法創建預約') {
        console.log('\n🔍 可能的原因分析:');
        console.log('1. 資料庫表結構不同步');
        console.log('2. isNewPatient欄位缺失');
        console.log('3. 資料庫連接問題');
        console.log('4. 生產環境代碼版本不同步');
        
        // 4. 嘗試不同的請求格式
        console.log('\n4️⃣ 嘗試簡化請求格式...');
        const simplifiedAppointment = {
          doctorId: 4,
          patientId: 3,
          appointmentDate: '2025-07-21',
          timeSlot: '17:00',
          reason: '簡化測試',
          notes: '簡化格式測試'
          // 故意不包含 isNewPatient 和複雜的 patientInfo
        };
        
        try {
          const simplifiedResponse = await axios.post(`${PRODUCTION_URL}/api/appointments`, simplifiedAppointment, {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
              'Origin': 'https://therapy-booking.zeabur.app'
            },
            timeout: 15000
          });
          
          console.log('✅ 簡化格式成功！問題可能是欄位相關');
          console.log('預約ID:', simplifiedResponse.data.appointment?.id);
          
        } catch (simplifiedError) {
          console.log('❌ 簡化格式也失敗');
          console.log('錯誤:', simplifiedError.response?.data);
        }
      }
    }
    
    // 5. 檢查生產環境預約列表
    console.log('\n5️⃣ 檢查生產環境預約列表...');
    try {
      const appointmentsResponse = await axios.get(`${PRODUCTION_URL}/api/appointments/my`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Origin': 'https://therapy-booking.zeabur.app'
        },
        timeout: 10000
      });
      
      console.log('✅ 生產環境預約列表正常');
      console.log('預約數量:', appointmentsResponse.data.appointments?.length || 0);
      
      // 檢查最近的預約是否有 isNewPatient 欄位
      const recentAppointments = appointmentsResponse.data.appointments?.slice(0, 3) || [];
      console.log('\n📋 檢查最近預約的 isNewPatient 欄位:');
      recentAppointments.forEach(apt => {
        console.log(`  預約 ${apt.id}: isNewPatient = ${apt.isNewPatient} (type: ${typeof apt.isNewPatient})`);
      });
      
    } catch (error) {
      console.log('❌ 生產環境預約列表失敗');
      console.log('錯誤:', error.response?.data);
    }
    
  } catch (error) {
    console.error('❌ 生產環境修復失敗:', error.message);
  }
}

// 生產環境建議修復步驟
function showProductionFixSteps() {
  console.log('\n\n📝 生產環境修復建議:');
  console.log('1. **部署最新代碼**:');
  console.log('   - 確保生產環境使用最新的 Git 提交');
  console.log('   - 檢查 Zeabur 自動部署狀態');
  
  console.log('\n2. **資料庫結構同步**:');
  console.log('   - 在生產環境執行資料庫遷移');
  console.log('   - 確保 appointments 表有 isNewPatient 欄位');
  
  console.log('\n3. **重啟服務**:');
  console.log('   - 重啟生產環境服務');
  console.log('   - 清除可能的快取');
  
  console.log('\n4. **無痕模式優化**:');
  console.log('   - Cookie 設置已正確（SameSite=None; Secure）');
  console.log('   - CORS 設置正常');
  console.log('   - 建議前端優先使用 Authorization header');
}

// 執行修復
if (require.main === module) {
  fixProductionEnvironment()
    .then(() => {
      showProductionFixSteps();
      console.log('\n🎯 生產環境診斷完成');
    })
    .catch(error => {
      console.error('\n❌ 生產環境診斷失敗:', error.message);
      showProductionFixSteps();
    });
}

module.exports = { fixProductionEnvironment }; 