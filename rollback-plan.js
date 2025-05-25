const fs = require('fs');
const path = require('path');

console.log('🚨 數據庫回滾計劃腳本\n');

// 獲取最新的備份文件
function getLatestBackup() {
    const backupDir = 'backups';
    if (!fs.existsSync(backupDir)) {
        console.log('❌ 找不到備份目錄！');
        return null;
    }

    const backupFiles = fs.readdirSync(backupDir)
        .filter(file => file.endsWith('.sqlite') && file.includes('before_patient_name_fix'))
        .map(file => ({
            name: file,
            path: path.join(backupDir, file),
            stats: fs.statSync(path.join(backupDir, file))
        }))
        .sort((a, b) => b.stats.mtime - a.stats.mtime);

    return backupFiles.length > 0 ? backupFiles[0] : null;
}

// 執行回滾
function performRollback() {
    const latestBackup = getLatestBackup();
    
    if (!latestBackup) {
        console.log('❌ 找不到可用的備份文件！');
        return false;
    }

    console.log(`📦 找到最新備份: ${latestBackup.name}`);
    console.log(`📅 備份時間: ${latestBackup.stats.mtime}`);
    console.log(`📊 備份大小: ${latestBackup.stats.size} bytes\n`);

    // 檢查當前數據庫
    const currentDb = 'database.sqlite';
    if (fs.existsSync(currentDb)) {
        // 創建當前數據庫的緊急備份
        const emergencyBackup = `database_emergency_backup_${Date.now()}.sqlite`;
        console.log(`💾 創建緊急備份: ${emergencyBackup}`);
        fs.copyFileSync(currentDb, emergencyBackup);
    }

    try {
        // 執行回滾
        console.log('🔄 正在執行回滾...');
        fs.copyFileSync(latestBackup.path, currentDb);
        
        // 驗證回滾
        const restoredStats = fs.statSync(currentDb);
        if (restoredStats.size === latestBackup.stats.size) {
            console.log('✅ 回滾成功！數據庫已還原到修復前的狀態。');
            console.log(`📊 還原後大小: ${restoredStats.size} bytes`);
            return true;
        } else {
            console.log('❌ 回滾驗證失敗！文件大小不匹配。');
            return false;
        }
    } catch (error) {
        console.log(`❌ 回滾失敗: ${error.message}`);
        return false;
    }
}

// 顯示回滾計劃
function showRollbackPlan() {
    console.log('📋 緊急回滾計劃:\n');
    console.log('1. 🔍 檢查可用備份文件');
    console.log('2. 💾 創建當前數據庫的緊急備份');
    console.log('3. 🔄 將備份文件複製為當前數據庫');
    console.log('4. ✅ 驗證回滾完整性');
    console.log('5. 📊 確認數據庫大小和內容\n');
    
    const latestBackup = getLatestBackup();
    if (latestBackup) {
        console.log('🎯 可用的最新備份:');
        console.log(`   📁 文件: ${latestBackup.name}`);
        console.log(`   📅 時間: ${latestBackup.stats.mtime}`);
        console.log(`   📊 大小: ${latestBackup.stats.size} bytes\n`);
        console.log('⚡ 執行回滾命令: node rollback-plan.js --execute');
    } else {
        console.log('❌ 沒有找到可用的備份文件！');
    }
}

// 主程序
const args = process.argv.slice(2);
if (args.includes('--execute')) {
    console.log('⚠️  即將執行數據庫回滾！\n');
    const success = performRollback();
    process.exit(success ? 0 : 1);
} else {
    showRollbackPlan();
} 