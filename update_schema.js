/**
 * 資料庫結構更新腳本
 * 確保所有表都有必要的欄位
 * 包括：
 * - schedule 表: is_rest_day, defined_slots, utc_datetime
 * - appointments 表: utc_datetime, patient_info, isNewPatient
 * - users 表: reset_token, reset_token_expiry
 */

// 載入環境變數
require('dotenv').config();

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// 獲取資料庫路徑
const dbPath = process.env.DB_PATH || path.join(__dirname, 'database.sqlite');

console.log('開始執行資料庫更新腳本 - 確保所有表都有必要的欄位');
console.log('資料庫路徑:', dbPath);

// 連接到資料庫
console.log('嘗試連接到資料庫...');
const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READWRITE, (err) => {
  if (err) {
    console.error('連接資料庫時出錯:', err.message);
    process.exit(1);
  }
  console.log('已成功連接到資料庫');

  // 更新資料庫結構
  updateDatabaseSchema()
    .then(() => {
      console.log('所有必要的欄位修改已完成。');
      
      // 檢查更新後的表結構
      return getTableInfo('schedule');
    })
    .then((info) => {
      console.log('更新後的表結構:', info);
      console.log('準備以代碼 0 退出...');
      
      // 關閉資料庫連接
      db.close((err) => {
        if (err) {
          console.error('關閉資料庫連接時出錯:', err.message);
          process.exit(1);
        }
        console.log('資料庫連接已關閉');
        console.log('腳本完成');
        process.exit(0);
      });
    })
    .catch((err) => {
      console.error('執行更新時出錯:', err.message);
      
      // 關閉資料庫連接
      db.close((err) => {
        if (err) {
          console.error('關閉資料庫連接時出錯:', err.message);
        }
        process.exit(1);
      });
    });
});

