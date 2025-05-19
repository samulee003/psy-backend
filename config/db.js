/**
 * 資料庫設定與連接模組
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// 獲取資料庫路徑（優先使用環境變數）
const dbPath = process.env.DB_PATH || path.join(__dirname, '..', 'database.sqlite');

// 初始化資料庫模式 - 創建所有必要的表
const initializeDatabase = (db) => {
  return new Promise((resolve, reject) => {
    console.log('檢查資料庫模式並創建必要的表...');
    
    // 1. 檢查 users 表是否存在
    db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='users'", (err, table) => {
      if (err) {
        console.error('檢查 users 表時出錯:', err.message);
        return reject(err);
      }
      
      // 若 users 表不存在，則創建它
      if (!table) {
        console.log('正在創建 users 表...');
        db.run(`CREATE TABLE users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          username TEXT NOT NULL UNIQUE,
          email TEXT UNIQUE,
          password TEXT NOT NULL,
          name TEXT NOT NULL,
          role TEXT NOT NULL DEFAULT 'patient',
          phone TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`, (err) => {
          if (err) {
            console.error('創建 users 表失敗:', err.message);
            return reject(err);
          }
          console.log('users 表創建成功');
          
          // 添加預設測試用戶
          const bcrypt = require('bcrypt');
          bcrypt.hash('password123', 10, (err, hashedPassword) => {
            if (err) {
              console.error('密碼加密失敗:', err.message);
              return;
            }
            
            // 添加一個醫生用戶
            db.run(
              'INSERT INTO users (username, email, password, name, role, phone) VALUES (?, ?, ?, ?, ?, ?)',
              ['doctor@example.com', 'doctor@example.com', hashedPassword, '測試醫生', 'doctor', '0912345678'],
              function(err) {
                if (err) {
                  console.error('創建預設醫生用戶失敗:', err.message);
                } else {
                  console.log('預設醫生用戶創建成功，ID:', this.lastID);
                }
              }
            );
            
            // 添加一個病人用戶
            db.run(
              'INSERT INTO users (username, email, password, name, role, phone) VALUES (?, ?, ?, ?, ?, ?)',
              ['patient@example.com', 'patient@example.com', hashedPassword, '測試病人', 'patient', '0987654321'],
              function(err) {
                if (err) {
                  console.error('創建預設病人用戶失敗:', err.message);
                } else {
                  console.log('預設病人用戶創建成功，ID:', this.lastID);
                }
              }
            );
          });
        });
      } else {
        console.log('users 表已存在');
      }
      
      // 2. 檢查 schedule 表是否存在
      db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='schedule'", (err, table) => {
        if (err) {
          console.error('檢查 schedule 表時出錯:', err.message);
          return reject(err);
        }
        
        if (!table) {
          console.log('正在創建 schedule 表...');
          db.run(`CREATE TABLE schedule (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            date TEXT NOT NULL,
            doctor_id INTEGER,
            start_time TEXT,
            end_time TEXT,
            slot_duration INTEGER DEFAULT 30,
            is_rest_day INTEGER DEFAULT 0,
            defined_slots TEXT,            
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (doctor_id) REFERENCES users(id)
          )`, (err) => {
            if (err) {
              console.error('創建 schedule 表失敗:', err.message);
              return reject(err);
            }
            console.log('schedule 表創建成功');
          });
        } else {
          console.log('schedule 表已存在');
        }
        
        // 3. 檢查 appointments 表是否存在
        db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='appointments'", (err, table) => {
          if (err) {
            console.error('檢查 appointments 表時出錯:', err.message);
            return reject(err);
          }
          
          if (!table) {
            console.log('正在創建 appointments 表...');
            db.run(`CREATE TABLE appointments (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              date TEXT NOT NULL,
              time TEXT NOT NULL,
              patient_id INTEGER,
              doctor_id INTEGER,
              status TEXT DEFAULT 'confirmed',
              notes TEXT,
              created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
              updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
              FOREIGN KEY (patient_id) REFERENCES users(id),
              FOREIGN KEY (doctor_id) REFERENCES users(id)
            )`, (err) => {
              if (err) {
                console.error('創建 appointments 表失敗:', err.message);
                return reject(err);
              }
              console.log('appointments 表創建成功');
            });
          } else {
            console.log('appointments 表已存在');
          }
          
          // 4. 檢查 settings 表是否存在
          db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='settings'", (err, table) => {
            if (err) {
              console.error('檢查 settings 表時出錯:', err.message);
              return reject(err);
            }
            
            if (!table) {
              console.log('正在創建 settings 表...');
              db.run(`CREATE TABLE settings (
                id INTEGER PRIMARY KEY DEFAULT 1,
                doctorName TEXT,
                clinicName TEXT,
                notificationEmail TEXT,
                defaultTimeSlots TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
              )`, (err) => {
                if (err) {
                  console.error('創建 settings 表失敗:', err.message);
                  return reject(err);
                }
                console.log('settings 表創建成功');
                resolve();
              });
            } else {
              console.log('settings 表已存在');
              resolve();
            }
          });
        });
      });
    });
  });
};

// 創建資料庫連接函數
const connectDatabase = () => {
  console.log(`[DB DEBUG] Attempting to connect to database at: ${dbPath}`);
  const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE, err => {
    if (err) {
      console.error('[DB ERROR] Could not connect to database:', err.message);
      // 在這裡，如果連接失敗，db 對象可能未完全初始化或無效，
      // 添加 .on('error') 可能沒有意義，或者本身就會出錯。
      // 主要的連接錯誤已經在這裡處理了。
      return; // 提前返回，因為 db 無效
    }
    console.log(`[DB INFO] Successfully connected to database: ${dbPath}`);
    
    // 為已成功連接的 db 實例添加全局錯誤監聽器
    db.on('error', (error) => {
      console.error('[SQLite DB Global Error Event]:', error.message);
      // 這裡可以考慮更複雜的錯誤處理邏輯，例如嘗試重新連接或關閉應用
    });

    db.on('open', () => {
      console.log('[DB INFO] Database connection opened successfully.');
    });

    // 啟用外鍵約束
    db.run('PRAGMA foreign_keys = ON');
    
    // 初始化資料庫模式
    initializeDatabase(db)
      .then(() => {
        console.log('資料庫初始化完成');
      })
      .catch(err => {
        console.error('資料庫初始化失敗:', err);
      });
  });
  
  return db;
};

// 檢查資料庫連接
const testConnection = (db) => {
  return new Promise((resolve, reject) => {
    db.get('SELECT sqlite_version() as version', (err, row) => {
      if (err) {
        console.error('資料庫連接測試失敗:', err.message);
        reject(err);
      } else {
        console.log(`資料庫連接測試成功。SQLite 版本: ${row.version}`);
        resolve(row.version);
      }
    });
  });
};

// 關閉資料庫連接
const closeDatabase = (db) => {
  if (db) {
    db.close((err) => {
      if (err) {
        console.error('關閉資料庫時發生錯誤:', err.message);
      } else {
        console.log('資料庫連接已關閉');
      }
    });
  }
};

module.exports = {
  connectDatabase,
  testConnection,
  closeDatabase,
  dbPath,
  initializeDatabase
}; 