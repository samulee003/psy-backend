/**
 * 緊急測試資料添加腳本
 * 
 * 此腳本為確保資料庫中存在基本測試數據，不論資料庫結構如何
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcrypt');

// 讀取資料庫路徑
const dbPath = process.env.DB_PATH || path.join(__dirname, 'database.sqlite');
console.log('[緊急] 使用資料庫路徑:', dbPath);

// 連接到資料庫
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('[緊急] 無法連接到資料庫:', err.message);
    process.exit(1);
  }
  console.log('[緊急] 成功連接到資料庫');
});

/**
 * 主程序 - 檢查和添加測試數據
 */
async function main() {
  try {
    console.log('[緊急] 主程序開始...');
    // 1. 檢查資料表結構
    console.log('[緊急] 檢查資料表結構...');
    const usersTableInfo = await getTableInfo('users');
    const scheduleTableInfo = await getTableInfo('schedule');
    const appointmentsTableInfo = await getTableInfo('appointments');
    
    // 2. 確保 appointments 表有必要的欄位
    console.log('[緊急] 檢查 appointments 表結構...');
    await ensureAppointmentsTableComplete(appointmentsTableInfo);
    
    // 3. 確保有標準測試用戶
    console.log('[緊急] 確保有標準測試用戶...');
    await ensureStandardUsersExist(usersTableInfo);
    
    // 4. 確保有醫生用戶
    console.log('[緊急] 確保有醫生用戶...');
    const doctor = await ensureDoctorExists(usersTableInfo);
    
    if (!doctor || !doctor.id) {
      throw new Error('[緊急] 無法創建或獲取醫生用戶，或者醫生ID無效');
    }
    console.log(`[緊急] 獲取到的醫生 ID: ${doctor.id}`);
    
    // 5. 強制為2025年5月1日添加一條排班記錄
    if (scheduleTableInfo.exists) {
        console.log(`[緊急] 強制為 2025-05-01 添加排班數據 (醫生ID: ${doctor.id})...`);
        await forceAddSingleScheduleEntry(scheduleTableInfo, doctor.id, '2025-05-01');
    } else {
        console.warn('[緊急] Schedule 表不存在，跳過強制添加排班條目。');
    }

    // 6. 確保有排班數據 (例如，為2025年5月)
    const targetYear = 2025;
    const targetMonth = 5; // 5 代表五月
    console.log(`[緊急] 確保為 ${targetYear}年${targetMonth}月 添加排班數據 (醫生ID: ${doctor.id})...`);
    await ensureScheduleExists(scheduleTableInfo, doctor.id, targetYear, targetMonth);
    
    console.log('[緊急] 任務完成！資料庫現在應該有足夠的測試數據');
    db.close((err) => {
      if (err) {
        console.error('[緊急] 關閉資料庫時出錯:', err.message);
      } else {
        console.log('[緊急] 資料庫連接已成功關閉');
      }
      process.exit(0);
    });
    
  } catch (error) {
    console.error('[緊急] 主程序發生錯誤:', error);
    db.close((err) => {
      if (err) {
        console.error('[緊急] 關閉資料庫時出錯 (錯誤流程):', err.message);
      }
      process.exit(1);
    });
  }
}

/**
 * 強制添加單條排班記錄的函數
 */
async function forceAddSingleScheduleEntry(tableInfo, doctorId, dateStr) {
    console.log(`[緊急-強制] 準備為 ${dateStr} (醫生ID: ${doctorId}) 添加排班...`);
    const fields = ['date', 'doctor_id'];
    const values = [dateStr, doctorId];
    const placeholders = ['?', '?'];

    if (tableInfo.hasColumn('start_time')) { fields.push('start_time'); values.push('09:00'); placeholders.push('?'); }
    if (tableInfo.hasColumn('end_time')) { fields.push('end_time'); values.push('12:00'); placeholders.push('?'); }
    if (tableInfo.hasColumn('is_rest_day')) { fields.push('is_rest_day'); values.push(0); placeholders.push('?'); }
    if (tableInfo.hasColumn('defined_slots')) {
      const slots = [
        { "start": "09:00", "end": "09:30" }, { "start": "09:30", "end": "10:00" },
        { "start": "10:00", "end": "10:30" }, { "start": "10:30", "end": "11:00" },
        { "start": "11:00", "end": "11:30" }, { "start": "11:30", "end": "12:00" }
      ];
      fields.push('defined_slots'); values.push(JSON.stringify(slots)); placeholders.push('?');
    }

    try {
      // 先嘗試刪除已有的記錄，避免唯一性衝突 (如果 date 和 doctor_id 有唯一約束)
      const deleteQuery = `DELETE FROM schedule WHERE date = ? AND doctor_id = ?`;
      await runQuery(deleteQuery, [dateStr, doctorId]);
      console.log(`[緊急-強制] 已嘗試刪除 ${dateStr} (醫生ID: ${doctorId}) 的舊排班 (如果存在)`);

      const insertQuery = `INSERT INTO schedule (${fields.join(', ')}) VALUES (${placeholders.join(', ')})`;
      const result = await runQuery(insertQuery, values);
      console.log(`[緊急-強制] 已為 ${dateStr} 強制創建排班 (醫生ID: ${doctorId}), 新排班ID: ${result.lastID}`);
    } catch (error) {
      console.error(`[緊急-強制] 為 ${dateStr} (醫生ID: ${doctorId}) 強制創建排班時出錯:`, error.message);
      // 即使這裡出錯，也繼續執行，讓 ensureScheduleExists 嘗試修復
    }
}

