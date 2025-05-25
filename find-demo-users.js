console.log('Script find-demo-users.js started.');

const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const dbPath = path.join(__dirname, 'database.sqlite');

console.log(`Attempting to connect to database at: ${dbPath}`);

// 將資料庫操作放在連接成功的回調中
// 嘗試使用 OPEN_READWRITE 模式，並檢查 err 是否為 null
const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READWRITE, (err) => {
  if (err) {
    console.error("Error opening database:", err.message);
    console.error("Error object:", err);
    return;
  }
  console.log("Successfully connected to the SQLite database (OPEN_READWRITE).");

  // 先獲取 users 表的結構
  db.all("PRAGMA table_info(users);", (pragmaErr, columns) => {
    if (pragmaErr) {
      console.error("Error fetching users table info:", pragmaErr.message);
    } else {
      console.log("Columns in users table:");
      if (columns && columns.length > 0) {
        columns.forEach(column => {
          console.log(`Name: ${column.name}, Type: ${column.type}, NotNull: ${column.notnull}, Default: ${column.dflt_value}, PK: ${column.pk}`);
        });
      } else {
        console.log("Could not retrieve column info or users table is empty/does not exist.");
      }
    }

    // 用戶提到的郵箱
    const searchEmails = [
      'testing@gmail.com',
      'samu003@gmail.com', 
      'test@gmail.com',
      'sasha0970@gmail.com'
    ];

    console.log('搜尋以下郵箱:', searchEmails.join(', '), '\n');

    // 查詢所有用戶
    db.all('SELECT * FROM users ORDER BY id', [], (err, users) => {
      if (err) {
        console.error('查詢失敗:', err.message);
        return;
      }
      
      console.log(`當前數據庫總用戶數: ${users.length}\n`);
      
      console.log('=== 所有用戶列表 ===');
      users.forEach(user => {
        console.log(`ID: ${user.id} | 郵箱: ${user.email} | 姓名: ${user.name} | 角色: ${user.role} | 創建: ${user.created_at}`);
      });
      
      console.log('\n=== 搜尋結果 ===');
      searchEmails.forEach(email => {
        const user = users.find(u => u.email === email);
        if (user) {
          console.log(`✅ 找到 ${email}:`);
          console.log(`   ID: ${user.id}, 姓名: ${user.name}, 角色: ${user.role}, 創建: ${user.created_at}`);
        } else {
          console.log(`❌ 未找到 ${email}`);
        }
      });
      
      // 檢查是否有其他可疑的數據變更
      console.log('\n=== 數據分析 ===');
      
      // 檢查 ID 3 和 ID 4 的實際數據
      const user3 = users.find(u => u.id === 3);
      const user4 = users.find(u => u.id === 4);
      
      if (user3) {
        console.log(`ID 3 實際用戶: ${user3.email} (${user3.name}) - ${user3.role}`);
      }
      
      if (user4) {
        console.log(`ID 4 實際用戶: ${user4.email} (${user4.name}) - ${user4.role}`);
      }
      
      // 檢查今天的變更
      const today = '2025-05-24';
      const todayUsers = users.filter(u => u.created_at && u.created_at.startsWith(today));
      console.log(`\n今天創建的用戶數: ${todayUsers.length}`);
      todayUsers.forEach(u => {
        console.log(`  - ${u.email} (ID: ${u.id}) - ${u.created_at}`);
      });
      
      db.close((closeErr) => {
        if (closeErr) {
          console.error("Error closing database:", closeErr.message);
        } else {
          console.log("Database connection closed.");
        }
      });
    });
  });
});

console.log('Script find-demo-users.js finished registration of async callbacks.'); 