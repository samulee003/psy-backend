const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'database.sqlite');
const db = new sqlite3.Database(dbPath);

console.log('=== 創建多樣化的測試資料 ===\n');

// 簡單的密碼哈希函數（用於測試）
function simpleHash(password) {
  // 這裡使用簡單的哈希方式，僅用於測試
  // 在實際生產環境中應該使用 bcrypt
  return `$simple$${Buffer.from(password).toString('base64')}`;
}

// 要創建的測試患者資料
const testPatients = [
  {
    name: '王小明',
    email: 'wang.xiaoming@example.com',
    password: 'password123',
    phone: '0912345678'
  },
  {
    name: '李美華',
    email: 'li.meihua@example.com', 
    password: 'password123',
    phone: '0923456789'
  },
  {
    name: '陳志強',
    email: 'chen.zhiqiang@example.com',
    password: 'password123',
    phone: '0934567890'
  },
  {
    name: '張淑芬',
    email: 'zhang.shufen@example.com',
    password: 'password123',
    phone: '0945678901'
  }
];

async function createTestData() {
  try {
    // 先檢查醫生是否存在
    const doctor = await new Promise((resolve, reject) => {
      db.get('SELECT * FROM users WHERE role = "doctor" LIMIT 1', [], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    if (!doctor) {
      console.log('❌ 沒有找到醫生帳號，請先創建醫生');
      return;
    }

    console.log('✅ 找到醫生:', doctor.name, `(ID: ${doctor.id})`);

    // 創建測試患者
    console.log('\n正在創建測試患者...');
    const createdPatients = [];

    for (const patient of testPatients) {
      // 檢查患者是否已存在
      const existingPatient = await new Promise((resolve, reject) => {
        db.get('SELECT * FROM users WHERE email = ?', [patient.email], (err, row) => {
          if (err) reject(err);
          else resolve(row);
        });
      });

      if (existingPatient) {
        console.log(`⚠️  患者 ${patient.name} 已存在，跳過創建`);
        createdPatients.push(existingPatient);
        continue;
      }

      // 簡單加密密碼
      const hashedPassword = simpleHash(patient.password);

      // 創建患者
      const patientId = await new Promise((resolve, reject) => {
        const query = `
          INSERT INTO users (username, name, email, password, role, phone, created_at)
          VALUES (?, ?, ?, ?, 'patient', ?, datetime('now'))
        `;
        
        // 使用 email 的本地部分作為 username
        const username = patient.email.split('@')[0];
        
        db.run(query, [username, patient.name, patient.email, hashedPassword, patient.phone], function(err) {
          if (err) reject(err);
          else resolve(this.lastID);
        });
      });

      console.log(`✅ 已創建患者: ${patient.name} (ID: ${patientId})`);
      createdPatients.push({ id: patientId, ...patient });
    }

    // 清除舊的預約資料
    console.log('\n清除舊的預約資料...');
    await new Promise((resolve, reject) => {
      db.run('DELETE FROM appointments', [], function(err) {
        if (err) reject(err);
        else {
          console.log(`✅ 已清除 ${this.changes} 個舊預約`);
          resolve();
        }
      });
    });

    // 創建多個預約（每個患者一個預約）
    console.log('\n正在創建多個預約...');
    const testAppointments = [
      {
        doctor_id: doctor.id,
        patient_id: createdPatients[0].id,
        date: '2025-08-13',
        time: '17:00',
        status: 'confirmed',
        notes: '王小明 - 焦慮症初診'
      },
      {
        doctor_id: doctor.id,
        patient_id: createdPatients[1].id,
        date: '2025-08-13',
        time: '18:30',
        status: 'confirmed',
        notes: '李美華 - 憂鬱症追蹤'
      },
      {
        doctor_id: doctor.id,
        patient_id: createdPatients[2].id,
        date: '2025-08-06',
        time: '17:00',
        status: 'confirmed',
        notes: '陳志強 - 壓力管理諮詢'
      },
      {
        doctor_id: doctor.id,
        patient_id: createdPatients[3].id,
        date: '2025-08-06',
        time: '18:30',
        status: 'confirmed',
        notes: '張淑芬 - 婚姻諮詢'
      },
      {
        doctor_id: doctor.id,
        patient_id: createdPatients[0].id,
        date: '2025-07-23',
        time: '17:00',
        status: 'confirmed',
        notes: '王小明 - 焦慮症追蹤治療'
      }
    ];

    for (const apt of testAppointments) {
      const appointmentId = await new Promise((resolve, reject) => {
        const query = `
          INSERT INTO appointments (doctor_id, patient_id, date, time, status, notes, created_at)
          VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
        `;
        
        db.run(query, [apt.doctor_id, apt.patient_id, apt.date, apt.time, apt.status, apt.notes], function(err) {
          if (err) reject(err);
          else resolve(this.lastID);
        });
      });

      const patientName = createdPatients.find(p => p.id === apt.patient_id).name;
      console.log(`✅ 已創建預約 ID: ${appointmentId} - 患者: ${patientName}, 日期: ${apt.date} ${apt.time}`);
    }

    console.log('\n=== 測試資料創建完成 ===');
    console.log(`已創建 ${createdPatients.length} 個患者`);
    console.log(`已創建 ${testAppointments.length} 個預約`);
    console.log('\n現在可以測試預約 API 是否正確顯示不同患者的姓名了！');

    // 驗證創建的資料
    console.log('\n=== 驗證創建的預約資料 ===');
    const verifyQuery = `
      SELECT a.*, 
             u_patient.name as patient_name,
             u_doctor.name as doctor_name
      FROM appointments a
      LEFT JOIN users u_patient ON a.patient_id = u_patient.id
      LEFT JOIN users u_doctor ON a.doctor_id = u_doctor.id
      ORDER BY a.date DESC, a.time ASC
    `;
    
    const appointments = await new Promise((resolve, reject) => {
      db.all(verifyQuery, [], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });

    appointments.forEach((apt, index) => {
      console.log(`預約 ${index + 1}: ${apt.patient_name} - ${apt.date} ${apt.time}`);
    });

    const uniquePatients = [...new Set(appointments.map(apt => apt.patient_name))];
    console.log(`\n✅ 預約涵蓋了 ${uniquePatients.length} 個不同的患者: ${uniquePatients.join(', ')}`);

  } catch (error) {
    console.error('❌ 創建測試資料時發生錯誤:', error.message);
  } finally {
    db.close();
  }
}

createTestData(); 