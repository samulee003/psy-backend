/**
 * SQLite 資料庫備份腳本
 * 將目前的資料庫檔案複製到備份目錄中，並添加時間戳記
 */

const fs = require('fs');
const path = require('path');

// 獲取資料庫路徑（優先使用環境變數）
const dbPath = process.env.DB_PATH || path.join(__dirname, 'database.sqlite');
console.log(`資料庫路徑: ${dbPath}`);

// 建立備份目錄
const backupDir = path.join(__dirname, 'backups');
if (!fs.existsSync(backupDir)) {
  fs.mkdirSync(backupDir);
  console.log(`已創建備份目錄: ${backupDir}`);
}

// 生成帶時間戳的備份檔案名稱
const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const backupFileName = `database-backup-${timestamp}.sqlite`;
const backupPath = path.join(backupDir, backupFileName);

try {
  // 檢查資料庫檔案是否存在
  if (!fs.existsSync(dbPath)) {
    console.error(`錯誤: 資料庫檔案不存在於 ${dbPath}`);
    process.exit(1);
  }

  // 複製資料庫檔案到備份位置
  fs.copyFileSync(dbPath, backupPath);
  console.log(`備份成功: ${backupPath}`);

  // 清理舊備份（可選，保留最近10個備份）
  const files = fs.readdirSync(backupDir)
    .filter(file => file.startsWith('database-backup-'))
    .sort()
    .reverse();

  const maxBackups = 10;
  if (files.length > maxBackups) {
    console.log(`保留最近 ${maxBackups} 個備份，刪除舊備份...`);
    files.slice(maxBackups).forEach(file => {
      const oldBackupPath = path.join(backupDir, file);
      fs.unlinkSync(oldBackupPath);
      console.log(`已刪除舊備份: ${file}`);
    });
  }

  console.log('備份過程完成');
} catch (err) {
  console.error('備份過程中發生錯誤:', err);
  process.exit(1);
} 