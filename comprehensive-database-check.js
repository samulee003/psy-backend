const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');

const dbPath = 'C:\\Users\\emily\\Downloads\\database_to_clean.sqlite';
const outputFile = 'comprehensive_check_result.txt';

let output = '';
let errorCount = 0;
let warningCount = 0;

function log(message, type = 'info') {
  const prefix = type === 'error' ? '❌ ' : type === 'warning' ? '⚠️  ' : type === 'success' ? '✅ ' : '';
  const fullMessage = prefix + message;
  console.log(fullMessage);
  output += fullMessage + '\n';
  
  if (type === 'error') errorCount++;
  if (type === 'warning') warningCount++;
}

const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READONLY, (err) => {
  if (err) {
    log('無法打開數據庫: ' + err.message, 'error');
    process.exit(1);
  }
  log('成功連接到數據庫', 'success');
  performComprehensiveCheck();
});

async function performComprehensiveCheck() {
  try {
    log('\n🔍 ===== 全面數據庫檢查開始 =====');
    log('檢查時間: ' + new Date().toLocaleString());
    log('數據庫路徑: ' + dbPath);
    log('');
    
    // 1. 基本結構檢查
    await checkDatabaseStructure();
    
    // 2. 數據完整性檢查
    await checkDataIntegrity();
    
    // 3. 外鍵關係檢查
    await checkForeignKeyIntegrity();
    
    // 4. 業務邏輯檢查
    await checkBusinessLogic();
    
    // 5. 數據合理性檢查
    await checkDataReasonableness();
    
    // 6. 測試數據檢查
    await checkForTestData();
    
    // 7. 用戶角色檢查
    await checkUserRoles();
    
    // 8. 時間範圍檢查
    await checkTimeRanges();
    
    // 9. 預約狀態檢查
    await checkAppointmentStates();
    
    // 10. 最終總結
    generateFinalReport();
    
  } catch (error) {
    log('檢查過程中出錯: ' + error.message, 'error');
  } finally {
    // 保存檢查結果
    fs.writeFileSync(outputFile, output);
    log(`\n📄 完整檢查報告已保存到: ${outputFile}`);
    db.close();
  }
}

async function checkDatabaseStructure() {
  log('\n📋 === 1. 數據庫結構檢查 ===');
  
  try {
    // 檢查表是否存在
    const tables = await query("SELECT name FROM sqlite_master WHERE type='table'");
    const expectedTables = ['users', 'schedule', 'appointments'];
    
    expectedTables.forEach(tableName => {
      if (tables.find(t => t.name === tableName)) {
        log(`表 ${tableName} 存在`, 'success');
      } else {
        log(`缺少必要的表: ${tableName}`, 'error');
      }
    });
    
    // 檢查用戶表結構
    const userColumns = await query("PRAGMA table_info(users)");
    const expectedUserColumns = ['id', 'username', 'email', 'name', 'role', 'phone', 'password', 'created_at'];
    
    log('\n用戶表結構檢查:');
    expectedUserColumns.forEach(col => {
      if (userColumns.find(c => c.name === col)) {
        log(`  欄位 ${col} 存在`, 'success');
      } else {
        log(`  缺少用戶表欄位: ${col}`, 'warning');
      }
    });
    
  } catch (error) {
    log('結構檢查失敗: ' + error.message, 'error');
  }
}

async function checkDataIntegrity() {
  log('\n🔗 === 2. 數據完整性檢查 ===');
  
  try {
    // 檢查空值
    const emptyUsers = await query("SELECT COUNT(*) as count FROM users WHERE email IS NULL OR email = ''");
    if (emptyUsers[0].count > 0) {
      log(`發現 ${emptyUsers[0].count} 個用戶沒有郵箱`, 'error');
    } else {
      log('所有用戶都有郵箱', 'success');
    }
    
    // 檢查重複郵箱
    const duplicateEmails = await query(`
      SELECT email, COUNT(*) as count 
      FROM users 
      GROUP BY email 
      HAVING COUNT(*) > 1
    `);
    
    if (duplicateEmails.length > 0) {
      log('發現重複郵箱:', 'error');
      duplicateEmails.forEach(dup => {
        log(`  ${dup.email}: ${dup.count} 次`, 'error');
      });
    } else {
      log('沒有重複郵箱', 'success');
    }
    
    // 檢查用戶密碼
    const usersWithoutPassword = await query("SELECT COUNT(*) as count FROM users WHERE password IS NULL OR password = ''");
    if (usersWithoutPassword[0].count > 0) {
      log(`${usersWithoutPassword[0].count} 個用戶沒有密碼`, 'warning');
    } else {
      log('所有用戶都有密碼', 'success');
    }
    
  } catch (error) {
    log('數據完整性檢查失敗: ' + error.message, 'error');
  }
}

