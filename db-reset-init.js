const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const { dbPath, initializeDatabase } = require('./config/db'); // 假設 initializeDatabase 會處理表創建

console.log('[DB_RESET] 開始執行資料庫重置腳本...');
console.log(`[DB_RESET] 資料庫路徑: ${dbPath}`);

const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READWRITE, async (err) => {
  if (err) {
    console.error('[DB_RESET] 連接資料庫失敗:', err.message);
    process.exit(1);
  }
  console.log('[DB_RESET] 已成功連接到資料庫。');

  const tablesToDrop = ['appointments', 'schedule', 'settings', 'users']; // 注意順序，先刪除有外鍵的表

  db.serialize(async () => {
    console.log('[DB_RESET] 禁用外鍵約束...');
    db.run('PRAGMA foreign_keys = OFF;');

    for (const tableName of tablesToDrop) {
      console.log(`[DB_RESET] 嘗試刪除表: ${tableName}...`);
      await new Promise((resolve, reject) => {
        db.run(`DROP TABLE IF EXISTS ${tableName}`, function(err) {
          if (err) {
            console.error(`[DB_RESET] 刪除表 ${tableName} 失敗:`, err.message);
            reject(err);
          } else {
            console.log(`[DB_RESET] 表 ${tableName} 已成功刪除或原本就不存在。`);
            resolve();
          }
        });
      });
    }

    console.log('[DB_RESET] 重新啟用外鍵約束...');
    db.run('PRAGMA foreign_keys = ON;');

    console.log('[DB_RESET] 所有舊表已刪除。準備重新初始化資料庫結構...');
    try {
      await initializeDatabase(db); // initializeDatabase 應該返回 Promise
      console.log('[DB_RESET] 資料庫結構已通過 initializeDatabase 重新創建。');
    } catch (initErr) {
      console.error('[DB_RESET] initializeDatabase 執行失敗:', initErr);
      db.close();
      process.exit(1);
    }

    console.log('[DB_RESET] 資料庫重置腳本執行完畢。');
    db.close((closeErr) => {
      if (closeErr) {
        console.error('[DB_RESET] 關閉資料庫連接失敗:', closeErr.message);
        process.exit(1);
      }
      console.log('[DB_RESET] 資料庫連接已關閉。');
      process.exit(0);
    });
  });
}); 