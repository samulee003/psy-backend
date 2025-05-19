// 資料庫更新腳本：添加 isRestDay 欄位到 schedule 表
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

console.log('開始執行資料庫更新腳本 - 添加 isRestDay 欄位到 schedule 表');

// 資料庫路徑 - 支援 Zeabur 持久化卷
const dbPath = process.env.DB_PATH || path.join(__dirname, 'database.sqlite');
console.log('資料庫路徑:', dbPath);

// 連接資料庫
console.log('嘗試連接到資料庫...');
const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READWRITE, err => {
  if (err) {
    console.error('無法連接到資料庫:', err.message);
    process.exit(1);
  }
  console.log('已成功連接到資料庫');

  // 檢查表是否存在
  console.log('檢查 schedule 表是否存在...');
  db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='schedule'", (err, row) => {
    if (err) {
      console.error('檢查表時出錯:', err.message);
      closeAndExit(1);
      return;
    }

    if (!row) {
      console.error('schedule 表不存在，無法添加欄位');
      closeAndExit(1);
      return;
    }

    console.log('schedule 表已存在，檢查欄位...');

    // 檢查欄位是否存在
    db.all('PRAGMA table_info(schedule)', (err, rows) => {
      if (err) {
        console.error('檢查表結構時出錯:', err.message);
        closeAndExit(1);
        return;
      }

      console.log('表結構信息:', rows);
      const hasIsRestDay = rows.some(col => col.name === 'isRestDay');

      if (hasIsRestDay) {
        console.log('isRestDay 欄位已存在，無需修改');
        closeAndExit(0);
        return;
      }

      console.log('正在添加 isRestDay 欄位...');

      // 添加欄位
      db.run('ALTER TABLE schedule ADD COLUMN isRestDay INTEGER DEFAULT 0', function (err) {
        if (err) {
          console.error('添加欄位失敗:', err.message);
          closeAndExit(1);
          return;
        }

        console.log('已成功添加 isRestDay 欄位到 schedule 表');
        console.log('受影響的行數:', this.changes);

        // 確認欄位已添加
        db.all('PRAGMA table_info(schedule)', (err, rows) => {
          if (err) {
            console.error('確認欄位時出錯:', err.message);
            closeAndExit(1);
            return;
          }

          console.log('更新後的表結構:', rows);
          closeAndExit(0);
        });
      });
    });
  });
});

// 關閉資料庫並退出
function closeAndExit(code) {
  console.log(`準備以代碼 ${code} 退出...`);
  db.close(err => {
    if (err) {
      console.error('關閉資料庫時出錯:', err.message);
    } else {
      console.log('資料庫連接已關閉');
    }
    console.log('腳本完成');
    process.exit(code);
  });
}