/**
 * 獲取表結構信息
 */
async function getTableInfo(tableName) {
  return new Promise((resolve, reject) => {
    db.all(`PRAGMA table_info(${tableName})`, [], (err, columns) => {
      if (err) {
        console.error(`[緊急] 無法獲取 ${tableName} 表結構:`, err.message);
        return reject(err);
      }
      
      if (!columns || columns.length === 0) {
        console.warn(`[緊急] ${tableName} 表可能不存在或為空`);
        return resolve({
          exists: false,
          columns: [],
          hasColumn: () => false
        });
      }
      
      console.log(`[緊急] ${tableName} 表欄位:`, columns.map(c => c.name).join(', '));
      resolve({
        exists: true,
        columns: columns,
        hasColumn: (name) => columns.some(c => c.name === name)
      });
    });
  });
}

/**
 * 確保存在醫生用戶
 */
async function ensureDoctorExists(tableInfo) {
  return new Promise(async (resolve, reject) => { 
    if (!tableInfo.exists || !tableInfo.hasColumn('role')) {
      return reject(new Error('users 表不存在或缺少必要的 role 欄位'));
    }
    
    db.get("SELECT id FROM users WHERE role = 'doctor' LIMIT 1", [], async (err, doctor) => {
      if (err) {
        return reject(new Error(`檢查醫生用戶時出錯: ${err.message}`));
      }
      
      if (doctor && doctor.id) {
        console.log(`[緊急] 醫生用戶已存在，ID: ${doctor.id}`);
        return resolve(doctor);
      }
      
      console.log('[緊急] 未找到現有醫生用戶，準備創建一個新的...');
      try {
        const hashedPassword = await bcrypt.hash('password123', 10);
        const fields = ['role'];
        const values = ['doctor'];
        const placeholders = ['?'];
        
        const optionalFields = [
          { name: 'username', value: 'emergency.doctor@example.com' }, 
          { name: 'email', value: 'emergency.doctor@example.com' },
          { name: 'password', value: hashedPassword },
          { name: 'name', value: '緊急測試醫生' }, 
          { name: 'phone', value: '0999888777' }
        ];
        
        optionalFields.forEach(field => {
          if (tableInfo.hasColumn(field.name)) {
            fields.push(field.name);
            values.push(field.value);
            placeholders.push('?');
          }
        });
        
        const query = `INSERT INTO users (${fields.join(', ')}) VALUES (${placeholders.join(', ')})`;
        console.log(`[緊急] 執行醫生插入語句: ${query}`);
        console.log(`[緊急] 插入值:`, values);
        
        db.run(query, values, function(runError) { 
          if (runError) {
            return reject(new Error(`創建醫生用戶SQL執行失敗: ${runError.message}`));
          }
          if (this.lastID) {
            console.log(`[緊急] 新醫生用戶已添加，ID: ${this.lastID}`);
            resolve({ id: this.lastID });
          } else {
            reject(new Error('創建醫生用戶後未能獲取 lastID'));
          }
        });
      } catch (error) {
        reject(new Error(`創建醫生用戶過程中出錯: ${error.message}`));
      }
    });
  });
}

/**
 * 確保指定月份存在排班數據
 */