async function checkForeignKeyIntegrity() {
  log('\n🔑 === 3. 外鍵關係檢查 ===');
  
  try {
    // 檢查排班表的醫生ID
    const orphanSchedules = await query(`
      SELECT s.id, s.doctor_id 
      FROM schedule s 
      LEFT JOIN users u ON s.doctor_id = u.id 
      WHERE u.id IS NULL
    `);
    
    if (orphanSchedules.length > 0) {
      log(`發現 ${orphanSchedules.length} 筆孤立排班記錄:`, 'error');
      orphanSchedules.forEach(s => {
        log(`  排班ID ${s.id} 引用不存在的醫生ID ${s.doctor_id}`, 'error');
      });
    } else {
      log('所有排班記錄的醫生ID都有效', 'success');
    }
    
    // 檢查預約表的患者和醫生ID
    const orphanAppointments = await query(`
      SELECT a.id, a.patient_id, a.doctor_id,
             p.id as patient_exists, d.id as doctor_exists
      FROM appointments a 
      LEFT JOIN users p ON a.patient_id = p.id 
      LEFT JOIN users d ON a.doctor_id = d.id 
      WHERE p.id IS NULL OR d.id IS NULL
    `);
    
    if (orphanAppointments.length > 0) {
      log(`發現 ${orphanAppointments.length} 筆孤立預約記錄:`, 'error');
      orphanAppointments.forEach(a => {
        if (!a.patient_exists) {
          log(`  預約ID ${a.id} 引用不存在的患者ID ${a.patient_id}`, 'error');
        }
        if (!a.doctor_exists) {
          log(`  預約ID ${a.id} 引用不存在的醫生ID ${a.doctor_id}`, 'error');
        }
      });
    } else {
      log('所有預約記錄的用戶ID都有效', 'success');
    }
    
  } catch (error) {
    log('外鍵檢查失敗: ' + error.message, 'error');
  }
}

async function checkBusinessLogic() {
  log('\n💼 === 4. 業務邏輯檢查 ===');
  
  try {
    // 檢查是否有醫生
    const doctorCount = await query("SELECT COUNT(*) as count FROM users WHERE role = 'doctor'");
    if (doctorCount[0].count === 0) {
      log('系統中沒有醫生用戶！', 'error');
    } else if (doctorCount[0].count === 1) {
      log('系統中有 1 位醫生', 'success');
    } else {
      log(`系統中有 ${doctorCount[0].count} 位醫生`, 'success');
    }
    
    // 檢查醫生是否有排班
    const doctorsWithSchedule = await query(`
      SELECT u.email, u.name, COUNT(s.id) as schedule_count
      FROM users u 
      LEFT JOIN schedule s ON u.id = s.doctor_id 
      WHERE u.role = 'doctor' 
      GROUP BY u.id
    `);
    
    doctorsWithSchedule.forEach(doc => {
      if (doc.schedule_count === 0) {
        log(`醫生 ${doc.name} (${doc.email}) 沒有排班`, 'warning');
      } else {
        log(`醫生 ${doc.name} 有 ${doc.schedule_count} 筆排班`, 'success');
      }
    });
    
    // 檢查預約是否在醫生排班時間內
    const invalidAppointments = await query(`
      SELECT a.id, a.date, a.time, a.doctor_id
      FROM appointments a
      WHERE NOT EXISTS (
        SELECT 1 FROM schedule s 
        WHERE s.doctor_id = a.doctor_id 
        AND s.date = a.date
        AND s.is_rest_day = 0
      )
    `);
    
    if (invalidAppointments.length > 0) {
      log(`發現 ${invalidAppointments.length} 筆預約不在醫生排班時間內:`, 'warning');
      invalidAppointments.slice(0, 5).forEach(apt => {
        log(`  預約ID ${apt.id}: ${apt.date} ${apt.time} (醫生ID: ${apt.doctor_id})`, 'warning');
      });
    } else {
      log('所有預約都在醫生排班時間內', 'success');
    }
    
  } catch (error) {
    log('業務邏輯檢查失敗: ' + error.message, 'error');
  }
}

