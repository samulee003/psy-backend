const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');

// 要清理的數據庫文件路徑
const dbPath = 'C:\\Users\\emily\\Downloads\\database_to_clean.sqlite';
const outputFile = 'cleanup_step1_result.txt';

let output = '';

function log(message) {
  console.log(message);
  output += message + '\n';
}

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    log('無法打開數據庫:' + err.message);
    process.exit(1);
  }
  log('✅ 成功連接到數據庫');
});

async function cleanupTestUsers() {
  try {
    log('=== 第一步：清理測試用戶 ===');
    log('數據庫路徑: ' + dbPath);
    log('');
    
    // 要刪除的測試用戶郵箱
    const testUserEmails = [
      'doctor@example.com',
      'patient@example.com', 
      'admin@example.com'
    ];
    
    log('🔍 準備刪除以下測試用戶:');
    for (const email of testUserEmails) {
      const user = await queryOne('SELECT id, email, name, role FROM users WHERE email = ?', [email]);
      if (user) {
        log(`  - ID ${user.id}: ${user.email} (${user.name}) - 角色: ${user.role}`);
      } else {
        log(`  - ${email}: 未找到`);
      }
    }
    log('');
    
    // 執行刪除
    log('🗑️  開始刪除測試用戶...');
    let deletedCount = 0;
    
    for (const email of testUserEmails) {
      try {
        const result = await runQuery('DELETE FROM users WHERE email = ?', [email]);
        if (result.changes > 0) {
          log(`✅ 已刪除用戶: ${email}`);
          deletedCount++;
        } else {
          log(`⚠️  用戶不存在或已被刪除: ${email}`);
        }
      } catch (error) {
        log(`❌ 刪除用戶 ${email} 時出錯: ${error.message}`);
      }
    }
    
    log('');
    log(`✅ 第一步完成！總共刪除了 ${deletedCount} 個測試用戶`);
    
    // 驗證結果
    log('');
    log('🔍 驗證結果 - 剩餘用戶列表:');
    const remainingUsers = await queryAll('SELECT id, email, name, role FROM users ORDER BY id');
    remainingUsers.forEach(user => {
      log(`  ✓ ID: ${user.id} | 郵箱: ${user.email} | 姓名: ${user.name} | 角色: ${user.role}`);
    });
    
    log('');
    log('✅ 第一步清理完成！接下來可以執行第二步（清理測試排班數據）');
    
    // 保存結果到文件
    fs.writeFileSync(outputFile, output);
    log(`\n✅ 清理結果已保存到: ${outputFile}`);
    
  } catch (error) {
    log('❌ 清理過程中出錯: ' + error);
  } finally {
    db.close();
  }
}

function queryOne(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) {
        reject(err);
      } else {
        resolve(row);
      }
    });
  });
}

function queryAll(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) {
        reject(err);
      } else {
        resolve(rows);
      }
    });
  });
}

function runQuery(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function(err) {
      if (err) {
        reject(err);
      } else {
        resolve({ changes: this.changes, lastID: this.lastID });
      }
    });
  });
}

// 執行清理
cleanupTestUsers(); 