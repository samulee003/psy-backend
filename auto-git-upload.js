const { execSync } = require('child_process');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log('🚀 正在準備自動上傳至Git...');

try {
  // 檢查是否有修改
  const status = execSync('git status --porcelain').toString();
  
  if (!status.trim()) {
    console.log('✅ 沒有檢測到任何更改，無需上傳。');
    rl.close();
  } else {
    // 顯示更改的文件
    console.log('📋 檢測到以下更改的文件:');
    console.log(status);
    
    // 顯示文件修改統計
    try {
      const diffStat = execSync('git diff --stat').toString();
      if (diffStat.trim()) {
        console.log('\n📊 修改統計:');
        console.log(diffStat);
      }
    } catch (e) {
      // 忽略統計錯誤
    }
    
    // 添加所有更改的文件
    console.log('\n📦 添加所有更改的文件...');
    execSync('git add .');
    console.log('✅ 文件已添加到暫存區');
    
    // 獲取提交信息
    rl.question('📝 請輸入提交訊息 (或直接按Enter使用默認訊息): ', (commitMessage) => {
      const message = commitMessage.trim() || '🔧 自動提交：生產環境資料庫修復相關更新';
      
      try {
        // 提交更改
        console.log('💾 正在提交更改...');
        execSync(`git commit -q -m "${message}"`);
        console.log('✅ 已提交更改');
        
        // 推送到遠程倉庫
        console.log('🌐 正在推送到遠程倉庫...');
        execSync('git push -q');
        console.log('🎉 已成功上傳至Git!');
        
        // 顯示最新提交信息
        try {
          const lastCommit = execSync('git log -1 --oneline').toString().trim();
          console.log(`📌 最新提交: ${lastCommit}`);
        } catch (e) {
          // 忽略顯示錯誤
        }
        
      } catch (error) {
        console.error('❌ 上傳失敗:', error.message);
        
        // 如果是推送失敗，提供解決建議
        if (error.message.includes('push')) {
          console.log('\n💡 推送失敗可能的解決方案:');
          console.log('1. 檢查網路連接');
          console.log('2. 確認遠程倉庫權限');
          console.log('3. 嘗試先拉取最新更改: git pull');
          console.log('4. 手動推送: git push');
        }
      }
      
      rl.close();
    });
  }
} catch (error) {
  console.error('❌ 操作失敗:', error.message);
  
  // 提供詳細的錯誤診斷
  if (error.message.includes('not a git repository')) {
    console.log('💡 此目錄不是Git倉庫，請先執行: git init');
  } else if (error.message.includes('git')) {
    console.log('💡 請確認Git已正確安裝並配置');
  }
  
  rl.close();
} 