const sqlite3 = require('sqlite3').verbose();
const path = require('path');

console.log('🧪 測試完整預約創建流程');
console.log('=====================================\n');

// 使用與應用相同的資料庫路徑邏輯
const dbPath = process.env.DB_PATH || path.join(__dirname, 'database.sqlite');
console.log('📍 資料庫路徑:', dbPath);

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('❌ 無法連接資料庫:', err.message);
    process.exit(1);
  }
  console.log('✅ 已連接到資料庫\n');
});

// 1. 檢查表結構
console.log('1️⃣ 檢查 appointments 表結構');
console.log('─'.repeat(50));

db.all("PRAGMA table_info(appointments)", [], (err, columns) => {
  if (err) {
    console.error('❌ 檢查表結構失敗:', err.message);
    db.close();
    return;
  }

  console.log('📋 完整欄位列表:');
  columns.forEach((col, index) => {
    console.log(`  ${index + 1}. ${col.name} (${col.type}) ${col.notnull ? 'NOT NULL' : ''} ${col.dflt_value ? 'DEFAULT ' + col.dflt_value : ''}`);
  });

  const columnNames = columns.map(col => col.name);
  const hasIsNewPatient = columnNames.includes('isNewPatient');
  const hasPatientInfo = columnNames.includes('patient_info');

  console.log('\n🔍 關鍵欄位檢查:');
  console.log(`  - isNewPatient: ${hasIsNewPatient ? '✅ 存在' : '❌ 不存在'}`);
  console.log(`  - patient_info: ${hasPatientInfo ? '✅ 存在' : '❌ 不存在'}`);

  if (!hasIsNewPatient || !hasPatientInfo) {
    console.log('\n❌ 關鍵欄位缺失，無法繼續測試');
    db.close();
    return;
  }

  // 2. 檢查用戶數據
  console.log('\n2️⃣ 檢查測試用戶數據');
  console.log('─'.repeat(50));

  db.all('SELECT id, name, email, role FROM users WHERE role IN ("doctor", "patient") ORDER BY role, id', [], (err, users) => {
    if (err) {
      console.error('❌ 查詢用戶失敗:', err.message);
      db.close();
      return;
    }

    console.log('👥 用戶列表:');
    users.forEach(user => {
      console.log(`  - ID: ${user.id}, 姓名: ${user.name}, 角色: ${user.role}, 郵箱: ${user.email}`);
    });

    const doctors = users.filter(u => u.role === 'doctor');
    const patients = users.filter(u => u.role === 'patient');

    if (doctors.length === 0 || patients.length === 0) {
      console.log('\n❌ 缺少測試用戶，無法繼續測試');
      db.close();
      return;
    }

    const testDoctor = doctors[0];
    const testPatient = patients[0];

    console.log(`\n🎯 將使用測試數據:`);
    console.log(`  醫生: ${testDoctor.name} (ID: ${testDoctor.id})`);
    console.log(`  患者: ${testPatient.name} (ID: ${testPatient.id})`);

    // 3. 測試衝突檢查查詢
    console.log('\n3️⃣ 測試預約衝突檢查');
    console.log('─'.repeat(50));

    const checkQuery = `
      SELECT * FROM appointments
      WHERE doctor_id = ? AND date = ? AND time = ? AND status != 'cancelled'
    `;
    const checkParams = [testDoctor.id, '2025-07-02', '14:00'];

    console.log('🔍 衝突檢查 SQL:', checkQuery.replace(/\s+/g, ' ').trim());
    console.log('📝 參數:', checkParams);

    db.get(checkQuery, checkParams, (err, conflict) => {
      if (err) {
        console.error('❌ 衝突檢查失敗:', err.message);
        db.close();
        return;
      }

      console.log('✅ 衝突檢查結果:', conflict ? `發現衝突預約 ID: ${conflict.id}` : '無衝突');

      // 4. 測試完整的預約創建
      console.log('\n4️⃣ 測試完整預約創建');
      console.log('─'.repeat(50));

      const createQuery = `
        INSERT INTO appointments (
          doctor_id, patient_id, date, time, notes, status, patient_info, isNewPatient, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
      `;

      const patientInfo = JSON.stringify({
        name: '測試就診者',
        phone: '12345678',
        email: testPatient.email,
        gender: 'male',
        birthDate: '1990-01-01'
      });

      const createParams = [
        testDoctor.id,           // doctor_id
        testPatient.id,          // patient_id
        '2025-08-01',           // date
        '10:00',                // time
        '測試預約備註',          // notes
        'confirmed',            // status
        patientInfo,            // patient_info
        true,                   // isNewPatient
      ];

      console.log('🔄 創建預約 SQL:', createQuery.replace(/\s+/g, ' ').trim());
      console.log('📝 參數:');
      createParams.forEach((param, index) => {
        const labels = ['doctor_id', 'patient_id', 'date', 'time', 'notes', 'status', 'patient_info', 'isNewPatient'];
        console.log(`  ${labels[index]}: ${typeof param === 'string' && param.length > 50 ? param.substring(0, 47) + '...' : param}`);
      });

      db.run(createQuery, createParams, function(err) {
        if (err) {
          console.error('\n❌ 創建預約失敗:');
          console.error(`  錯誤類型: ${err.code || 'UNKNOWN'}`);
          console.error(`  錯誤訊息: ${err.message}`);
          console.error(`  完整錯誤:`, err);
        } else {
          console.log('\n✅ 創建預約成功!');
          console.log(`  插入記錄 ID: ${this.lastID}`);
          console.log(`  影響行數: ${this.changes}`);

          // 5. 驗證創建的記錄
          console.log('\n5️⃣ 驗證創建的記錄');
          console.log('─'.repeat(50));

          db.get('SELECT * FROM appointments WHERE id = ?', [this.lastID], (err, record) => {
            if (err) {
              console.error('❌ 查詢創建的記錄失敗:', err.message);
            } else {
              console.log('📄 創建的記錄詳情:');
              Object.keys(record).forEach(key => {
                let value = record[key];
                if (key === 'patient_info' && value) {
                  try {
                    value = JSON.parse(value);
                    value = JSON.stringify(value, null, 2).replace(/\n/g, '\n      ');
                  } catch (e) {
                    // 保持原值
                  }
                }
                console.log(`  ${key}: ${value}`);
              });
            }

            // 清理測試記錄
            console.log('\n🧹 清理測試記錄...');
            db.run('DELETE FROM appointments WHERE id = ?', [this.lastID], (err) => {
              if (err) {
                console.error('❌ 清理失敗:', err.message);
              } else {
                console.log('✅ 測試記錄已清理');
              }

              console.log('\n🎉 測試完成!');
              console.log('=====================================');
              db.close();
            });
          });
        }
      });
    });
  });
}); 