async function checkDataReasonableness() {
  log('\n📊 === 5. 數據合理性檢查 ===');
  
  try {
    // 檢查用戶創建時間
    const users = await query("SELECT email, name, created_at FROM users ORDER BY created_at");
    const now = new Date();
    const oneYearAgo = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
    
    let futureUsers = 0;
    let veryOldUsers = 0;
    
    users.forEach(user => {
      const createdAt = new Date(user.created_at);
      if (createdAt > now) {
        futureUsers++;
        log(`用戶 ${user.email} 創建時間在未來: ${user.created_at}`, 'warning');
      }
      if (createdAt < oneYearAgo) {
        veryOldUsers++;
      }
    });
    
    if (futureUsers === 0) {
      log('沒有用戶的創建時間在未來', 'success');
    }
    
    // 檢查預約時間合理性
    const appointments = await query("SELECT id, date, time FROM appointments");
    let futureAppointments = 0;
    let pastAppointments = 0;
    const today = now.toISOString().split('T')[0];
    
    appointments.forEach(apt => {
      if (apt.date > today) {
        futureAppointments++;
      } else {
        pastAppointments++;
      }
    });
    
    log(`未來預約: ${futureAppointments} 筆`, 'success');
    log(`過去預約: ${pastAppointments} 筆`, 'success');
    
  } catch (error) {
    log('數據合理性檢查失敗: ' + error.message, 'error');
  }
}

async function checkForTestData() {
  log('\n🧪 === 6. 測試數據檢查 ===');
  
  try {
    // 檢查可疑的測試郵箱
    const testEmails = [
      'test@example.com', 'admin@example.com', 'doctor@example.com', 
      'patient@example.com', 'demo@test.com', 'sample@sample.com'
    ];
    
    const foundTestUsers = await query(`
      SELECT email, name FROM users 
      WHERE email IN ('${testEmails.join("', '")}')
    `);
    
    if (foundTestUsers.length > 0) {
      log('發現可疑的測試用戶:', 'warning');
      foundTestUsers.forEach(user => {
        log(`  ${user.email} (${user.name})`, 'warning');
      });
    } else {
      log('沒有發現明顯的測試用戶', 'success');
    }
    
    // 檢查可疑的測試名稱
    const testNames = ['測試', 'test', 'demo', 'sample', 'admin'];
    const suspiciousNames = await query(`
      SELECT email, name FROM users 
      WHERE LOWER(name) LIKE '%test%' 
         OR LOWER(name) LIKE '%demo%' 
         OR LOWER(name) LIKE '%sample%'
         OR LOWER(email) LIKE '%test%'
         OR LOWER(email) LIKE '%demo%'
    `);
    
    if (suspiciousNames.length > 0) {
      log('發現可能的測試相關用戶:', 'warning');
      suspiciousNames.forEach(user => {
        log(`  ${user.email} (${user.name})`, 'warning');
      });
    } else {
      log('沒有發現測試相關的用戶名稱', 'success');
    }
    
  } catch (error) {
    log('測試數據檢查失敗: ' + error.message, 'error');
  }
}

