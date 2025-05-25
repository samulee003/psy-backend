const fs = require('fs');
const path = require('path');

console.log('🔍 驗證數據庫備份完整性...\n');

// 檢查原始數據庫
const originalDb = 'database.sqlite';
if (!fs.existsSync(originalDb)) {
    console.log('❌ 找不到原始數據庫文件！');
    process.exit(1);
}

const originalStats = fs.statSync(originalDb);
console.log(`📁 原始數據庫: ${originalDb}`);
console.log(`📊 大小: ${originalStats.size} bytes`);
console.log(`📅 修改時間: ${originalStats.mtime}\n`);

// 檢查備份目錄
const backupDir = 'backups';
if (!fs.existsSync(backupDir)) {
    console.log('❌ 找不到備份目錄！');
    process.exit(1);
}

// 獲取所有備份文件
const backupFiles = fs.readdirSync(backupDir)
    .filter(file => file.endsWith('.sqlite'))
    .map(file => path.join(backupDir, file));

if (backupFiles.length === 0) {
    console.log('❌ 備份目錄中沒有找到備份文件！');
    process.exit(1);
}

console.log(`📦 找到 ${backupFiles.length} 個備份文件:\n`);

let allBackupsValid = true;

backupFiles.forEach((backupFile, index) => {
    const backupStats = fs.statSync(backupFile);
    const isValid = backupStats.size === originalStats.size;
    
    console.log(`${index + 1}. ${path.basename(backupFile)}`);
    console.log(`   📊 大小: ${backupStats.size} bytes`);
    console.log(`   📅 創建時間: ${backupStats.mtime}`);
    console.log(`   ${isValid ? '✅ 驗證通過' : '❌ 驗證失敗'}\n`);
    
    if (!isValid) {
        allBackupsValid = false;
    }
});

if (allBackupsValid) {
    console.log('🎉 所有備份文件驗證通過！數據庫備份完整。');
    console.log('✅ 階段零第一步完成：數據庫備份成功！');
} else {
    console.log('❌ 部分備份文件驗證失敗！請重新創建備份。');
    process.exit(1);
} 