/**
 * 伺服器啟動文件
 */
console.log('[SERVER] 程式開始執行...');

// 引入應用程式設定
console.log('[SERVER] 準備載入 app.js...');
const { app, db } = require('./app');
console.log('[SERVER] app.js 已載入');

// 伺服器端口
const port = process.env.PORT || 5000;
console.log(`[SERVER] 伺服器端口設定為: ${port}`);

// 啟動伺服器
console.log('[SERVER] 準備啟動伺服器...');
const server = app.listen(port, () => {
  console.log(`[SERVER] 伺服器已在端口 ${port} 啟動`);
  console.log(`[SERVER] 環境: ${process.env.NODE_ENV || 'development'}`);
  console.log('[SERVER] 資料庫連接狀態 (來自 db.js): 已連接 (此處假設 db.js 中的連接成功)'); // 假設
});
console.log('[SERVER] app.listen 已調用');

// 處理未捕獲的異常
process.on('uncaughtException', (error) => {
  console.error('[SERVER] 未捕獲的異常:', error);
  // 執行必要的清理操作
  closeServerGracefully();
});

// 處理未處理的 Promise 拒絕
process.on('unhandledRejection', (reason, promise) => {
  console.error('[SERVER] 未處理的 Promise 拒絕:', reason);
  // 執行必要的清理操作
  closeServerGracefully();
});

// 處理伺服器關閉
process.on('SIGTERM', () => {
  console.log('[SERVER] 收到 SIGTERM 信號，準備關閉伺服器');
  closeServerGracefully();
});

process.on('SIGINT', () => {
  console.log('[SERVER] 收到 SIGINT 信號，準備關閉伺服器');
  closeServerGracefully();
});

// 優雅關閉伺服器的函數
function closeServerGracefully() {
  console.log('[SERVER] 正在關閉伺服器...');
  server.close(() => {
    console.log('[SERVER] Express 伺服器已關閉');
    
    // 關閉資料庫連接
    if (db) {
      console.log('[SERVER] 準備關閉資料庫連接...');
      db.close((err) => {
        if (err) {
          console.error('[SERVER] 關閉資料庫連接時發生錯誤:', err);
          process.exit(1);
        }
        console.log('[SERVER] 資料庫連接已關閉');
        process.exit(0);
      });
    } else {
      console.log('[SERVER] 資料庫實例不存在，直接退出。');
      process.exit(0);
    }
  });

  // 如果伺服器沒有在 5 秒內關閉，強制退出
  setTimeout(() => {
    console.error('[SERVER] 無法優雅地關閉伺服器，強制退出');
    process.exit(1);
  }, 5000);
}
