console.log('Script find-demo-users.js started.');

const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const dbPath = path.resolve(__dirname, 'database.sqlite');

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

    // 然後執行查詢
    const searchTerm = '%demo%';
    const query = ` 
      SELECT id, name, email, role 
      FROM users 
      WHERE name LIKE ? OR email LIKE ?
    `; // 假設 email 欄位存在，後面根據表結構調整

    db.all(query, [searchTerm, searchTerm], (queryErr, rows) => {
      if (queryErr) {
        console.error("Error querying users table:", queryErr.message);
      } else {
        if (rows && rows.length > 0) {
          console.log("\nFound potential 'Demo' users:");
          rows.forEach((row) => {
            // 檢查欄位是否存在再打印
            const id = row.id !== undefined ? row.id : 'N/A';
            const name = row.name !== undefined ? row.name : 'N/A';
            const email = row.email !== undefined ? row.email : 'N/A';
            const role = row.role !== undefined ? row.role : 'N/A';
            console.log(`ID: ${id}, Name: ${name}, Email: ${email}, Role: ${role}`);
          });
        } else {
          console.log("\nNo users found matching 'demo' in name or email, or query returned no results.");
        }
      }
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