async function ensureScheduleExists(tableInfo, doctorId, year, month) {
  if (!tableInfo.exists || !tableInfo.hasColumn('date') || !tableInfo.hasColumn('doctor_id')) {
    console.warn('[緊急] schedule 表不存在或缺少必要的 date/doctor_id 欄位，無法添加排班數據。');
    return; 
  }
  if (!doctorId) {
    console.error('[緊急] 無效的 doctorId，無法添加排班數據。');
    return;
  }

  console.log(`[緊急] 開始為 ${year}年${month}月 (醫生ID: ${doctorId}) 檢查並添加排班數據...`);
  const existingSchedules = await getExistingSchedules(doctorId, year, month);
  console.log(`[緊急] ${year}年${month}月 已有 ${existingSchedules.length} 筆排班記錄 (醫生ID: ${doctorId})`);

  const daysInMonth = new Date(year, month, 0).getDate();
  const workDays = [];
  for (let day = 1; day <= daysInMonth; day++) {
    const currentDate = new Date(year, month - 1, day);
    const dayOfWeek = currentDate.getDay(); 
    if (dayOfWeek === 1 || dayOfWeek === 3 || dayOfWeek === 5) { 
      workDays.push(day);
    }
  }
  console.log(`[緊急] ${year}年${month}月 計算出的工作日 (日):`, workDays);

  const existingDates = existingSchedules.map(s => new Date(s.date).getDate());
  let addedCount = 0;
  
  // 在此處先定義 dateStr，避免在循環外部使用時出錯
  let dateStr = '';

  for (let day of workDays) {
    dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

    if (existingDates.includes(day) && dateStr !== '2025-05-01') { 
      console.log(`[緊急] ${dateStr} 已有排班，跳過。`);
      continue;
    }

    if (dateStr === '2025-05-01' && existingSchedules.some(s => s.date === '2025-05-01')) {
        console.log(`[緊急] ${dateStr} 已由強制添加處理，此處跳過 ensureScheduleExists 的重複添加。`);
        continue;
    }

    const fields = ['date', 'doctor_id'];
    const values = [dateStr, doctorId];
    const placeholders = ['?', '?'];

    if (tableInfo.hasColumn('start_time')) { fields.push('start_time'); values.push('09:00'); placeholders.push('?'); }
    if (tableInfo.hasColumn('end_time')) { fields.push('end_time'); values.push('12:00'); placeholders.push('?'); }
    if (tableInfo.hasColumn('slot_duration')) { fields.push('slot_duration'); values.push(30); placeholders.push('?'); }
    if (tableInfo.hasColumn('is_rest_day')) { fields.push('is_rest_day'); values.push(0); placeholders.push('?'); }
    if (tableInfo.hasColumn('defined_slots')) {
      const slots = [
        { "start": "09:00", "end": "09:30" }, { "start": "09:30", "end": "10:00" },
        { "start": "10:00", "end": "10:30" }, { "start": "10:30", "end": "11:00" },
        { "start": "11:00", "end": "11:30" }, { "start": "11:30", "end": "12:00" }
      ];
      fields.push('defined_slots'); values.push(JSON.stringify(slots)); placeholders.push('?');
    }

    try {
      const query = `INSERT INTO schedule (${fields.join(', ')}) VALUES (${placeholders.join(', ')})`;
      const result = await runQuery(query, values);
      console.log(`[緊急] 已為 ${dateStr} 創建排班 (醫生ID: ${doctorId}), 新排班ID: ${result.lastID}`);
      addedCount++;
    } catch (error) {
      console.error(`[緊急] 為 ${dateStr} (醫生ID: ${doctorId}) 創建排班時出錯:`, error.message);
    }
  }
  if (addedCount > 0) {
    console.log(`[緊急] 為 ${year}年${month}月 (醫生ID: ${doctorId}) 共添加了 ${addedCount} 筆新排班。`);
  }
}

/**
 * 獲取特定月份已有的排班
 */
async function getExistingSchedules(doctorId, year, month) {
  return new Promise((resolve, reject) => {
    const monthStr = String(month).padStart(2, '0');
    const query = `
      SELECT date FROM schedule 
      WHERE strftime('%Y', date) = ? 
      AND strftime('%m', date) = ?
      AND doctor_id = ?
    `;
    const params = [String(year), monthStr, doctorId];
    
    db.all(query, params, (err, rows) => {
      if (err) {
        console.error(`[緊急] 查詢 ${year}-${monthStr} (醫生ID: ${doctorId}) 的排班失敗:`, err.message);
        return reject(err);
      }
      resolve(rows || []);
    });
  });
}

/**
 * 通用SQL執行函數
 */
function runQuery(query, params = []) {
  return new Promise((resolve, reject) => {
    db.run(query, params, function(err) { 
      if (err) {
        console.error(`[緊急] SQL錯誤: ${query} | PARAMS: ${params} | ERROR: ${err.message}`);
        return reject(err);
      }
      resolve({ lastID: this.lastID, changes: this.changes });
    });
  });
}

/**
 * 確保標準測試用戶存在
 */