// 更新資料庫結構的主函數
async function updateDatabaseSchema() {
  // 檢查 users 表密碼重置功能欄位
  console.log('檢查 users 表是否存在...');
  const usersTableExists = await tableExists('users');
  
  if (usersTableExists) {
    console.log('users 表已存在，檢查密碼重置欄位...');
    
    const usersTableInfo = await getTableInfo('users');
    console.log('users 表結構信息:', usersTableInfo.map(c => c.name).join(', '));
    
    // 檢查 reset_token 欄位是否存在
    const hasResetToken = usersTableInfo.some(column => column.name === 'reset_token');
    if (!hasResetToken) {
      console.log('正在添加 reset_token 欄位到 users 表...');
      await addColumn('users', 'reset_token', 'TEXT');
    } else {
      console.log('reset_token 欄位已存在');
    }
    
    // 檢查 reset_token_expiry 欄位是否存在
    const hasResetTokenExpiry = usersTableInfo.some(column => column.name === 'reset_token_expiry');
    if (!hasResetTokenExpiry) {
      console.log('正在添加 reset_token_expiry 欄位到 users 表...');
      await addColumn('users', 'reset_token_expiry', 'TEXT');
    } else {
      console.log('reset_token_expiry 欄位已存在');
    }

    // 檢查 calendar_token 欄位是否存在
    const hasCalendarToken = usersTableInfo.some(column => column.name === 'calendar_token');
    if (!hasCalendarToken) {
      console.log('正在添加 calendar_token 欄位到 users 表...');
      await addColumn('users', 'calendar_token', 'TEXT');
      
      // 為現有醫生生成 Token
      console.log('正在為現有醫生生成行事曆 Token...');
      await new Promise((resolve, reject) => {
        const crypto = require('crypto');
        db.all("SELECT id FROM users WHERE role = 'doctor'", [], (err, rows) => {
          if (err) return reject(err);
          const updates = rows.map(row => {
            const token = crypto.randomBytes(16).toString('hex');
            return new Promise((res, rej) => {
              db.run("UPDATE users SET calendar_token = ? WHERE id = ?", [token, row.id], (e) => e ? rej(e) : res());
            });
          });
          Promise.all(updates).then(resolve).catch(reject);
        });
      });
    } else {
      console.log('calendar_token 欄位已存在');
    }
  } else {

    console.log('users 表不存在，無需添加密碼重置欄位');
  }
  
  // 檢查 schedule 表是否存在
  console.log('檢查 schedule 表是否存在...');
  const scheduleTableExists = await tableExists('schedule');
  
  if (scheduleTableExists) {
    console.log('schedule 表已存在，檢查欄位...');
    
    // 獲取表的欄位信息
    const tableInfo = await getTableInfo('schedule');
    console.log('表結構信息:', tableInfo);
    
    // 檢查 is_rest_day 欄位是否存在
    const hasIsRestDay = tableInfo.some(column => column.name === 'is_rest_day');
    if (!hasIsRestDay) {
      console.log('正在添加 is_rest_day 欄位...');
      await addColumn('schedule', 'is_rest_day', 'INTEGER DEFAULT 0');
    }
    
    // 檢查 defined_slots 欄位是否存在
    const hasDefinedSlots = tableInfo.some(column => column.name === 'defined_slots');
    if (!hasDefinedSlots) {
      console.log('正在添加 defined_slots 欄位...');
      await addColumn('schedule', 'defined_slots', 'TEXT');
    }
    
    // 檢查 utc_datetime 欄位是否存在
    const hasUtcDateTime = tableInfo.some(column => column.name === 'utc_datetime');
    if (!hasUtcDateTime) {
      console.log('正在添加 utc_datetime 欄位到 schedule 表...');
      await addColumn('schedule', 'utc_datetime', 'TEXT');
    }
  } else {
    console.log('schedule 表不存在，無需添加欄位');
  }
  
  // 檢查 appointments 表是否存在
  console.log('檢查 appointments 表是否存在...');
  const appointmentsTableExists = await tableExists('appointments');
  
  if (appointmentsTableExists) {
    console.log('appointments 表已存在，檢查欄位...');
    
    // 獲取表的欄位信息
    const tableInfo = await getTableInfo('appointments');
    console.log('appointments 表結構信息:', tableInfo);
    
    // 檢查 utc_datetime 欄位是否存在
    const hasUtcDateTime = tableInfo.some(column => column.name === 'utc_datetime');
    if (!hasUtcDateTime) {
      console.log('正在添加 utc_datetime 欄位到 appointments 表...');
      await addColumn('appointments', 'utc_datetime', 'TEXT');
    }
    
    // 檢查 patient_info 欄位是否存在
    const hasPatientInfo = tableInfo.some(column => column.name === 'patient_info');
    if (!hasPatientInfo) {
      console.log('正在添加 patient_info 欄位到 appointments 表...');
      await addColumn('appointments', 'patient_info', 'TEXT');
    }
    
    // 檢查 isNewPatient 欄位是否存在
    const hasIsNewPatient = tableInfo.some(column => column.name === 'isNewPatient');
    if (!hasIsNewPatient) {
      console.log('正在添加 isNewPatient 欄位到 appointments 表...');
      await addColumn('appointments', 'isNewPatient', 'BOOLEAN DEFAULT FALSE');
    }
  } else {
    console.log('appointments 表不存在，無需添加欄位');
  }
}

// 檢查表是否存在
function tableExists(tableName) {
  return new Promise((resolve, reject) => {
    const query = `SELECT name FROM sqlite_master WHERE type='table' AND name=?`;
    db.get(query, [tableName], (err, row) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(!!row);
    });
  });
}

// 獲取表的欄位信息
function getTableInfo(tableName) {
  return new Promise((resolve, reject) => {
    const query = `PRAGMA table_info(${tableName})`;
    db.all(query, [], (err, rows) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(rows);
    });
  });
}

// 添加欄位到表
function addColumn(tableName, columnName, columnDefinition) {
  return new Promise((resolve, reject) => {
    const query = `ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${columnDefinition}`;
    db.run(query, function(err) {
      if (err) {
        reject(err);
        return;
      }
      console.log(`已成功添加 ${columnName} 欄位到 ${tableName} 表。受影響的行數: ${this.changes}`);
      resolve();
    });
  });
}
