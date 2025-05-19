/**
 * 錯誤處理中間件
 */

// 捕獲未處理的路由錯誤
const notFound = (req, res, next) => {
  const error = new Error(`找不到路徑 - ${req.originalUrl}`);
  res.status(404);
  next(error);
};

// 統一錯誤處理中間件
const errorHandler = (err, req, res, next) => {
  // 如果狀態碼仍然是 200，則設置為 500
  const statusCode = res.statusCode === 200 ? 500 : res.statusCode;
  
  // 設置狀態碼
  res.status(statusCode);
  
  // 記錄錯誤
  console.error('錯誤處理中間件捕獲到錯誤:', {
    message: err.message,
    stack: process.env.NODE_ENV === 'production' ? '🥞' : err.stack,
    path: req.path,
    method: req.method
  });
  
  // 回傳錯誤信息
  res.json({
    message: err.message,
    stack: process.env.NODE_ENV === 'production' ? '🥞' : err.stack,
  });
};

module.exports = {
  notFound,
  errorHandler
}; 