/**
 * 修復 Google ID 欄位添加問題
 * SQLite 不支持直接添加 UNIQUE 欄位，需要分步驟進行
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'database.sqlite');

function fixGoogleIdField() {
  console.log('開始修復 Google ID 欄位...\n');
  
  const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
      console.error('資料庫連接失敗:', err.message);
      return;
    }
    console.log('✅ 已連接到資料庫:', dbPath);
  });

  // 檢查 google_id 欄位是否存在
  db.all("PRAGMA table_info(users)", (err, columns) => {
    if (err) {
      console.error('查詢表結構失敗:', err.message);
      db.close();
      return;
    }

    const hasGoogleId = columns.some(col => col.name === 'google_id');
    
    if (hasGoogleId) {
      console.log('✅ google_id 欄位已存在，檢查唯一索引...');
      
      // 檢查是否有唯一索引
      db.all("PRAGMA index_list(users)", (err, indexes) => {
        if (err) {
          console.error('查詢索引失敗:', err.message);
          db.close();
          return;
        }
        
        const hasUniqueIndex = indexes.some(index => 
          index.name.includes('google_id') && index.unique === 1
        );
        
        if (hasUniqueIndex) {
          console.log('✅ Google ID 唯一索引已存在，無需修復');
          db.close();
        } else {
          console.log('🔧 創建 Google ID 唯一索引...');
          db.run("CREATE UNIQUE INDEX idx_users_google_id ON users(google_id)", (err) => {
            if (err) {
              console.error('❌ 創建唯一索引失敗:', err.message);
            } else {
              console.log('✅ Google ID 唯一索引創建成功');
            }
            db.close();
          });
        }
      });
    } else {
      console.log('🔧 添加 google_id 欄位...');
      
      // 先添加欄位，不帶 UNIQUE 約束
      db.run("ALTER TABLE users ADD COLUMN google_id TEXT", (err) => {
        if (err) {
          console.error('❌ 添加 google_id 欄位失敗:', err.message);
          db.close();
          return;
        }
        
        console.log('✅ google_id 欄位添加成功');
        console.log('🔧 創建 Google ID 唯一索引...');
        
        // 再創建唯一索引
        db.run("CREATE UNIQUE INDEX idx_users_google_id ON users(google_id)", (err) => {
          if (err) {
            console.error('❌ 創建唯一索引失敗:', err.message);
          } else {
            console.log('✅ Google ID 唯一索引創建成功');
          }
          
          // 檢查最終結果
          db.all("PRAGMA table_info(users)", (err, newColumns) => {
            if (err) {
              console.error('查詢最終表結構失敗:', err.message);
            } else {
              console.log('\n📋 最終 users 表結構:');
              newColumns.forEach(column => {
                const marker = column.name === 'google_id' ? '🆕 ' : '   ';
                console.log(`${marker}${column.name}: ${column.type}${column.notnull ? ' NOT NULL' : ''}${column.dflt_value ? ` DEFAULT ${column.dflt_value}` : ''}`);
              });
              
              console.log('\n🎉 Google ID 欄位修復完成！');
            }
            
            db.close((err) => {
              if (err) {
                console.error('關閉資料庫連接失敗:', err.message);
              } else {
                console.log('✅ 資料庫連接已關閉');
              }
            });
          });
        });
      });
    }
  });
}

// 如果直接運行此腳本
if (require.main === module) {
  fixGoogleIdField();
}

module.exports = { fixGoogleIdField }; 