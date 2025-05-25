/**
 * 測試環境變數載入
 */

// 載入環境變數
require('dotenv').config();

console.log('=== 環境變數測試 ===');
console.log('GOOGLE_CLIENT_ID:', process.env.GOOGLE_CLIENT_ID);
console.log('GOOGLE_CLIENT_SECRET:', process.env.GOOGLE_CLIENT_SECRET ? '***已設置***' : '未設置');
console.log('JWT_SECRET:', process.env.JWT_SECRET ? '***已設置***' : '未設置');

// 測試 Google Auth 中間件的配置檢查
console.log('\n=== Google Auth 配置檢查 ===');
const clientId = process.env.GOOGLE_CLIENT_ID;
const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

console.log('Client ID 存在:', !!clientId);
console.log('Client Secret 存在:', !!clientSecret);
console.log('配置完整:', !!(clientId && clientSecret));

if (clientId && clientSecret) {
  console.log('✅ Google OAuth 配置完整');
} else {
  console.log('❌ Google OAuth 配置不完整');
  console.log('  - Client ID:', clientId ? '已設置' : '未設置');
  console.log('  - Client Secret:', clientSecret ? '已設置' : '未設置');
} 