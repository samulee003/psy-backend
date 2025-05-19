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
    
    if (!doctor) {
      throw new Error('[緊急] 無法創建或獲取醫生用戶');
    }
    
    // 3. 確保有排班數據
    console.log(`[緊急] 確保有排班數據 (醫生ID: ${doctor.id})...`);
    await ensureScheduleExists(scheduleTableInfo, doctor.id);
    
    console.log('[緊急] 任務完成！資料庫現在應該有足夠的測試數據');
    db.close();
    
  } catch (error) {
    console.error('[緊急] 發生錯誤:', error);
    db.close();
    process.exit(1);
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
        console.error(`[緊急] ${tableName} 表不存在`);
        return reject(new Error(`表 ${tableName} 不存在`));
      }
      
      // 顯示表結構
      console.log(`[緊急] ${tableName} 表欄位:`, columns.map(c => c.name).join(', '));
      
      // 返回表結構信息
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
  return new Promise((resolve, reject) => {
    // 1. 檢查是否有角色欄位，這是必須的
    if (!tableInfo.hasColumn('role')) {
      return reject(new Error('users 表缺少必要的 role 欄位'));
    }
    
    // 2. 檢查是否已有醫生用戶
    db.get("SELECT id FROM users WHERE role = 'doctor' LIMIT 1", [], async (err, doctor) => {
      if (err) {
        return reject(new Error(`檢查醫生用戶時出錯: ${err.message}`));
      }
      
      // 如果已有醫生用戶，直接返回
      if (doctor) {
        console.log(`[緊急] 醫生用戶已存在，ID: ${doctor.id}`);
        return resolve(doctor);
      }
      
      // 3. 需要創建醫生用戶
      try {
        // 生成密碼雜湊
        const hashedPassword = await bcrypt.hash('password123', 10);
        
        // 構建動態SQL插入語句
        const fields = ['role'];  // role 欄位必須存在
        const values = ['doctor'];
        const placeholders = ['?'];
        
        // 可選欄位
        const optionalFields = [
          { name: 'username', value: 'emergency-doctor@test.com' },
          { name: 'email', value: 'emergency-doctor@test.com' },
          { name: 'password', value: hashedPassword },
          { name: 'name', value: '緊急醫生' },
          { name: 'phone', value: '0900000000' }
        ];
        
        // 添加有的欄位
        optionalFields.forEach(field => {
          if (tableInfo.hasColumn(field.name)) {
            fields.push(field.name);
            values.push(field.value);
            placeholders.push('?');
          }
        });
        
        // 構建並執行插入語句
        const query = `INSERT INTO users (${fields.join(', ')}) VALUES (${placeholders.join(', ')})`;
        console.log(`[緊急] 執行醫生插入語句: ${query}`);
        console.log(`[緊急] 插入值: ${values.join(', ')}`);
        
        const result = await runQuery(query, values);
        console.log(`[緊急] 醫生用戶已添加，ID: ${result.lastID}`);
        
        return resolve({ id: result.lastID });
      } catch (error) {
        return reject(new Error(`創建醫生用戶失敗: ${error.message}`));
      }
    });
  });
}

/**
 * 確保存在排班數據
 */
async function ensureScheduleExists(tableInfo, doctorId) {
  // 1. 檢查必要欄位
  if (!tableInfo.hasColumn('date') || !tableInfo.hasColumn('doctor_id')) {
    throw new Error('schedule 表缺少必要的 date 或 doctor_id 欄位');
  }
  
  // 2. 獲取2025年5月的已有排班
  const existingSchedules = await getExistingSchedules(doctorId, 2025, 5);
  console.log(`[緊急] 2025年5月已有 ${existingSchedules.length} 筆排班記錄`);
  
  // 如果已有足夠排班，就不必再添加
  if (existingSchedules.length >= 5) {
    console.log(`[緊急] 已有足夠排班數據，不需要添加更多`);
    return;
  }
  
  // 3. 創建不存在的排班
  // 一週排3天班: 週一、三、五
  const daysToSchedule = [6, 8, 10, 13, 15, 17, 20, 22, 24, 27, 29, 31]; // 5月的週一三五
  
  // 已經存在的日期，不要重複插入
  const existingDates = existingSchedules.map(s => s.date);
  
  // 構建動態SQL欄位
  for (let day of daysToSchedule) {
    // 格式化日期
    const dateStr = `2025-05-${String(day).padStart(2, '0')}`;
    
    // 如果此日期已有排班，跳過
    if (existingDates.includes(dateStr)) {
      console.log(`[緊急] ${dateStr} 已有排班，跳過`);
      continue;
    }
    
    // 準備排班數據
    const fields = ['date', 'doctor_id'];
    const values = [dateStr, doctorId];
    const placeholders = ['?', '?'];
    
    // 可選欄位
    if (tableInfo.hasColumn('start_time')) {
      fields.push('start_time');
      values.push('09:00');
      placeholders.push('?');
    }
    
    if (tableInfo.hasColumn('end_time')) {
      fields.push('end_time');
      values.push('12:00');
      placeholders.push('?');
    }
    
    if (tableInfo.hasColumn('slot_duration')) {
      fields.push('slot_duration');
      values.push(30);
      placeholders.push('?');
    }
    
    if (tableInfo.hasColumn('is_rest_day')) {
      fields.push('is_rest_day');
      values.push(0);
      placeholders.push('?');
    }
    
    if (tableInfo.hasColumn('defined_slots')) {
      const slots = [
        { "start": "09:00", "end": "09:30" },
        { "start": "09:30", "end": "10:00" },
        { "start": "10:00", "end": "10:30" },
        { "start": "10:30", "end": "11:00" },
        { "start": "11:00", "end": "11:30" },
        { "start": "11:30", "end": "12:00" }
      ];
      fields.push('defined_slots');
      values.push(JSON.stringify(slots));
      placeholders.push('?');
    }
    
    // 執行插入
    try {
      const query = `INSERT INTO schedule (${fields.join(', ')}) VALUES (${placeholders.join(', ')})`;
      const result = await runQuery(query, values);
      console.log(`[緊急] 已為 ${dateStr} 創建排班，ID: ${result.lastID}`);
    } catch (error) {
      console.error(`[緊急] 為 ${dateStr} 創建排班時出錯:`, error.message);
    }
  }
}

/**
 * 獲取特定月份已有的排班
 */
async function getExistingSchedules(doctorId, year, month) {
  return new Promise((resolve, reject) => {
    const monthStr = String(month).padStart(2, '0');
    
    // SQL查詢，可選擇指定醫生的排班，也可不指定
    const query = `
      SELECT * FROM schedule 
      WHERE strftime('%Y', date) = ? 
      AND strftime('%m', date) = ?
      ${doctorId ? 'AND doctor_id = ?' : ''}
    `;
    
    const params = doctorId 
      ? [String(year), monthStr, doctorId]
      : [String(year), monthStr];
    
    db.all(query, params, (err, rows) => {
      if (err) {
        console.error(`[緊急] 查詢排班失敗:`, err.message);
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
        console.error(`[緊急] SQL錯誤:`, err.message);
        return reject(err);
      }
      resolve({ lastID: this.lastID, changes: this.changes });
    });
  });
}

// 執行主程序
main().catch(error => {
  console.error('[緊急] 主程序錯誤:', error);
  db.close();
  process.exit(1);
}); 