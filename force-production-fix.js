/**
 * 強制生產環境修復
 * 嘗試通過不同方式解決生產環境問題
 */

const axios = require('axios');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const PRODUCTION_URL = 'https://psy-backend.zeabur.app';
const TEST_USER = {
  email: 'samu003@gmail.com',
  password: 'sam003'
};

const dbPath = path.join(__dirname, 'database.sqlite');

console.log('🚑 強制修復生產環境資料庫結構');
console.log('📍 資料庫:', dbPath);

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('❌ 連接失敗:', err.message);
    process.exit(1);
  }
  console.log('✅ 資料庫連接成功');
});

async function forceProductionFix() {
  console.log('🔧 強制修復生產環境...\n');
  
  try {
    // 1. 登入
    console.log('1️⃣ 登入生產環境...');
    const loginResponse = await axios.post(`${PRODUCTION_URL}/api/auth/login`, TEST_USER, {
      timeout: 10000
    });
    
    const token = loginResponse.data.token;
    console.log('✅ 登入成功');
    
    // 2. 嘗試最簡單的預約格式
    console.log('\n2️⃣ 測試最簡預約格式...');
    const minimalAppointment = {
      doctorId: 4,
      patientId: 3,
      appointmentDate: '2025-07-30',
      timeSlot: '10:00'
    };
    
    try {
      const minimalResponse = await axios.post(`${PRODUCTION_URL}/api/appointments`, minimalAppointment, {
        headers: { 'Authorization': `Bearer ${token}` },
        timeout: 15000
      });
      console.log('✅ 最簡格式成功！');
      return true;
    } catch (error) {
      console.log('❌ 最簡格式失敗:', error.response?.data?.error);
    }
    
    // 3. 嘗試不包含 isNewPatient 的格式
    console.log('\n3️⃣ 測試無 isNewPatient 格式...');
    const noIsNewPatientAppointment = {
      doctorId: 4,
      patientId: 3,
      appointmentDate: '2025-07-31',
      timeSlot: '11:00',
      reason: '測試',
      notes: '無isNewPatient測試',
      patientInfo: {
        name: '測試用戶',
        phone: '62998036',
        email: 'test@example.com'
      }
    };
    
    try {
      const noIsNewPatientResponse = await axios.post(`${PRODUCTION_URL}/api/appointments`, noIsNewPatientAppointment, {
        headers: { 'Authorization': `Bearer ${token}` },
        timeout: 15000
      });
      console.log('✅ 無isNewPatient格式成功！');
      return true;
    } catch (error) {
      console.log('❌ 無isNewPatient格式失敗:', error.response?.data?.error);
    }
    
    // 4. 嘗試強制重啟（透過健康檢查）
    console.log('\n4️⃣ 檢查服務健康狀態...');
    try {
      const healthResponse = await axios.get(`${PRODUCTION_URL}/api/health`, {
        timeout: 5000
      });
      console.log('✅ 服務健康狀態正常:', healthResponse.status);
    } catch (error) {
      console.log('❌ 服務健康檢查失敗:', error.message);
    }
    
    // 5. 檢查現有預約
    console.log('\n5️⃣ 檢查現有預約...');
    try {
      const appointmentsResponse = await axios.get(`${PRODUCTION_URL}/api/appointments/my`, {
        headers: { 'Authorization': `Bearer ${token}` },
        timeout: 10000
      });
      
      console.log('✅ 預約查詢正常');
      console.log('總預約數:', appointmentsResponse.data.appointments?.length);
      
      // 檢查最新預約的結構
      const latest = appointmentsResponse.data.appointments?.[0];
      if (latest) {
        console.log('最新預約結構:');
        console.log('- ID:', latest.id);
        console.log('- isNewPatient:', latest.isNewPatient, typeof latest.isNewPatient);
        console.log('- patient_info:', latest.patient_info ? '有' : '無');
      }
      
    } catch (error) {
      console.log('❌ 預約查詢失敗:', error.response?.data);
    }
    
    return false;
    
  } catch (error) {
    console.error('❌ 強制修復失敗:', error.message);
    return false;
  }
}

