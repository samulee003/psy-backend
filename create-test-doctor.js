/**
 * 創建測試醫生用戶
 */

const bcrypt = require('bcrypt');
const sqlite3 = require('sqlite3').verbose();

const db = new sqlite3.Database('./database.sqlite');

async function createTestDoctor() {
  try {
    // 生成密碼哈希
    const hash = await bcrypt.hash('password123', 10);
    
    // 插入測試醫生
    const query = `
      INSERT OR IGNORE INTO users (name, email, username, password, role, created_at) 
      VALUES (?, ?, ?, ?, ?, datetime('now'))
    `;
    
    db.run(query, ['Test Doctor', 'doctor@example.com', 'doctor', hash, 'doctor'], function(err) {
      if (err) {
        console.log('創建測試醫生失敗:', err.message);
      } else {
        console.log('測試醫生創建成功，ID:', this.lastID);
      }
      db.close();
    });
    
  } catch (error) {
    console.error('錯誤:', error.message);
    db.close();
  }
}

createTestDoctor(); 