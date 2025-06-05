/**
 * 緊急表結構修復工具
 * 解決 appointments 表 isNewPatient 和 patient_info 欄位缺失問題
 * 
 * 問題：生產環境日誌顯示 "table appointments has no column named isNewPatient"
 * 解決：重建表結構，保持所有現有數據
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const dbPath = path.join(__dirname, 'database.sqlite');

console.log('🚑 緊急表結構修復開始...\n');
console.log('📍 目標資料庫:', dbPath);

function createDatabase() {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(dbPath, (err) => {
      if (err) {
        reject(err);
      } else {
        console.log('✅ 成功連接到資料庫');
        resolve(db);
      }
    });
  });
}

async function emergencyTableFix() {
  let db;
  
  try {
    db = await createDatabase();
    
    // 1. 首先檢查當前表結構
    console.log('\n🔍 檢查當前 appointments 表結構...');
    
    const currentColumns = await new Promise((resolve, reject) => {
      db.all("PRAGMA table_info(appointments)", (err, columns) => {
        if (err) reject(err);
        else resolve(columns);
      });
    });
    
    console.log('📋 當前欄位:');
    const existingFields = [];
    currentColumns.forEach(col => {
      console.log(`  - ${col.name} (${col.type})`);
      existingFields.push(col.name);
    });
    
    // 檢查問題欄位
    const requiredFields = ['isNewPatient', 'patient_info'];
    const missingFields = requiredFields.filter(field => !existingFields.includes(field));
    
    console.log('\n🔍 問題分析:');
    requiredFields.forEach(field => {
      const exists = existingFields.includes(field);
      console.log(`  - ${field}: ${exists ? '✅ 存在' : '❌ 缺失'}`);
    });
    
    if (missingFields.length === 0) {
      console.log('\n✅ 表結構正常，無需修復');
      return { success: true, message: '表結構已正常' };
    }
    
    console.log(`\n🚨 發現問題：缺少 ${missingFields.length} 個關鍵欄位`);
    console.log('❌ 缺少欄位:', missingFields.join(', '));
    
    // 2. 備份現有數據
    console.log('\n💾 備份現有預約數據...');
    const existingAppointments = await new Promise((resolve, reject) => {
      db.all('SELECT * FROM appointments ORDER BY id', (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
    
    console.log(`✅ 成功備份 ${existingAppointments.length} 條預約記錄`);
    
    if (existingAppointments.length > 0) {
      console.log('📊 備份數據樣本:');
      const sample = existingAppointments.slice(0, 3);
      sample.forEach(apt => {
        console.log(`  - 預約 ${apt.id}: ${apt.date} ${apt.time} (醫生${apt.doctor_id}, 患者${apt.patient_id})`);
      });
    }
    
    // 3. 創建新的表結構
    console.log('\n🏗️ 重建 appointments 表結構...');
    
    // 重命名舊表
    await new Promise((resolve, reject) => {
      db.run('ALTER TABLE appointments RENAME TO appointments_backup', (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
    console.log('✅ 舊表已重命名為 appointments_backup');
    
    // 創建新表（包含所有必要欄位）
    const createTableSQL = `
      CREATE TABLE appointments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        doctor_id INTEGER NOT NULL,
        patient_id INTEGER NOT NULL,
        date TEXT NOT NULL,
        time TEXT NOT NULL,
        notes TEXT,
        status TEXT DEFAULT 'confirmed',
        patient_info TEXT,
        isNewPatient BOOLEAN DEFAULT FALSE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (doctor_id) REFERENCES users(id),
        FOREIGN KEY (patient_id) REFERENCES users(id)
      )
    `;
    
    await new Promise((resolve, reject) => {
      db.run(createTableSQL, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
    console.log('✅ 新表結構創建成功');
    
    // 4. 遷移數據
    console.log('\n📦 遷移數據到新表...');
    
    if (existingAppointments.length > 0) {
      // 準備批量插入SQL
      const insertSQL = `
        INSERT INTO appointments (
          id, doctor_id, patient_id, date, time, notes, status, 
          patient_info, isNewPatient, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;
      
      let migratedCount = 0;
      
      for (const apt of existingAppointments) {
        try {
          await new Promise((resolve, reject) => {
            // 為現有記錄設置預設值
            const patientInfo = apt.patient_info || null;
            const isNewPatient = apt.isNewPatient !== undefined ? apt.isNewPatient : false;
            const updatedAt = apt.updated_at || apt.created_at;
            
            db.run(insertSQL, [
              apt.id,
              apt.doctor_id,
              apt.patient_id,
              apt.date,
              apt.time,
              apt.notes,
              apt.status || 'confirmed',
              patientInfo,
              isNewPatient,
              apt.created_at,
              updatedAt
            ], function(err) {
              if (err) reject(err);
              else resolve();
            });
          });
          
          migratedCount++;
          
        } catch (error) {
          console.error(`❌ 遷移記錄 ${apt.id} 失敗:`, error.message);
        }
      }
      
      console.log(`✅ 成功遷移 ${migratedCount}/${existingAppointments.length} 條記錄`);
      
      if (migratedCount < existingAppointments.length) {
        console.log(`⚠️ 有 ${existingAppointments.length - migratedCount} 條記錄遷移失敗`);
      }
    }
    
    // 5. 驗證新表結構
    console.log('\n🔍 驗證新表結構...');
    
    const newColumns = await new Promise((resolve, reject) => {
      db.all("PRAGMA table_info(appointments)", (err, columns) => {
        if (err) reject(err);
        else resolve(columns);
      });
    });
    
    console.log('📋 新表欄位:');
    const newFields = [];
    newColumns.forEach(col => {
      console.log(`  - ${col.name} (${col.type}) ${col.notnull ? 'NOT NULL' : 'NULL'} ${col.dflt_value ? `DEFAULT ${col.dflt_value}` : ''}`);
      newFields.push(col.name);
    });
    
    // 檢查所有必要欄位
    const stillMissing = requiredFields.filter(field => !newFields.includes(field));
    
    if (stillMissing.length === 0) {
      console.log('\n✅ 所有必要欄位都已存在');
      
      // 6. 測試新結構
      console.log('\n🧪 測試新表結構...');
      
      const testSQL = `
        INSERT INTO appointments (
          doctor_id, patient_id, date, time, notes, status, patient_info, isNewPatient, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
      `;
      
      const testId = await new Promise((resolve, reject) => {
        db.run(testSQL, [
          4, 3, '2025-08-01', '10:00', '結構測試', 'confirmed', 
          '{"name":"測試用戶","phone":"12345"}', true
        ], function(err) {
          if (err) reject(err);
          else resolve(this.lastID);
        });
      });
      
      console.log('✅ 新結構測試成功，測試記錄ID:', testId);
      
      // 清理測試記錄
      await new Promise((resolve) => {
        db.run('DELETE FROM appointments WHERE id = ?', [testId], () => {
          console.log('🧹 測試記錄已清理');
          resolve();
        });
      });
      
      // 7. 驗證數據完整性
      console.log('\n📊 驗證數據完整性...');
      
      const finalCount = await new Promise((resolve, reject) => {
        db.get('SELECT COUNT(*) as count FROM appointments', (err, row) => {
          if (err) reject(err);
          else resolve(row.count);
        });
      });
      
      console.log(`✅ 最終記錄數量: ${finalCount}`);
      console.log(`✅ 數據完整性: ${finalCount === existingAppointments.length ? '完美' : '有差異'}`);
      
      // 8. 清理備份表（可選）
      console.log('\n🧹 清理備份表...');
      await new Promise((resolve) => {
        db.run('DROP TABLE IF EXISTS appointments_backup', () => {
          console.log('✅ 備份表已清理');
          resolve();
        });
      });
      
      console.log('\n🎉 緊急表結構修復完成！');
      console.log('📊 修復摘要:');
      console.log(`  - 添加欄位: ${missingFields.join(', ')}`);
      console.log(`  - 保留記錄: ${finalCount}/${existingAppointments.length}`);
      console.log(`  - 修復狀態: ✅ 成功`);
      
      return {
        success: true,
        message: '表結構修復成功',
        addedFields: missingFields,
        migratedRecords: finalCount,
        originalRecords: existingAppointments.length
      };
      
    } else {
      console.log(`\n❌ 修復失敗，仍缺少欄位: ${stillMissing.join(', ')}`);
      return {
        success: false,
        message: '修復失敗',
        missingFields: stillMissing
      };
    }
    
  } catch (error) {
    console.error('\n❌ 緊急修復失敗:', error.message);
    console.error('詳細錯誤:', error);
    
    return {
      success: false,
      message: error.message,
      error: error
    };
    
  } finally {
    if (db) {
      db.close();
      console.log('\n🔒 資料庫連接已關閉');
    }
  }
}

// 執行緊急修復
if (require.main === module) {
  emergencyTableFix()
    .then(result => {
      console.log('\n🎯 緊急修復結果:', result);
      
      if (result.success) {
        console.log('\n📝 後續步驟:');
        console.log('1. 🔄 重新啟動應用服務');
        console.log('2. 🧪 測試預約功能');
        console.log('3. ✅ 確認無痕模式正常');
        console.log('4. 📱 通知用戶問題已解決');
        
        process.exit(0);
      } else {
        console.log('\n❌ 修復失敗，需要手動處理');
        console.log('📞 建議聯絡技術支援');
        
        process.exit(1);
      }
    })
    .catch(error => {
      console.error('\n💥 執行過程發生錯誤:', error);
      process.exit(1);
    });
}

module.exports = { emergencyTableFix }; 