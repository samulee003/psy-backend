const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const path = require('path');

// 連接資料庫
const dbPath = path.join(__dirname, 'database.sqlite');
const db = new sqlite3.Database(dbPath);

console.log('=== 創建 sasha0970@gmail.com 醫生帳號 ===\n');

async function createDoctor() {
  try {
    // 加密密碼
    const hashedPassword = await bcrypt.hash('jesus511907', 10);
    
    // 檢查是否已存在
    db.get('SELECT * FROM users WHERE email = ?', ['sasha0970@gmail.com'], (err, existingUser) => {
      if (err) {
        console.error('檢查用戶失敗:', err.message);
        return;
      }
      
      if (existingUser) {
        console.log('✅ 醫生帳號已存在');
        console.log(`  - ID: ${existingUser.id}`);
        console.log(`  - 姓名: ${existingUser.name}`);
        console.log(`  - 郵箱: ${existingUser.email}`);
        console.log(`  - 角色: ${existingUser.role}`);
        db.close();
        return;
      }
      
      // 創建新醫生帳號
      const query = `
        INSERT INTO users (username, email, password, name, role, phone, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
      `;
      
      db.run(query, [
        'sasha0970@gmail.com',
        'sasha0970@gmail.com', 
        hashedPassword,
        '惠筠心理治療師',
        'doctor',
        '65713250'
      ], function(err) {
        if (err) {
          console.error('創建醫生失敗:', err.message);
        } else {
          console.log('✅ 成功創建醫生帳號');
          console.log(`  - ID: ${this.lastID}`);
          console.log(`  - 姓名: 惠筠心理治療師`);
          console.log(`  - 郵箱: sasha0970@gmail.com`);
          console.log(`  - 密碼: jesus511907`);
          console.log(`  - 角色: doctor`);
          console.log(`  - 電話: 65713250`);
        }
        db.close();
      });
    });
  } catch (error) {
    console.error('創建醫生過程中發生錯誤:', error);
    db.close();
  }
}

createDoctor(); 