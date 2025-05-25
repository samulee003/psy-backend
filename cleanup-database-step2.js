const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');

// 要清理的數據庫文件路徑
const dbPath = 'C:\\Users\\emily\\Downloads\\database_to_clean.sqlite';
const outputFile = 'cleanup_step2_result.txt';

let output = '';

function log(message) {
  console.log(message);
  output += message + '\n';
}

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    log('無法打開數據庫:' + err.message);
    process.exit(1);
  }
  log('✅ 成功連接到數據庫');
});

async function cleanupTestSchedules() {
  try {
    log('=== 第二步：清理測試排班數據 ===');
    log('數據庫路徑: ' + dbPath);
    log('');
    
    // 首先檢查當前的醫生ID
    log('🔍 檢查當前醫生用戶:');
    const doctors = await queryAll('SELECT id, email, name FROM users WHERE role = ?', ['doctor']);
    doctors.forEach(doctor => {
      log(`  ✓ 醫生ID ${doctor.id}: ${doctor.email} (${doctor.name})`);
    });
    log('');
    
    // 檢查當前排班數據
    log('🔍 檢查排班數據分布:');
    const scheduleStats = await queryAll(`
      SELECT doctor_id, COUNT(*) as count 
      FROM schedule 
      GROUP BY doctor_id 
      ORDER BY doctor_id
    `);
    
    for (const stat of scheduleStats) {
      const doctor = doctors.find(d => d.id === stat.doctor_id);
      if (doctor) {
        log(`  ✓ 醫生ID ${stat.doctor_id} (${doctor.email}): ${stat.count} 筆排班`);
      } else {
        log(`  ❌ 醫生ID ${stat.doctor_id} (用戶不存在!): ${stat.count} 筆排班 - 需要清理`);
      }
    }
    log('');
    
    // 找出需要清理的排班（屬於不存在用戶的）
    const orphanSchedules = await queryAll(`
      SELECT s.id, s.date, s.doctor_id, s.start_time, s.end_time 
      FROM schedule s 
      LEFT JOIN users u ON s.doctor_id = u.id 
      WHERE u.id IS NULL
      ORDER BY s.date
    `);
    
    if (orphanSchedules.length > 0) {
      log(`🗑️  發現 ${orphanSchedules.length} 筆孤立排班記錄（對應的醫生用戶不存在）:`);
      orphanSchedules.slice(0, 10).forEach(schedule => {
        log(`  - 排班ID ${schedule.id}: ${schedule.date} ${schedule.start_time}-${schedule.end_time} (醫生ID: ${schedule.doctor_id})`);
      });
      if (orphanSchedules.length > 10) {
        log(`  - ... 還有 ${orphanSchedules.length - 10} 筆`);
      }
      log('');
      
      // 刪除孤立排班記錄
      log('🗑️  開始刪除孤立排班記錄...');
      const deleteResult = await runQuery(`
        DELETE FROM schedule 
        WHERE doctor_id NOT IN (SELECT id FROM users WHERE role = 'doctor')
      `);
      
      log(`✅ 已刪除 ${deleteResult.changes} 筆孤立排班記錄`);
    } else {
      log('✅ 沒有發現孤立排班記錄');
    }
    log('');
    
    // 特別檢查2025年5月的排班（emergency-test-data.js的目標）
    log('🔍 檢查2025年5月排班:');
    const may2025Schedules = await queryAll(`
      SELECT s.id, s.date, s.doctor_id, s.start_time, s.end_time, u.email
      FROM schedule s 
      LEFT JOIN users u ON s.doctor_id = u.id 
      WHERE s.date LIKE '2025-05%'
      ORDER BY s.date
    `);
    
    if (may2025Schedules.length > 0) {
      log(`發現 ${may2025Schedules.length} 筆2025年5月排班:`);
      may2025Schedules.forEach(schedule => {
        const doctorInfo = schedule.email || `未知醫生(ID:${schedule.doctor_id})`;
        log(`  - 排班ID ${schedule.id}: ${schedule.date} ${schedule.start_time}-${schedule.end_time} (${doctorInfo})`);
      });
      
      // 檢查是否有屬於已刪除醫生的2025年5月排班
      const orphanMay2025 = may2025Schedules.filter(s => !s.email);
      if (orphanMay2025.length > 0) {
        log('');
        log(`🗑️  刪除 ${orphanMay2025.length} 筆2025年5月的孤立排班...`);
        for (const schedule of orphanMay2025) {
          await runQuery('DELETE FROM schedule WHERE id = ?', [schedule.id]);
          log(`✅ 已刪除排班ID ${schedule.id}: ${schedule.date}`);
        }
      }
    } else {
      log('沒有2025年5月的排班記錄');
    }
    log('');
    
    // 最終驗證
    log('🔍 清理後的排班統計:');
    const finalStats = await queryAll(`
      SELECT u.email, u.name, COUNT(s.id) as schedule_count 
      FROM users u 
      LEFT JOIN schedule s ON u.id = s.doctor_id 
      WHERE u.role = 'doctor' 
      GROUP BY u.id, u.email, u.name
    `);
    
    finalStats.forEach(stat => {
      log(`  ✓ ${stat.email} (${stat.name}): ${stat.schedule_count} 筆排班`);
    });
    
    log('');
    log('✅ 第二步清理完成！所有孤立的排班記錄已被清理');
    
    // 保存結果到文件
    fs.writeFileSync(outputFile, output);
    log(`\n✅ 清理結果已保存到: ${outputFile}`);
    
  } catch (error) {
    log('❌ 清理過程中出錯: ' + error);
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

function runQuery(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function(err) {
      if (err) {
        reject(err);
      } else {
        resolve({ changes: this.changes, lastID: this.lastID });
      }
    });
  });
}

// 執行清理
cleanupTestSchedules(); 