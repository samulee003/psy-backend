/**
 * SQLite 資料庫還原腳本
 * 將備份的資料庫檔案還原到當前使用的資料庫路徑
 * 使用方式: node db-restore.js <備份檔案名稱>
 * 例如: node db-restore.js database-backup-2025-05-18T10-30-00-000Z.sqlite
 */

const fs = require('fs');
const path = require('path');

// 檢查命令行參數
if (process.argv.length < 3) {
  console.error('錯誤: 請提供要還原的備份檔案名稱');
  console.error('用法: node db-restore.js <備份檔案名稱>');
  console.error('例如: node db-restore.js database-backup-2025-05-18T10-30-00-000Z.sqlite');
  process.exit(1);
}

// 獲取備份檔案名稱
const backupFileName = process.argv[2];
const backupDir = path.join(__dirname, 'backups');
const backupPath = path.join(backupDir, backupFileName);

// 獲取目標資料庫路徑（優先使用環境變數）
const dbPath = process.env.DB_PATH || path.join(__dirname, 'database.sqlite');

try {
  // 檢查備份檔案是否存在
  if (!fs.existsSync(backupPath)) {
    console.error(`錯誤: 備份檔案不存在於 ${backupPath}`);
    
    // 列出可用的備份檔案
    console.log('可用的備份檔案:');
    if (fs.existsSync(backupDir)) {
      const availableBackups = fs.readdirSync(backupDir)
        .filter(file => file.startsWith('database-backup-'))
        .sort()
        .reverse();
      
      if (availableBackups.length === 0) {
        console.log('- 沒有找到備份檔案');
      } else {
        availableBackups.forEach(file => console.log(`- ${file}`));
      }
    } else {
      console.log('- 備份目錄不存在');
    }
    
    process.exit(1);
  }

  // 先備份當前資料庫（如果存在）
  if (fs.existsSync(dbPath)) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const currentBackupPath = path.join(backupDir, `database-before-restore-${timestamp}.sqlite`);
    fs.copyFileSync(dbPath, currentBackupPath);
    console.log(`已備份當前資料庫到: ${currentBackupPath}`);
  }

  // 複製備份檔案到目標路徑
  fs.copyFileSync(backupPath, dbPath);
  console.log(`還原成功: 從 ${backupPath} 到 ${dbPath}`);

  // 確保正確的權限
  fs.chmodSync(dbPath, 0o644);
  console.log('已設置資料庫檔案權限為 644');

  console.log('還原過程完成');
} catch (err) {
  console.error('還原過程中發生錯誤:', err);
  process.exit(1);
} 