const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const path = require('path');

const dbPath = path.join(__dirname, 'database.sqlite');
const db = new sqlite3.Database(dbPath);

console.log('=== 重新創建丟失的用戶帳號 ===\n');

async function recreateUsers() {
  try {
    // 根據用戶日誌中提到的帳號重新創建
    const lostUsers = [
      {
        email: 'testing@gmail.com',
        password: 'test123', // 請用戶確認密碼
        name: 'Testing User',
        role: 'patient',
        phone: '65713250'
      },
      {
        email: 'samu003@gmail.com', 
        password: 'sam003', // 根據日誌中的成功登入推測
        name: '朱昌蔚',
        role: 'patient', // 根據日誌顯示是 patient
        phone: '65713250'
      },
      {
        email: 'test@gmail.com',
        password: 'sam003', // 根據日誌推測
        name: 'test',
        role: 'patient',
        phone: '65713250'
      }
    ];

    console.log('準備重新創建以下用戶:');
    lostUsers.forEach(user => {
      console.log(`- ${user.email} (${user.name}) - ${user.role}`);
    });
    
    console.log('\n開始創建...\n');

    for (const user of lostUsers) {
      // 檢查是否已存在
      const existing = await new Promise((resolve) => {
        db.get('SELECT * FROM users WHERE email = ?', [user.email], (err, row) => {
          resolve(row);
        });
      });

      if (existing) {
        console.log(`⚠️  用戶 ${user.email} 已存在，跳過`);
        continue;
      }

      // 創建用戶
      const hashedPassword = await bcrypt.hash(user.password, 10);
      
      await new Promise((resolve, reject) => {
        const query = `
          INSERT INTO users (username, email, password, name, role, phone, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
        `;
        
        db.run(query, [
          user.email, // 使用郵箱作為用戶名
          user.email,
          hashedPassword,
          user.name,
          user.role,
          user.phone
        ], function(err) {
          if (err) {
            console.error(`❌ 創建用戶 ${user.email} 失敗:`, err.message);
            reject(err);
          } else {
            console.log(`✅ 成功創建用戶 ${user.email} (ID: ${this.lastID})`);
            resolve(this.lastID);
          }
        });
      });
    }

    // 檢查結果
    console.log('\n=== 創建結果檢查 ===');
    const allUsers = await new Promise((resolve) => {
      db.all('SELECT id, email, name, role FROM users ORDER BY id', [], (err, rows) => {
        resolve(rows || []);
      });
    });

    allUsers.forEach(user => {
      console.log(`ID: ${user.id} | ${user.email} | ${user.name} | ${user.role}`);
    });

  } catch (error) {
    console.error('重新創建用戶過程中發生錯誤:', error);
  } finally {
    db.close();
  }
}

recreateUsers(); 