async function checkUserRoles() {
  log('\n👥 === 7. 用戶角色檢查 ===');
  
  try {
    const roleStats = await query(`
      SELECT role, COUNT(*) as count 
      FROM users 
      GROUP BY role 
      ORDER BY role
    `);
    
    log('用戶角色分布:');
    roleStats.forEach(stat => {
      log(`  ${stat.role}: ${stat.count} 人`, 'success');
    });
    
    // 檢查無效角色
    const validRoles = ['doctor', 'patient', 'admin'];
    const invalidRoles = await query(`
      SELECT DISTINCT role 
      FROM users 
      WHERE role NOT IN ('${validRoles.join("', '")}')
    `);
    
    if (invalidRoles.length > 0) {
      log('發現無效的用戶角色:', 'error');
      invalidRoles.forEach(role => {
        log(`  ${role.role}`, 'error');
      });
    } else {
      log('所有用戶角色都有效', 'success');
    }
    
  } catch (error) {
    log('用戶角色檢查失敗: ' + error.message, 'error');
  }
}

async function checkTimeRanges() {
  log('\n⏰ === 8. 時間範圍檢查 ===');
  
  try {
    // 檢查排班時間範圍
    const scheduleRange = await query(`
      SELECT 
        MIN(date) as earliest_schedule,
        MAX(date) as latest_schedule,
        COUNT(*) as total_schedules
      FROM schedule
    `);
    
    if (scheduleRange[0].total_schedules > 0) {
      log(`排班時間範圍: ${scheduleRange[0].earliest_schedule} 到 ${scheduleRange[0].latest_schedule}`, 'success');
      log(`總排班記錄: ${scheduleRange[0].total_schedules} 筆`, 'success');
    }
    
    // 檢查預約時間範圍
    const appointmentRange = await query(`
      SELECT 
        MIN(date) as earliest_appointment,
        MAX(date) as latest_appointment,
        COUNT(*) as total_appointments
      FROM appointments
    `);
    
    if (appointmentRange[0].total_appointments > 0) {
      log(`預約時間範圍: ${appointmentRange[0].earliest_appointment} 到 ${appointmentRange[0].latest_appointment}`, 'success');
      log(`總預約記錄: ${appointmentRange[0].total_appointments} 筆`, 'success');
    }
    
  } catch (error) {
    log('時間範圍檢查失敗: ' + error.message, 'error');
  }
}

async function checkAppointmentStates() {
  log('\n📅 === 9. 預約狀態檢查 ===');
  
  try {
    const statusStats = await query(`
      SELECT status, COUNT(*) as count 
      FROM appointments 
      GROUP BY status
    `);
    
    log('預約狀態分布:');
    statusStats.forEach(stat => {
      log(`  ${stat.status}: ${stat.count} 筆`, 'success');
    });
    
    // 檢查無效狀態
    const validStatuses = ['confirmed', 'cancelled', 'pending'];
    const invalidStatuses = await query(`
      SELECT DISTINCT status 
      FROM appointments 
      WHERE status NOT IN ('${validStatuses.join("', '")}')
    `);
    
    if (invalidStatuses.length > 0) {
      log('發現無效的預約狀態:', 'warning');
      invalidStatuses.forEach(status => {
        log(`  ${status.status}`, 'warning');
      });
    } else {
      log('所有預約狀態都有效', 'success');
    }
    
  } catch (error) {
    log('預約狀態檢查失敗: ' + error.message, 'error');
  }
}

function generateFinalReport() {
  log('\n📋 ===== 最終檢查報告 =====');
  
  if (errorCount === 0 && warningCount === 0) {
    log('🎉 恭喜！數據庫檢查完全通過！', 'success');
    log('✅ 沒有發現任何錯誤或警告', 'success');
    log('✅ 數據庫可以安全上傳到 Zeabur', 'success');
  } else {
    log(`檢查完成，發現 ${errorCount} 個錯誤，${warningCount} 個警告`);
    
    if (errorCount > 0) {
      log('❌ 建議修復所有錯誤後再上傳', 'error');
    } else {
      log('⚠️  雖然有警告，但可以考慮上傳（請評估警告是否影響系統運行）', 'warning');
    }
  }
  
  log(`\n📊 檢查統計:`);
  log(`   ❌ 錯誤: ${errorCount} 個`);
  log(`   ⚠️  警告: ${warningCount} 個`);
  log(`   ✅ 檢查項目: 完成`);
}

function query(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
} 