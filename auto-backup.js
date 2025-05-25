const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, 'database.sqlite');
const backupDir = path.join(__dirname, 'backups');

// 確保備份目錄存在
if (!fs.existsSync(backupDir)) {
  fs.mkdirSync(backupDir);
}

// 創建時間戳格式的備份文件名
const timestamp = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);
const backupPath = path.join(backupDir, `database_backup_${timestamp}.sqlite`);

try {
  // 複製數據庫文件
  fs.copyFileSync(dbPath, backupPath);
  console.log(`✅ 數據庫備份成功: ${backupPath}`);
  
  // 清理舊備份（保留最新10個）
  const backupFiles = fs.readdirSync(backupDir)
    .filter(file => file.startsWith('database_backup_') && file.endsWith('.sqlite'))
    .map(file => ({
      name: file,
      path: path.join(backupDir, file),
      mtime: fs.statSync(path.join(backupDir, file)).mtime
    }))
    .sort((a, b) => b.mtime - a.mtime);
  
  // 刪除超過10個的舊備份
  if (backupFiles.length > 10) {
    const filesToDelete = backupFiles.slice(10);
    filesToDelete.forEach(file => {
      fs.unlinkSync(file.path);
      console.log(`🗑️  已刪除舊備份: ${file.name}`);
    });
  }
  
  console.log(`📊 目前保留 ${Math.min(backupFiles.length, 10)} 個備份文件`);
  
} catch (error) {
  console.error('❌ 備份失敗:', error.message);
  process.exit(1);
} 