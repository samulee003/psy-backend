const jwt = require('jsonwebtoken');

// 使用與應用相同的JWT密鑰邏輯
const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret';

// 模擬登入用戶資料（基於之前測試的真實用戶）
const testUser = {
  id: 3,
  name: '李昇恆',
  email: 'samu003@gmail.com',
  role: 'patient'
};

console.log('🔐 生成測試用 JWT Token');
console.log('===========================\n');

console.log('🔑 JWT 密鑰:', JWT_SECRET);
console.log('👤 測試用戶資料:');
console.log(JSON.stringify(testUser, null, 2));

// 生成 JWT token
const token = jwt.sign(testUser, JWT_SECRET, { expiresIn: '24h' });

console.log('\n🎫 生成的 JWT Token:');
console.log(token);

console.log('\n📋 Token 使用方法:');
console.log('在 HTTP 請求中添加以下標頭:');
console.log(`Authorization: Bearer ${token}`);

// 驗證 token 是否有效
try {
  const decoded = jwt.verify(token, JWT_SECRET);
  console.log('\n✅ Token 驗證成功！');
  console.log('解碼後的用戶資料:');
  console.log(JSON.stringify(decoded, null, 2));
} catch (error) {
  console.log('\n❌ Token 驗證失敗:', error.message);
}

console.log('\n💡 將此 token 用於測試 API 請求'); 