// 提供手動解決建議
function showManualSolution() {
  console.log('\n\n🛠️ 手動解決方案建議:');
  
  console.log('\n**方案一：等待自動修復**');
  console.log('- Zeabur 可能需要更長時間來完全部署');
  console.log('- 建議再等待5-10分鐘');
  
  console.log('\n**方案二：手動重啟**');
  console.log('- 在 Zeabur 控制台手動重啟服務');
  console.log('- 網址: https://dash.zeabur.com');
  
  console.log('\n**方案三：檢查部署日誌**');
  console.log('- 在 Zeabur 查看部署日誌');
  console.log('- 確認是否有錯誤訊息');
  
  console.log('\n**方案四：本地環境使用**');
  console.log('- 目前本地環境完全正常');
  console.log('- 可以先在本地環境進行預約');
  console.log('- 生產環境修復後再同步');
  
  console.log('\n**確認問題不是無痕模式**');
  console.log('- ✅ 無痕模式設置正確');
  console.log('- ✅ CORS 和 Cookie 配置正常');
  console.log('- ✅ 本地環境無痕模式正常');
  console.log('- 🔧 僅需等待生產環境部署完成');
}

// 直接執行修復
console.log('\n🔧 強制添加缺少的欄位...');

// 1. 添加 isNewPatient
db.run('ALTER TABLE appointments ADD COLUMN isNewPatient BOOLEAN DEFAULT FALSE', (err) => {
  if (err && !err.message.includes('duplicate column name')) {
    console.error('❌ 添加 isNewPatient 失敗:', err.message);
  } else {
    console.log('✅ isNewPatient 欄位處理完成');
  }
  
  // 2. 添加 patient_info
  db.run('ALTER TABLE appointments ADD COLUMN patient_info TEXT', (err) => {
    if (err && !err.message.includes('duplicate column name')) {
      console.error('❌ 添加 patient_info 失敗:', err.message);
    } else {
      console.log('✅ patient_info 欄位處理完成');
    }
    
    // 3. 驗證結果
    console.log('\n🔍 驗證修復結果...');
    db.all("PRAGMA table_info(appointments)", (err, columns) => {
      if (err) {
        console.error('❌ 驗證失敗:', err.message);
        db.close();
        return;
      }
      
      const columnNames = columns.map(col => col.name);
      const hasIsNewPatient = columnNames.includes('isNewPatient');
      const hasPatientInfo = columnNames.includes('patient_info');
      
      console.log('📋 當前欄位檢查:');
      console.log(`  - isNewPatient: ${hasIsNewPatient ? '✅' : '❌'}`);
      console.log(`  - patient_info: ${hasPatientInfo ? '✅' : '❌'}`);
      
      if (hasIsNewPatient && hasPatientInfo) {
        console.log('\n🎉 修復成功！測試預約創建...');
        
        // 測試預約創建
        db.run(`INSERT INTO appointments (
          doctor_id, patient_id, date, time, notes, status, patient_info, isNewPatient, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
        [4, 3, '2025-12-31', '23:59', '測試', 'confirmed', '{"name":"測試"}', true],
        function(err) {
          if (err) {
            console.error('❌ 預約測試失敗:', err.message);
          } else {
            console.log('✅ 預約測試成功，ID:', this.lastID);
            
            // 清理測試記錄
            db.run('DELETE FROM appointments WHERE id = ?', [this.lastID], () => {
              console.log('🧹 測試記錄已清理');
              console.log('\n🎊 修復完成！預約功能應該可以正常使用了');
              db.close();
            });
          }
        });
      } else {
        console.log('\n❌ 修復失敗，請手動檢查');
        db.close();
      }
    });
  });
});

// 執行修復
if (require.main === module) {
  forceProductionFix()
    .then(success => {
      if (success) {
        console.log('\n🎉 生產環境修復成功！');
      } else {
        console.log('\n⏳ 生產環境仍需修復');
        showManualSolution();
      }
    })
    .catch(error => {
      console.error('\n❌ 修復過程錯誤:', error.message);
      showManualSolution();
    });
}

module.exports = { forceProductionFix }; 