async function ensureStandardUsersExist(tableInfo) {
  if (!tableInfo.exists) {
    console.warn('[緊急] users 表不存在，跳過創建標準用戶');
    return;
  }
  
  const standardUsers = [
    {
      username: 'admin@example.com',
      email: 'admin@example.com',
      password: 'password123',
      name: '系統管理員',
      role: 'admin',
      phone: '+85212345678'
    },
    {
      username: 'doctor@example.com',
      email: 'doctor@example.com', 
      password: 'password123',
      name: '測試醫生',
      role: 'doctor',
      phone: '+86123456789'
    },
    {
      username: 'patient@example.com',
      email: 'patient@example.com',
      password: 'password123', 
      name: '測試患者',
      role: 'patient',
      phone: '66881100'
    }
  ];
  
  console.log('[緊急] 開始檢查/創建標準測試用戶...');
  
  for (const userData of standardUsers) {
    await createStandardUserIfNotExists(tableInfo, userData);
  }
  
  console.log('[緊急] 標準用戶檢查/創建完成');
}

/**
 * 檢查並創建標準用戶
 */
async function createStandardUserIfNotExists(tableInfo, userData) {
  return new Promise((resolve, reject) => {
    // 先檢查用戶是否已存在
    db.get(
      'SELECT id, email, name, role FROM users WHERE email = ? OR username = ?',
      [userData.email, userData.username],
      async (err, existingUser) => {
        if (err) {
          console.error(`[緊急] 檢查用戶 ${userData.email} 時出錯: ${err.message}`);
          return resolve(); // 不阻塞流程
        }
        
        if (existingUser) {
          console.log(`[緊急] 標準用戶已存在: ${existingUser.name} (${existingUser.email}) - ${existingUser.role}`);
          return resolve();
        }
        
        try {
          // 加密密碼
          const hashedPassword = await bcrypt.hash(userData.password, 10);
          
          // 構建字段和值
          const fields = ['role'];
          const values = [userData.role];
          const placeholders = ['?'];
          
          const optionalFields = [
            { name: 'username', value: userData.username },
            { name: 'email', value: userData.email },
            { name: 'password', value: hashedPassword },
            { name: 'name', value: userData.name },
            { name: 'phone', value: userData.phone }
          ];
          
          optionalFields.forEach(field => {
            if (tableInfo.hasColumn(field.name)) {
              fields.push(field.name);
              values.push(field.value);
              placeholders.push('?');
            }
          });
          
          // 創建新用戶
          const query = `INSERT INTO users (${fields.join(', ')}) VALUES (${placeholders.join(', ')})`;
          
          db.run(query, values, function(err) {
            if (err) {
              console.error(`[緊急] 創建標準用戶 ${userData.email} 失敗: ${err.message}`);
              return resolve(); // 不阻塞流程
            }
            console.log(`[緊急] ✅ 已創建標準用戶: ${userData.name} (${userData.email}) - ${userData.role}, ID: ${this.lastID}`);
            resolve();
          });
        } catch (hashError) {
          console.error(`[緊急] 密碼加密失敗: ${hashError.message}`);
          resolve(); // 不阻塞流程
        }
      }
    );
  });
}

/**
 * 確保 appointments 表結構完整
 */
async function ensureAppointmentsTableComplete(tableInfo) {
  console.log('[緊急] 檢查 appointments 表結構完整性...');
  
  if (!tableInfo.exists) {
    console.log('[緊急] appointments 表不存在，將由主應用創建');
    return;
  }
  
  // 檢查必要的欄位
  const requiredFields = ['isNewPatient', 'patient_info'];
  const missingFields = requiredFields.filter(field => !tableInfo.hasColumn(field));
  
  if (missingFields.length === 0) {
    console.log('[緊急] appointments 表結構完整 ✅');
    return;
  }
  
  console.log(`[緊急] appointments 表缺少欄位: ${missingFields.join(', ')}`);
  console.log('[緊急] 正在修復表結構...');
  
  for (const field of missingFields) {
    try {
      let sql = '';
      if (field === 'isNewPatient') {
        sql = 'ALTER TABLE appointments ADD COLUMN isNewPatient BOOLEAN DEFAULT FALSE';
      } else if (field === 'patient_info') {
        sql = 'ALTER TABLE appointments ADD COLUMN patient_info TEXT';
      }
      
      if (sql) {
        console.log(`[緊急] 添加 ${field} 欄位...`);
        await runQuery(sql);
        console.log(`[緊急] ✅ ${field} 欄位添加成功`);
      }
    } catch (error) {
      console.error(`[緊急] ❌ 添加 ${field} 欄位失敗:`, error.message);
    }
  }
  
  // 驗證修復結果
  console.log('[緊急] 驗證修復結果...');
  const updatedTableInfo = await getTableInfo('appointments');
  const stillMissing = requiredFields.filter(field => !updatedTableInfo.hasColumn(field));
  
  if (stillMissing.length === 0) {
    console.log('[緊急] ✅ appointments 表結構修復完成');
  } else {
    console.error(`[緊急] ❌ 仍有欄位缺失: ${stillMissing.join(', ')}`);
  }
}

// 執行主程序
main(); 