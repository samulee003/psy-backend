const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// 要分析的數據庫文件路徑
const dbPath = 'C:\\Users\\emily\\Downloads\\database_to_clean.sqlite';

console.log('=== 開始分析被污染的數據庫 ===');
console.log('數據庫路徑:', dbPath);
console.log('');

const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READONLY, (err) => {
  if (err) {
    console.error('無法打開數據庫:', err.message);
    process.exit(1);
  }
  console.log('✅ 成功連接到數據庫');
  console.log('');
});

async function analyzeDatabase() {
  try {
    // 1. 分析 users 表
    console.log('=== 1. 分析 USERS 表 ===');
    const users = await queryAll('SELECT id, username, email, name, role, phone, created_at FROM users ORDER BY id');
    
    console.log(`總用戶數: ${users.length}`);
    console.log('');
    
    // 標記可疑的測試用戶
    const suspiciousEmails = [
      'admin@example.com',
      'doctor@example.com', 
      'patient@example.com',
      'emergency.doctor@example.com'
    ];
    
    console.log('🔍 可疑的測試用戶 (emergency-test-data.js 可能創建的):');
    const testUsers = users.filter(u => suspiciousEmails.includes(u.email));
    if (testUsers.length === 0) {
      console.log('  (沒有找到標準測試用戶)');
    } else {
      testUsers.forEach(user => {
        console.log(`  ❌ ID: ${user.id} | 郵箱: ${user.email} | 姓名: ${user.name} | 角色: ${user.role}`);
        console.log(`      創建時間: ${user.created_at}`);
      });
    }
    console.log('');
    
    console.log('✅ 可能是真實用戶的帳號:');
    const realUsers = users.filter(u => !suspiciousEmails.includes(u.email));
    if (realUsers.length === 0) {
      console.log('  (沒有找到非測試用戶，這很不正常！)');
    } else {
      realUsers.forEach(user => {
        console.log(`  ✓ ID: ${user.id} | 郵箱: ${user.email} | 姓名: ${user.name} | 角色: ${user.role}`);
        console.log(`      創建時間: ${user.created_at}`);
      });
    }
    console.log('');
    
    // 2. 分析 schedule 表
    console.log('=== 2. 分析 SCHEDULE 表 ===');
    const schedules = await queryAll('SELECT id, date, doctor_id, start_time, end_time, is_rest_day, created_at FROM schedule ORDER BY date, doctor_id');
    
    console.log(`總排班記錄數: ${schedules.length}`);
    console.log('');
    
    // 分析2025年5月的排班（emergency-test-data.js的目標月份）
    const may2025Schedules = schedules.filter(s => s.date && s.date.startsWith('2025-05'));
    console.log(`🔍 2025年5月排班記錄數 (疑似測試數據): ${may2025Schedules.length}`);
    if (may2025Schedules.length > 0) {
      console.log('2025年5月排班詳情:');
      may2025Schedules.slice(0, 10).forEach(schedule => {
        console.log(`  ID: ${schedule.id} | 日期: ${schedule.date} | 醫生ID: ${schedule.doctor_id} | 時間: ${schedule.start_time}-${schedule.end_time}`);
      });
      if (may2025Schedules.length > 10) {
        console.log(`  ... 還有 ${may2025Schedules.length - 10} 筆記錄`);
      }
    }
    console.log('');
    
    // 按醫生ID分組分析
    console.log('按醫生ID分組的排班統計:');
    const doctorScheduleCount = {};
    schedules.forEach(s => {
      doctorScheduleCount[s.doctor_id] = (doctorScheduleCount[s.doctor_id] || 0) + 1;
    });
    
    Object.entries(doctorScheduleCount).forEach(([doctorId, count]) => {
      const doctor = users.find(u => u.id == doctorId);
      const doctorInfo = doctor ? `${doctor.email} (${doctor.name})` : '未知醫生';
      const isTest = doctor && suspiciousEmails.includes(doctor.email);
      const mark = isTest ? '❌' : '✓';
      console.log(`  ${mark} 醫生ID ${doctorId} (${doctorInfo}): ${count} 筆排班`);
    });
    console.log('');
    
    // 3. 分析 appointments 表
    console.log('=== 3. 分析 APPOINTMENTS 表 ===');
    try {
      const appointments = await queryAll('SELECT id, patient_id, doctor_id, date, time, status, created_at FROM appointments ORDER BY date, time');
      console.log(`總預約記錄數: ${appointments.length}`);
      console.log('');
      
      if (appointments.length > 0) {
        console.log('前5筆預約記錄:');
        appointments.slice(0, 5).forEach(apt => {
          const patient = users.find(u => u.id == apt.patient_id);
          const doctor = users.find(u => u.id == apt.doctor_id);
          console.log(`  預約ID: ${apt.id} | 患者: ${patient?.email || 'ID:' + apt.patient_id} | 醫生: ${doctor?.email || 'ID:' + apt.doctor_id}`);
          console.log(`    日期: ${apt.date} | 時間: ${apt.time} | 狀態: ${apt.status}`);
        });
        if (appointments.length > 5) {
          console.log(`  ... 還有 ${appointments.length - 5} 筆預約`);
        }
      }
    } catch (error) {
      console.log('appointments 表可能不存在或結構不同:', error.message);
    }
    console.log('');
    
    // 4. 生成清理建議
    console.log('=== 4. 清理建議 ===');
    
    if (testUsers.length > 0) {
      console.log('🗑️  建議刪除的測試用戶:');
      testUsers.forEach(user => {
        console.log(`  - ID ${user.id}: ${user.email} (${user.name}) - 角色: ${user.role}`);
      });
      console.log('');
    }
    
    if (may2025Schedules.length > 0) {
      console.log('🗑️  建議刪除的2025年5月排班記錄:');
      const testDoctorIds = testUsers.filter(u => u.role === 'doctor').map(u => u.id);
      const testSchedules = may2025Schedules.filter(s => testDoctorIds.includes(s.doctor_id));
      if (testSchedules.length > 0) {
        console.log(`  總共 ${testSchedules.length} 筆測試醫生的排班需要刪除`);
        testSchedules.slice(0, 5).forEach(schedule => {
          console.log(`  - 排班ID ${schedule.id}: ${schedule.date}, 醫生ID ${schedule.doctor_id}`);
        });
        if (testSchedules.length > 5) {
          console.log(`  - ... 還有 ${testSchedules.length - 5} 筆`);
        }
      } else {
        console.log('  (2025年5月的排班似乎都不是測試醫生的，需要仔細檢查)');
      }
      console.log('');
    }
    
    console.log('⚠️  請仔細檢查以上分析結果，確認哪些數據是真實的，哪些需要刪除。');
    console.log('   特別注意: 如果您的真實醫生帳號恰好是 doctor@example.com，請勿刪除！');
    
  } catch (error) {
    console.error('分析過程中出錯:', error);
  } finally {
    db.close();
  }
}

function queryAll(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) {
        reject(err);
      } else {
        resolve(rows);
      }
    });
  });
}

// 執行分析
analyzeDatabase(); 