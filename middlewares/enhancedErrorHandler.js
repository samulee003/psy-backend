
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
      requestId: `REQ_${Date.now()}`,
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
