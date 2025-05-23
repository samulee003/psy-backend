/**
 * 創建標準測試用戶的腳本
 */
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');
const path = require('path');

// 設置資料庫路徑
const dbPath = process.env.DB_PATH || path.join(__dirname, 'database.sqlite');
console.log('[標準用戶] 使用資料庫路徑:', dbPath);

// 標準測試用戶配置
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

// 連接資料庫
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('[標準用戶] 無法連接到資料庫:', err.message);
    process.exit(1);
  }
  console.log('[標準用戶] 成功連接到資料庫');
  createStandardUsers();
});

// 創建標準用戶函數
async function createStandardUsers() {
  try {
    console.log('[標準用戶] 開始創建標準測試用戶...');
    
    for (const userData of standardUsers) {
      await createUserIfNotExists(userData);
    }
    
    console.log('[標準用戶] 所有標準用戶處理完成！');
    
    // 列出所有用戶
    await listAllUsers();
    
    db.close();
    console.log('[標準用戶] 資料庫連接已關閉');
  } catch (error) {
    console.error('[標準用戶] 創建用戶時發生錯誤:', error.message);
    db.close();
    process.exit(1);
  }
}

// 檢查並創建用戶
function createUserIfNotExists(userData) {
  return new Promise((resolve, reject) => {
    // 先檢查用戶是否已存在
    db.get(
      'SELECT id, email, name, role FROM users WHERE email = ? OR username = ?',
      [userData.email, userData.username],
      async (err, existingUser) => {
        if (err) {
          return reject(new Error(`檢查用戶 ${userData.email} 時出錯: ${err.message}`));
        }
        
        if (existingUser) {
          console.log(`[標準用戶] 用戶已存在: ${existingUser.name} (${existingUser.email}) - ${existingUser.role}`);
          return resolve();
        }
        
        try {
          // 加密密碼
          const hashedPassword = await bcrypt.hash(userData.password, 10);
          
          // 創建新用戶
          db.run(
            'INSERT INTO users (username, email, password, name, role, phone) VALUES (?, ?, ?, ?, ?, ?)',
            [userData.username, userData.email, hashedPassword, userData.name, userData.role, userData.phone],
            function(err) {
              if (err) {
                return reject(new Error(`創建用戶 ${userData.email} 失敗: ${err.message}`));
              }
              console.log(`[標準用戶] ✅ 已創建用戶: ${userData.name} (${userData.email}) - ${userData.role}, ID: ${this.lastID}`);
              resolve();
            }
          );
        } catch (hashError) {
          reject(new Error(`密碼加密失敗: ${hashError.message}`));
        }
      }
    );
  });
}

// 列出所有用戶
function listAllUsers() {
  return new Promise((resolve, reject) => {
    db.all(
      'SELECT id, name, email, role, phone FROM users ORDER BY role, id',
      [],
      (err, users) => {
        if (err) {
          return reject(new Error(`查詢用戶列表失敗: ${err.message}`));
        }
        
        console.log('\n[標準用戶] === 當前資料庫中的所有用戶 ===');
        if (users.length === 0) {
          console.log('[標準用戶] 沒有找到任何用戶');
        } else {
          users.forEach(user => {
            console.log(`[標準用戶] ID: ${user.id} | ${user.name} (${user.email}) | 角色: ${user.role} | 電話: ${user.phone}`);
          });
        }
        console.log('[標準用戶] =============================\n');
        resolve();
      }
    );
  });
} 