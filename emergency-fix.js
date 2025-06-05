/**
 * 緊急修復腳本
 * 用於增強預約API的錯誤處理和日誌記錄
 */

const fs = require('fs');
const path = require('path');

console.log('🚑 緊急修復開始...\n');

// 1. 備份原始檔案
function backupFile(filePath) {
  const backupPath = filePath + '.backup.' + Date.now();
  try {
    fs.copyFileSync(filePath, backupPath);
    console.log(`✅ 已備份: ${filePath} -> ${backupPath}`);
    return true;
  } catch (error) {
    console.log(`❌ 備份失敗: ${filePath}`, error.message);
    return false;
  }
}

// 2. 增強預約API的錯誤處理
function enhanceAppointmentController() {
  const controllerPath = path.join(__dirname, 'controllers', 'appointmentController.js');
  
  if (!backupFile(controllerPath)) {
    console.log('❌ 無法備份appointmentController.js，放棄修復');
    return false;
  }
  
  try {
    let content = fs.readFileSync(controllerPath, 'utf8');
    
    // 檢查是否已經增強過
    if (content.includes('[ENHANCED_ERROR_HANDLING]')) {
      console.log('✅ appointmentController.js已經增強過，跳過');
      return true;
    }
    
    // 在createAppointment函數開始處添加增強的錯誤處理
    const enhancedErrorHandling = `
  // [ENHANCED_ERROR_HANDLING] 緊急修復：增強錯誤處理
  console.log('[EMERGENCY_FIX] 進入createAppointment，時間戳:', new Date().toISOString());
  console.log('[EMERGENCY_FIX] 請求來源:', req.headers.origin || '未知');
  console.log('[EMERGENCY_FIX] User-Agent:', req.headers['user-agent'] || '未知');
  console.log('[EMERGENCY_FIX] Content-Type:', req.headers['content-type'] || '未知');
  
  // 包裝整個函數以捕獲任何異常
  try {`;
    
    // 查找createAppointment函數的開始位置
    const functionStart = content.indexOf('async function createAppointment(req, res) {');
    if (functionStart === -1) {
      console.log('❌ 找不到createAppointment函數');
      return false;
    }
    
    const openBraceIndex = content.indexOf('{', functionStart) + 1;
    
    // 插入增強的錯誤處理
    content = content.slice(0, openBraceIndex) + 
              enhancedErrorHandling + 
              content.slice(openBraceIndex);
    
    // 在函數末尾添加catch塊
    const functionEnd = content.lastIndexOf('};');
    const catchBlock = `
  } catch (emergencyError) {
    console.error('[EMERGENCY_FIX] 捕獲到未處理的錯誤:', {
      message: emergencyError.message,
      stack: emergencyError.stack,
      timestamp: new Date().toISOString(),
      requestBody: JSON.stringify(req.body, null, 2),
      headers: req.headers
    });
    
    return res.status(500).json({
      success: false,
      error: '預約創建時發生內部錯誤',
      details: emergencyError.message,
      timestamp: new Date().toISOString()
    });
  }`;
    
    content = content.slice(0, functionEnd) + catchBlock + content.slice(functionEnd);
    
    // 寫回檔案
    fs.writeFileSync(controllerPath, content, 'utf8');
    console.log('✅ appointmentController.js已增強');
    return true;
    
  } catch (error) {
    console.log('❌ 增強appointmentController.js失敗:', error.message);
    return false;
  }
}

// 3. 增強CORS處理
function enhanceCORS() {
  const appPath = path.join(__dirname, 'app.js');
  
  if (!backupFile(appPath)) {
    console.log('❌ 無法備份app.js，跳過CORS增強');
    return false;
  }
  
  try {
    let content = fs.readFileSync(appPath, 'utf8');
    
    // 檢查是否已經增強過
    if (content.includes('[ENHANCED_CORS]')) {
      console.log('✅ app.js CORS已經增強過，跳過');
      return true;
    }
    
    // 添加更詳細的CORS日誌
    const corsLogging = `
// [ENHANCED_CORS] 緊急修復：增強CORS處理
app.use((req, res, next) => {
  console.log('[CORS_LOG] 請求:', {
    method: req.method,
    path: req.path,
    origin: req.headers.origin,
    userAgent: req.headers['user-agent'],
    contentType: req.headers['content-type'],
    timestamp: new Date().toISOString()
  });
  next();
});

`;
    
    // 在CORS中間件註冊後添加日誌
    const corsIndex = content.indexOf("console.log('[APP] CORS 中間件已註冊');");
    if (corsIndex !== -1) {
      const insertIndex = content.indexOf('\n', corsIndex) + 1;
      content = content.slice(0, insertIndex) + corsLogging + content.slice(insertIndex);
      
      fs.writeFileSync(appPath, content, 'utf8');
      console.log('✅ app.js CORS已增強');
      return true;
    } else {
      console.log('❌ 找不到CORS註冊位置');
      return false;
    }
    
  } catch (error) {
    console.log('❌ 增強app.js失敗:', error.message);
    return false;
  }
}

// 4. 重啟服務建議
function restartService() {
  console.log('\n🔄 修復完成，建議重啟服務：');
  console.log('1. 終止當前Node.js進程');
  console.log('2. 重新啟動：node server.js');
  console.log('3. 清除瀏覽器快取');
  console.log('4. 重新測試預約功能\n');
}

// 執行修復
async function runEmergencyFix() {
  console.log('開始緊急修復...\n');
  
  const results = {
    appointmentController: enhanceAppointmentController(),
    cors: enhanceCORS()
  };
  
  console.log('\n📊 修復結果:');
  console.log('- appointmentController增強:', results.appointmentController ? '✅' : '❌');
  console.log('- CORS增強:', results.cors ? '✅' : '❌');
  
  if (results.appointmentController || results.cors) {
    restartService();
  } else {
    console.log('\n⚠️ 所有修復都已存在或失敗，無需重啟');
  }
}

// 執行修復
if (require.main === module) {
  runEmergencyFix()
    .then(() => {
      console.log('🎉 緊急修復完成');
    })
    .catch(error => {
      console.error('❌ 緊急修復失敗:', error.message);
    });
}

module.exports = { runEmergencyFix }; 