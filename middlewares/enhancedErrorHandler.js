
/**
 * 增強的錯誤處理中間件
 * 專門用於捕獲預約API的詳細錯誤
 */

const enhancedErrorHandler = (err, req, res, next) => {
  const timestamp = new Date().toISOString();
  
  // 使用現有的狀態碼，如果未設置或為 200，則默認為 500
  const statusCode = res.statusCode === 200 ? 500 : res.statusCode;

  // 針對 500 錯誤記錄詳細日誌
  if (statusCode === 500) {
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
  } else {
    // 針對非 500 錯誤（如 404）使用簡化日誌
    console.warn(`[WARN] ${statusCode} ${err.message} - ${req.method} ${req.path}`);
  }
  
  // 如果是預約API錯誤且為系統錯誤 (500)，提供更詳細的回應
  if (req.path.includes('/api/appointments') && statusCode === 500) {
    return res.status(500).json({
      success: false,
      error: '預約功能暫時無法使用',
      details: err.message,
      timestamp,
      requestId: `REQ_${Date.now()}`,
      suggestion: '請重新整理頁面後再試，或聯繫技術支援'
    });
  }
  
  // 其他錯誤使用原有處理，但使用正確的狀態碼
  res.status(statusCode).json({
    success: false,
    message: err.message,
    timestamp
  });
};

module.exports = { enhancedErrorHandler };
