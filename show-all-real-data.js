const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');

// 清理後的數據庫文件路徑
const dbPath = 'C:\\Users\\emily\\Downloads\\database_to_clean.sqlite';
const outputFile = 'all_real_data_display.txt';

let output = '';

function log(message) {
  console.log(message);
  output += message + '\n';
}

const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READONLY, (err) => {
  if (err) {
    log('無法打開數據庫:' + err.message);
    process.exit(1);
  }
  log('✅ 成功連接到數據庫');
});

async function showAllRealData() {
  try {
    log('=== 顯示所有真實數據 ===');
    log('數據庫路徑: ' + dbPath);
    log('');
    
    // 1. 所有用戶數據
    log('=== 📋 所有用戶資料 ===');
    const users = await queryAll(`
      SELECT id, username, email, name, role, phone, created_at 
      FROM users 
      ORDER BY role, id
    `);
    
    log(`總用戶數: ${users.length}`);
    log('');
    
    // 按角色分組顯示
    const usersByRole = {};
    users.forEach(user => {
      if (!usersByRole[user.role]) {
        usersByRole[user.role] = [];
      }
      usersByRole[user.role].push(user);
    });
    
    Object.keys(usersByRole).forEach(role => {
      log(`👨‍⚕️ ${role.toUpperCase()} (${usersByRole[role].length}人):`);
      usersByRole[role].forEach(user => {
        log(`  ✓ ID: ${user.id}`);
        log(`    姓名: ${user.name || '未設定'}`);
        log(`    郵箱: ${user.email}`);
        log(`    用戶名: ${user.username || '未設定'}`);
        log(`    電話: ${user.phone || '未設定'}`);
        log(`    註冊時間: ${user.created_at}`);
        log('');
      });
    });
    
    // 2. 所有排班數據
    log('=== 📅 所有排班資料 ===');
    const schedules = await queryAll(`
      SELECT s.id, s.date, s.doctor_id, s.start_time, s.end_time, s.is_rest_day, s.created_at,
             u.email, u.name
      FROM schedule s
      JOIN users u ON s.doctor_id = u.id
      ORDER BY s.date, s.start_time
    `);
    
    log(`總排班記錄數: ${schedules.length}`);
    log('');
    
    if (schedules.length > 0) {
      // 按醫生分組顯示排班
      const schedulesByDoctor = {};
      schedules.forEach(schedule => {
        const key = `${schedule.email} (${schedule.name})`;
        if (!schedulesByDoctor[key]) {
          schedulesByDoctor[key] = [];
        }
        schedulesByDoctor[key].push(schedule);
      });
      
      Object.keys(schedulesByDoctor).forEach(doctorKey => {
        const doctorSchedules = schedulesByDoctor[doctorKey];
        log(`👨‍⚕️ 醫生: ${doctorKey}`);
        log(`   排班記錄: ${doctorSchedules.length} 筆`);
        log(`   時間範圍: ${doctorSchedules[0].date} 到 ${doctorSchedules[doctorSchedules.length-1].date}`);
        log('');
        
        // 顯示前10筆排班詳情
        log('   排班詳情 (前10筆):');
        doctorSchedules.slice(0, 10).forEach(schedule => {
          const restStatus = schedule.is_rest_day ? ' (休息日)' : '';
          log(`     📅 ${schedule.date} ${schedule.start_time}-${schedule.end_time}${restStatus}`);
        });
        
        if (doctorSchedules.length > 10) {
          log(`     ... 還有 ${doctorSchedules.length - 10} 筆排班`);
        }
        log('');
      });
    }
    
    // 3. 所有預約數據
    log('=== 📞 所有預約資料 ===');
    const appointments = await queryAll(`
      SELECT a.id, a.patient_id, a.doctor_id, a.date, a.time, a.status, a.patient_info, a.created_at,
             p.email as patient_email, p.name as patient_name,
             d.email as doctor_email, d.name as doctor_name
      FROM appointments a
      JOIN users p ON a.patient_id = p.id
      JOIN users d ON a.doctor_id = d.id
      ORDER BY a.date, a.time
    `);
    
    log(`總預約記錄數: ${appointments.length}`);
    log('');
    
    if (appointments.length > 0) {
      // 按狀態分組統計
      const appointmentsByStatus = {};
      appointments.forEach(apt => {
        appointmentsByStatus[apt.status] = (appointmentsByStatus[apt.status] || 0) + 1;
      });
      
      log('📊 預約狀態統計:');
      Object.entries(appointmentsByStatus).forEach(([status, count]) => {
        log(`  ${status}: ${count} 筆`);
      });
      log('');
      
      // 按醫生分組顯示預約
      const appointmentsByDoctor = {};
      appointments.forEach(apt => {
        const key = `${apt.doctor_email} (${apt.doctor_name})`;
        if (!appointmentsByDoctor[key]) {
          appointmentsByDoctor[key] = [];
        }
        appointmentsByDoctor[key].push(apt);
      });
      
      Object.keys(appointmentsByDoctor).forEach(doctorKey => {
        const doctorAppointments = appointmentsByDoctor[doctorKey];
        log(`👨‍⚕️ 醫生: ${doctorKey}`);
        log(`   預約記錄: ${doctorAppointments.length} 筆`);
        log('');
        
        // 顯示所有預約詳情
        log('   預約詳情:');
        doctorAppointments.forEach(apt => {
          log(`     📞 預約ID: ${apt.id}`);
          log(`        患者: ${apt.patient_email} (${apt.patient_name})`);
          log(`        時間: ${apt.date} ${apt.time}`);
          log(`        狀態: ${apt.status}`);
          if (apt.patient_info) {
            try {
              const patientInfo = JSON.parse(apt.patient_info);
              log(`        患者資訊: ${patientInfo.name || '未提供'} | 電話: ${patientInfo.phone || '未提供'}`);
            } catch (e) {
              log(`        患者資訊: ${apt.patient_info}`);
            }
          }
          log(`        建立時間: ${apt.created_at}`);
          log('');
        });
      });
    }
    
    // 4. 數據摘要
    log('=== 📈 數據摘要 ===');
    log(`👥 總用戶數: ${users.length}`);
    log(`👨‍⚕️ 醫生數量: ${usersByRole.doctor ? usersByRole.doctor.length : 0}`);
    log(`👤 患者數量: ${usersByRole.patient ? usersByRole.patient.length : 0}`);
    log(`📅 排班記錄: ${schedules.length} 筆`);
    log(`📞 預約記錄: ${appointments.length} 筆`);
    log('');
    
    // 檢查數據完整性
    log('=== ✅ 數據完整性檢查 ===');
    
    // 檢查重要用戶是否存在
    const importantUsers = ['[REDACTED]@gmail.com', 'testing@gmail.com', 'samu003@gmail.com'];
    importantUsers.forEach(email => {
      const user = users.find(u => u.email === email);
      if (user) {
        log(`✅ 重要用戶存在: ${email} (${user.name}) - 角色: ${user.role}`);
      } else {
        log(`❌ 重要用戶缺失: ${email}`);
      }
    });
    
    log('');
    log('🎉 所有真實數據展示完成！');
    
    // 保存結果到文件
    fs.writeFileSync(outputFile, output);
    log(`\n📄 詳細數據已保存到: ${outputFile}`);
    
  } catch (error) {
    log('❌ 展示數據過程中出錯: ' + error);
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

// 執行展示
showAllRealData(); 