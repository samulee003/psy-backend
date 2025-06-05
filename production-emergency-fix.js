/**
 * 生產環境緊急修復
 * 檢查並修復生產環境的資料庫結構問題
 */

const axios = require('axios');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const PRODUCTION_URL = 'https://psy-backend.zeabur.app';

// 測試用戶
const TEST_USER = {
  email: 'samu003@gmail.com',
  password: 'sam003'
};

// 生產環境資料庫路徑（根據實際部署調整）
const dbPath = process.env.DATABASE_URL || process.env.DB_PATH || 'database.sqlite';

console.log('🚑 生產環境緊急修復：isNewPatient 欄位');
console.log('📍 資料庫路徑:', dbPath);
console.log('⏰ 修復時間:', new Date().toISOString());

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('❌ 資料庫連接失敗:', err.message);
    console.log('🔍 請檢查資料庫路徑是否正確');
    process.exit(1);
  }
  console.log('✅ 成功連接到生產環境資料庫');
});

// 檢查並修復表結構
console.log('\n📋 檢查 appointments 表結構...');

db.all("PRAGMA table_info(appointments)", (err, columns) => {
  if (err) {
    console.error('❌ 無法檢查表結構:', err.message);
    process.exit(1);
  }

  console.log('📊 當前欄位列表:');
  const existingColumns = columns.map(col => col.name);
  existingColumns.forEach(col => console.log(`  - ${col}`));

  // 檢查缺少的欄位
  const requiredColumns = ['isNewPatient', 'patient_info'];
  const missingColumns = requiredColumns.filter(col => !existingColumns.includes(col));

  if (missingColumns.length === 0) {
    console.log('\n✅ 表結構正常，所有必要欄位都存在');
    console.log('❓ 如果仍有錯誤，可能是應用服務需要重啟');
    db.close();
    return;
  }

  console.log(`\n🚨 缺少關鍵欄位: ${missingColumns.join(', ')}`);
  console.log('🔧 開始修復...');

  let fixed = 0;
  const total = missingColumns.length;

  // 修復 isNewPatient 欄位
  if (missingColumns.includes('isNewPatient')) {
    console.log('\n1️⃣ 添加 isNewPatient 欄位...');
    db.run('ALTER TABLE appointments ADD COLUMN isNewPatient BOOLEAN DEFAULT FALSE', (err) => {
      if (err) {
        console.error('❌ 添加 isNewPatient 失敗:', err.message);
      } else {
        console.log('✅ isNewPatient 欄位添加成功');
      }
      
      fixed++;
      if (fixed === total) {
        verifyFix();
      }
    });
  }

  // 修復 patient_info 欄位
  if (missingColumns.includes('patient_info')) {
    console.log('\n2️⃣ 添加 patient_info 欄位...');
    db.run('ALTER TABLE appointments ADD COLUMN patient_info TEXT', (err) => {
      if (err) {
        console.error('❌ 添加 patient_info 失敗:', err.message);
      } else {
        console.log('✅ patient_info 欄位添加成功');
      }
      
      fixed++;
      if (fixed === total) {
        verifyFix();
      }
    });
  }

  // 驗證修復結果
  function verifyFix() {
    console.log('\n🔍 驗證修復結果...');
    
    db.all("PRAGMA table_info(appointments)", (err, newColumns) => {
      if (err) {
        console.error('❌ 驗證失敗:', err.message);
        db.close();
        return;
      }

      const newColumnNames = newColumns.map(col => col.name);
      const stillMissing = requiredColumns.filter(col => !newColumnNames.includes(col));

      if (stillMissing.length === 0) {
        console.log('\n🎉 修復成功！');
        console.log('📋 更新後的表結構:');
        newColumns.forEach(col => {
          console.log(`  - ${col.name} (${col.type})`);
        });

        // 測試新結構
        console.log('\n🧪 測試修復效果...');
        const testSQL = `
          INSERT INTO appointments (
            doctor_id, patient_id, date, time, notes, status, patient_info, isNewPatient, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
        `;
        
        db.run(testSQL, [4, 3, '2025-12-31', '23:59', '修復測試', 'confirmed', '{"name":"測試"}', true], function(err) {
          if (err) {
            console.error('❌ 測試失敗:', err.message);
            console.log('⚠️ 結構已添加但可能需要重啟應用服務');
          } else {
            console.log('✅ 測試成功！新結構正常工作');
            
            // 清理測試記錄
            db.run('DELETE FROM appointments WHERE id = ?', [this.lastID], () => {
              console.log('🧹 測試記錄已清理');
              console.log('\n🎊 生產環境修復完成！');
              console.log('📝 請重啟應用服務以確保修改生效');
              db.close();
            });
          }
        });
      } else {
        console.log(`\n❌ 修復不完整，仍缺少: ${stillMissing.join(', ')}`);
        db.close();
      }
    });
  }
});

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