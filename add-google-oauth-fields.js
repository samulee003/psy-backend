/**
 * 為 users 表添加 Google OAuth 2.0 相關欄位
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'database.sqlite');

function addGoogleOAuthFields() {
  console.log('開始為 users 表添加 Google OAuth 欄位...\n');
  
  const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
      console.error('資料庫連接失敗:', err.message);
      return;
    }
    console.log('✅ 已連接到資料庫:', dbPath);
  });

  // 檢查當前表結構
  db.all("PRAGMA table_info(users)", (err, columns) => {
    if (err) {
      console.error('查詢表結構失敗:', err.message);
      db.close();
      return;
    }

    console.log('📋 當前 users 表結構:');
    columns.forEach(column => {
      console.log(`  ${column.name}: ${column.type}${column.notnull ? ' NOT NULL' : ''}${column.dflt_value ? ` DEFAULT ${column.dflt_value}` : ''}`);
    });

    // 檢查是否已有 google_id 欄位
    const hasGoogleId = columns.some(col => col.name === 'google_id');
    const hasProfilePicture = columns.some(col => col.name === 'profile_picture');

    console.log('\n🔍 欄位檢查結果:');
    console.log(`  google_id: ${hasGoogleId ? '✅ 已存在' : '❌ 不存在'}`);
    console.log(`  profile_picture: ${hasProfilePicture ? '✅ 已存在' : '❌ 不存在'}`);

    const updates = [];

    // 添加 google_id 欄位
    if (!hasGoogleId) {
      updates.push({
        sql: 'ALTER TABLE users ADD COLUMN google_id TEXT UNIQUE',
        description: '添加 Google ID 欄位（唯一）'
      });
    }

    // 添加 profile_picture 欄位
    if (!hasProfilePicture) {
      updates.push({
        sql: 'ALTER TABLE users ADD COLUMN profile_picture TEXT',
        description: '添加用戶頭像 URL 欄位'
      });
    }

    if (updates.length === 0) {
      console.log('\n🎉 所有必要的欄位都已存在，無需更新');
      db.close();
      return;
    }

    console.log(`\n🔧 需要執行 ${updates.length} 個更新:`);
    updates.forEach((update, index) => {
      console.log(`  ${index + 1}. ${update.description}`);
    });

    // 執行更新
    let completed = 0;
    updates.forEach((update, index) => {
      db.run(update.sql, (err) => {
        if (err) {
          console.error(`❌ 更新 ${index + 1} 失敗:`, err.message);
        } else {
          console.log(`✅ 更新 ${index + 1} 成功: ${update.description}`);
        }
        
        completed++;
        if (completed === updates.length) {
          // 所有更新完成，檢查最終結果
          db.all("PRAGMA table_info(users)", (err, newColumns) => {
            if (err) {
              console.error('查詢更新後表結構失敗:', err.message);
            } else {
              console.log('\n📋 更新後的 users 表結構:');
              newColumns.forEach(column => {
                const isNew = !columns.some(oldCol => oldCol.name === column.name);
                const marker = isNew ? '🆕 ' : '   ';
                console.log(`${marker}${column.name}: ${column.type}${column.notnull ? ' NOT NULL' : ''}${column.dflt_value ? ` DEFAULT ${column.dflt_value}` : ''}`);
              });
              
              console.log('\n🎉 Google OAuth 欄位添加完成！');
            }
            
            db.close((err) => {
              if (err) {
                console.error('關閉資料庫連接失敗:', err.message);
              } else {
                console.log('✅ 資料庫連接已關閉');
              }
            });
          });
        }
      });
    });
  });
}

// 如果直接運行此腳本
if (require.main === module) {
  addGoogleOAuthFields();
}

module.exports = { addGoogleOAuthFields }; 