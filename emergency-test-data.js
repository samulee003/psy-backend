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
    // 1. 檢查資料表結構
    console.log('[緊急] 檢查資料表結構...');
    const usersTableInfo = await getTableInfo('users');
    const scheduleTableInfo = await getTableInfo('schedule');
    
    // 2. 確保有醫生用戶
    console.log('[緊急] 確保有醫生用戶...');
    const doctor = await ensureDoctorExists(usersTableInfo);
    
    if (!doctor || !doctor.id) {
      throw new Error('[緊急] 無法創建或獲取醫生用戶，或者醫生ID無效');
    }
    console.log(`[緊急] 獲取到的醫生 ID: ${doctor.id}`);
    
    // 3. 確保有排班數據 (例如，為2025年5月)
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
      // 正常退出
      process.exit(0);
    });
    
  } catch (error) {
    console.error('[緊急] 發生錯誤:', error);
    db.close((err) => {
      if (err) {
        console.error('[緊急] 關閉資料庫時出錯 (錯誤流程):', err.message);
      }
      process.exit(1); // 錯誤退出
    });
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
        // 即使表不存在，也resolve，讓後續邏輯處理
        // 但標記為不存在，並提供一個空的hasColumn函數
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
  return new Promise(async (resolve, reject) => { // 將回調改為 async
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
          { name: 'username', value: 'emergency.doctor@example.com' }, // 修改 email 以避免唯一性衝突
          { name: 'email', value: 'emergency.doctor@example.com' },
          { name: 'password', value: hashedPassword },
          { name: 'name', value: '緊急測試醫生' }, // 修改名稱以區分
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
        
        // 使用 db.run 的回調來獲取 lastID
        db.run(query, values, function(runError) { // 注意這裡用普通函數以獲取 this
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
    return; // 如果表不完整，則不執行後續操作
  }
  if (!doctorId) {
    console.error('[緊急] 無效的 doctorId，無法添加排班數據。');
    return;
  }

  console.log(`[緊急] 開始為 ${year}年${month}月 (醫生ID: ${doctorId}) 檢查並添加排班數據...`);
  const existingSchedules = await getExistingSchedules(doctorId, year, month);
  console.log(`[緊急] ${year}年${month}月 已有 ${existingSchedules.length} 筆排班記錄 (醫生ID: ${doctorId})`);

  // 計算該月應排班的日期 (週一、三、五)
  const daysInMonth = new Date(year, month, 0).getDate();
  const workDays = [];
  for (let day = 1; day <= daysInMonth; day++) {
    const currentDate = new Date(year, month - 1, day);
    const dayOfWeek = currentDate.getDay(); // 0=Sunday, 1=Monday, ..., 5=Friday, 6=Saturday
    if (dayOfWeek === 1 || dayOfWeek === 3 || dayOfWeek === 5) { // 週一、三、五
      workDays.push(day);
    }
  }
  console.log(`[緊急] ${year}年${month}月 計算出的工作日 (日):`, workDays);

  const existingDates = existingSchedules.map(s => new Date(s.date).getDate());
  let addedCount = 0;

  for (let day of workDays) {
    if (existingDates.includes(day)) {
      console.log(`[緊急] ${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')} 已有排班，跳過。`);
      continue;
    }

    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
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
      // console.log(`[緊急] 執行排班插入: ${query}, VALUES:`, values); // 詳細日誌，需要時取消註釋
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
    db.run(query, params, function(err) { // 使用普通函數以獲取 this 上下文
      if (err) {
        console.error(`[緊急] SQL錯誤: ${query} | PARAMS: ${params} | ERROR: ${err.message}`);
        return reject(err);
      }
      resolve({ lastID: this.lastID, changes: this.changes });
    });
  });
}

// 執行主程序
main(); // 移除 .catch，因為 main 內部已有 catch 和 process.exit

// 執行主程序
main().catch(error => {
  console.error('[緊急] 主程序錯誤:', error);
  db.close();
  process.exit(1);
}); 