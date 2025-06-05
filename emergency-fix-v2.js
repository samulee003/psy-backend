/**
 * 緊急修復腳本 v2
 * 修正版：正確處理appointmentController的箭頭函數格式
 */

const fs = require('fs');
const path = require('path');

console.log('🚑 緊急修復 v2 開始...\n');

// 重新啟動服務
function restartCurrentService() {
  console.log('\n🔄 正在重啟服務...');
  
  const { exec } = require('child_process');
  
  // 1. 先停止當前服務
  exec('tasklist | findstr node', (error, stdout, stderr) => {
    if (stdout) {
      console.log('📋 當前Node.js進程:');
      console.log(stdout);
      
      // 提取PID並停止
      const lines = stdout.split('\n').filter(line => line.includes('node.exe'));
      lines.forEach(line => {
        const match = line.match(/node\.exe\s+(\d+)/);
        if (match) {
          const pid = match[1];
          console.log(`🛑 停止進程 PID: ${pid}`);
          exec(`taskkill /F /PID ${pid}`, (killError) => {
            if (killError) {
              console.log(`❌ 停止進程失敗: ${killError.message}`);
            } else {
              console.log(`✅ 進程 ${pid} 已停止`);
            }
          });
        }
      });
    }
  });
  
  // 2. 等待3秒後重新啟動
  setTimeout(() => {
    console.log('\n🚀 重新啟動服務...');
    const spawn = require('child_process').spawn;
    const serverProcess = spawn('node', ['server.js'], {
      stdio: 'inherit',
      detached: true
    });
    
    serverProcess.unref();
    console.log('✅ 服務已重新啟動');
  }, 3000);
}

// 創建簡化的修復
function createSimpleFix() {
  console.log('🔧 創建簡化修復...\n');
  
  // 1. 創建增強的錯誤處理中間件
  const enhancedErrorMiddleware = `
/**
 * 增強的錯誤處理中間件
 * 專門用於捕獲預約API的詳細錯誤
 */

const enhancedErrorHandler = (err, req, res, next) => {
  const timestamp = new Date().toISOString();
  
  console.error('[ENHANCED_ERROR] 詳細錯誤資訊:', {
    timestamp,
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    body: req.body,
    headers: {
      origin: req.headers.origin,
      userAgent: req.headers['user-agent'],
      contentType: req.headers['content-type']
    },
    user: req.user || null
  });
  
  // 如果是預約API錯誤，提供更詳細的回應
  if (req.path.includes('/api/appointments')) {
    return res.status(500).json({
      success: false,
      error: '預約功能暫時無法使用',
      details: err.message,
      timestamp,
      requestId: \`REQ_\${Date.now()}\`,
      suggestion: '請重新整理頁面後再試，或聯繫技術支援'
    });
  }
  
  // 其他錯誤使用原有處理
  res.status(500).json({
    success: false,
    message: err.message,
    timestamp
  });
};

module.exports = { enhancedErrorHandler };
`;
  
  // 寫入增強錯誤處理文件
  const enhancedErrorPath = path.join(__dirname, 'middlewares', 'enhancedErrorHandler.js');
  try {
    fs.writeFileSync(enhancedErrorPath, enhancedErrorMiddleware, 'utf8');
    console.log('✅ 創建增強錯誤處理中間件');
  } catch (error) {
    console.log('❌ 創建增強錯誤處理失敗:', error.message);
    return false;
  }
  
  // 2. 修改app.js以使用增強錯誤處理
  try {
    const appPath = path.join(__dirname, 'app.js');
    let content = fs.readFileSync(appPath, 'utf8');
    
    // 檢查是否已經包含增強錯誤處理
    if (!content.includes('enhancedErrorHandler')) {
      // 在錯誤處理中間件前添加引入
      const errorHandlerImport = content.indexOf("const { notFound, errorHandler } = require('./middlewares/errorHandler');");
      if (errorHandlerImport !== -1) {
        const insertPoint = content.indexOf('\n', errorHandlerImport) + 1;
        const newImport = "const { enhancedErrorHandler } = require('./middlewares/enhancedErrorHandler');\n";
        content = content.slice(0, insertPoint) + newImport + content.slice(insertPoint);
        
        // 替換錯誤處理中間件
        content = content.replace('app.use(errorHandler);', 'app.use(enhancedErrorHandler);');
        
        fs.writeFileSync(appPath, content, 'utf8');
        console.log('✅ app.js已更新為使用增強錯誤處理');
      } else {
        console.log('❌ 找不到錯誤處理引入位置');
        return false;
      }
    } else {
      console.log('✅ app.js已經使用增強錯誤處理');
    }
    
    return true;
  } catch (error) {
    console.log('❌ 修改app.js失敗:', error.message);
    return false;
  }
}

// 執行修復
async function runEmergencyFixV2() {
  console.log('開始緊急修復 v2...\n');
  
  const result = createSimpleFix();
  
  console.log('\n📊 修復結果:');
  console.log('- 增強錯誤處理:', result ? '✅' : '❌');
  
  if (result) {
    console.log('\n✨ 修復完成！現在將重啟服務...');
    restartCurrentService();
    
    console.log('\n📝 使用建議:');
    console.log('1. 等待服務重啟完成（約5-10秒）');
    console.log('2. 清除瀏覽器快取');
    console.log('3. 重新測試預約功能');
    console.log('4. 如果仍有問題，請檢查控制台的 [ENHANCED_ERROR] 日誌');
    
  } else {
    console.log('\n❌ 修復失敗，請手動檢查文件');
  }
}

// 執行修復
if (require.main === module) {
  runEmergencyFixV2()
    .then(() => {
      console.log('\n🎉 緊急修復 v2 完成');
    })
    .catch(error => {
      console.error('\n❌ 緊急修復 v2 失敗:', error.message);
    });
}

module.exports = { runEmergencyFixV2 }; 