/**
 * 診斷無痕模式預約問題
 * 專門檢查無痕模式下的認證、Cookie、CORS問題
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:5000';
const PRODUCTION_URL = 'https://psy-backend.zeabur.app';

// 測試用戶
const TEST_USER = {
  email: 'samu003@gmail.com',
  password: 'sam003'
};

async function diagnoseIncognitoIssue() {
  console.log('🕵️ 診斷無痕模式預約問題...\n');
  
  // 檢查兩個環境
  const environments = [
    { name: '本地環境', url: BASE_URL },
    { name: '生產環境', url: PRODUCTION_URL }
  ];
  
  for (const env of environments) {
    console.log(`\n🌐 測試 ${env.name} (${env.url})`);
    console.log('='.repeat(50));
    
    try {
      // 1. 測試基本連接
      console.log('\n1️⃣ 測試基本連接...');
      try {
        const healthResponse = await axios.get(`${env.url}/api/health`, {
          timeout: 5000,
          validateStatus: () => true // 接受所有狀態碼
        });
        console.log(`✅ 基本連接: ${healthResponse.status}`);
      } catch (error) {
        console.log(`❌ 基本連接失敗: ${error.code || error.message}`);
        continue; // 跳過這個環境
      }
      
      // 2. 測試CORS預檢
      console.log('\n2️⃣ 測試CORS預檢...');
      try {
        const corsResponse = await axios.options(`${env.url}/api/auth/login`, {
          headers: {
            'Origin': 'https://therapy-booking.zeabur.app',
            'Access-Control-Request-Method': 'POST',
            'Access-Control-Request-Headers': 'Content-Type'
          },
          timeout: 5000
        });
        console.log(`✅ CORS預檢: ${corsResponse.status}`);
        console.log('CORS頭部:', {
          'Access-Control-Allow-Origin': corsResponse.headers['access-control-allow-origin'],
          'Access-Control-Allow-Methods': corsResponse.headers['access-control-allow-methods'],
          'Access-Control-Allow-Headers': corsResponse.headers['access-control-allow-headers'],
          'Access-Control-Allow-Credentials': corsResponse.headers['access-control-allow-credentials']
        });
      } catch (error) {
        console.log(`⚠️ CORS預檢問題: ${error.response?.status || error.message}`);
      }
      
      // 3. 測試登入（模擬無痕模式）
      console.log('\n3️⃣ 測試登入（模擬無痕模式）...');
      try {
        const loginResponse = await axios.post(`${env.url}/api/auth/login`, TEST_USER, {
          headers: {
            'Content-Type': 'application/json',
            'Origin': 'https://therapy-booking.zeabur.app',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36'
          },
          withCredentials: true, // 重要：發送Cookie
          timeout: 10000
        });
        
        console.log(`✅ 登入成功: ${loginResponse.status}`);
        console.log('登入回應:', {
          success: loginResponse.data.success,
          hasToken: !!loginResponse.data.token,
          tokenLength: loginResponse.data.token?.length || 0,
          user: loginResponse.data.user?.name
        });
        
        // 檢查Set-Cookie頭部
        const setCookieHeader = loginResponse.headers['set-cookie'];
        console.log('Set-Cookie頭部:', setCookieHeader);
        
        const token = loginResponse.data.token;
        
        // 4. 測試獲取醫生列表
        console.log('\n4️⃣ 測試獲取醫生列表...');
        try {
          const doctorsResponse = await axios.get(`${env.url}/api/users/doctors`, {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Origin': 'https://therapy-booking.zeabur.app'
            },
            withCredentials: true,
            timeout: 5000
          });
          
          console.log(`✅ 醫生列表: ${doctorsResponse.status}`);
          console.log('醫生數量:', doctorsResponse.data.doctors?.length || 0);
        } catch (error) {
          console.log(`❌ 醫生列表失敗: ${error.response?.status || error.message}`);
          console.log('錯誤詳情:', error.response?.data);
        }
        
        // 5. 測試創建預約（關鍵測試）
        console.log('\n5️⃣ 測試創建預約...');
        const testAppointment = {
          doctorId: 4,
          patientId: 3,
          appointmentDate: '2025-07-15',
          timeSlot: '10:00',
          reason: '無痕模式測試',
          notes: '測試無痕模式下的預約功能',
          isNewPatient: false,
          patientInfo: {
            name: '無痕測試用戶',
            phone: '62998036',
            email: 'samu003@gmail.com'
          }
        };
        
        try {
          const appointmentResponse = await axios.post(`${env.url}/api/appointments`, testAppointment, {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
              'Origin': 'https://therapy-booking.zeabur.app'
            },
            withCredentials: true,
            timeout: 10000
          });
          
          console.log(`✅ 預約創建成功: ${appointmentResponse.status}`);
          console.log('預約詳情:', {
            id: appointmentResponse.data.appointment?.id,
            success: appointmentResponse.data.success,
            message: appointmentResponse.data.message
          });
          
        } catch (error) {
          console.log(`❌ 預約創建失敗: ${error.response?.status || error.message}`);
          console.log('錯誤詳情:', error.response?.data);
          
          // 詳細分析錯誤
          if (error.response?.status === 401) {
            console.log('🔍 401錯誤 - 可能是認證問題');
            console.log('- 檢查Token是否有效');
            console.log('- 檢查Cookie是否正確設置');
          } else if (error.response?.status === 403) {
            console.log('🔍 403錯誤 - 可能是權限問題');
          } else if (error.response?.status === 500) {
            console.log('🔍 500錯誤 - 可能是服務器問題');
          } else if (error.code === 'ECONNRESET') {
            console.log('🔍 連接重置 - 可能是網路問題');
          }
        }
        
      } catch (loginError) {
        console.log(`❌ 登入失敗: ${loginError.response?.status || loginError.message}`);
        console.log('登入錯誤詳情:', loginError.response?.data);
      }
      
    } catch (envError) {
      console.log(`❌ ${env.name} 測試失敗:`, envError.message);
    }
  }
  
  // 6. 提供無痕模式建議
  console.log('\n\n🔧 無痕模式問題解決建議:');
  console.log('1. **Cookie設置**:');
  console.log('   - 確保SameSite=None');
  console.log('   - 確保Secure=true（HTTPS環境）');
  console.log('   - 確保HttpOnly設置適當');
  
  console.log('\n2. **CORS設置**:');
  console.log('   - 確保Access-Control-Allow-Credentials: true');
  console.log('   - 確保Origin設置正確');
  console.log('   - 檢查預檢請求處理');
  
  console.log('\n3. **前端調整**:');
  console.log('   - 確保withCredentials: true');
  console.log('   - 檢查Token存儲方式');
  console.log('   - 考慮使用Authorization header而非Cookie');
  
  console.log('\n4. **無痕模式特殊性**:');
  console.log('   - 第三方Cookie可能被阻擋');
  console.log('   - LocalStorage可能受限');
  console.log('   - 建議優先使用Authorization header');
}

// 執行診斷
if (require.main === module) {
  diagnoseIncognitoIssue()
    .then(() => {
      console.log('\n🎯 無痕模式診斷完成');
    })
    .catch(error => {
      console.error('\n❌ 診斷失敗:', error.message);
    });
}

module.exports = { diagnoseIncognitoIssue }; 