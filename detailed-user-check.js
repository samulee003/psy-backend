const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// 連接資料庫
const dbPath = path.join(__dirname, 'database.sqlite');
const db = new sqlite3.Database(dbPath);

console.log('=== 詳細用戶數據檢查 ===\n');

// 查詢所有用戶的詳細資訊
const query = `
  SELECT id, username, email, name, role, phone, 
         created_at, updated_at
  FROM users 
  ORDER BY created_at ASC
`;

db.all(query, [], (err, users) => {
  if (err) {
    console.error('查詢失敗:', err.message);
    return;
  }
  
  console.log(`總用戶數: ${users.length}\n`);
  
  // 按角色分組
  const doctors = users.filter(u => u.role === 'doctor');
  const patients = users.filter(u => u.role === 'patient');
  const admins = users.filter(u => u.role === 'admin');
  
  console.log(`醫生: ${doctors.length} 人`);
  console.log(`患者: ${patients.length} 人`);
  console.log(`管理員: ${admins.length} 人\n`);
  
  console.log('=== 所有用戶詳細信息（按創建時間排序）===\n');
  
  users.forEach((user, index) => {
    console.log(`用戶 ${index + 1}:`);
    console.log(`  ID: ${user.id}`);
    console.log(`  用戶名: ${user.username || '未設置'}`);
    console.log(`  郵箱: ${user.email}`);
    console.log(`  姓名: ${user.name}`);
    console.log(`  角色: ${user.role}`);
    console.log(`  電話: ${user.phone || '未設置'}`);
    console.log(`  創建時間: ${user.created_at}`);
    console.log(`  更新時間: ${user.updated_at}`);
    
    // 分析創建時間
    const createDate = new Date(user.created_at);
    const now = new Date();
    const daysDiff = Math.floor((now - createDate) / (1000 * 60 * 60 * 24));
    
    if (daysDiff === 0) {
      console.log(`  📅 今天創建`);
    } else if (daysDiff === 1) {
      console.log(`  📅 昨天創建`);
    } else if (daysDiff <= 7) {
      console.log(`  📅 ${daysDiff} 天前創建`);
    } else {
      console.log(`  📅 ${daysDiff} 天前創建`);
    }
    
    console.log('  ---\n');
  });
  
  // 特別檢查是否有今天創建的用戶
  const today = new Date().toISOString().split('T')[0];
  const todayUsers = users.filter(u => u.created_at.startsWith(today) || u.created_at.startsWith('2025-05-24'));
  
  if (todayUsers.length > 0) {
    console.log('🔍 今天創建的用戶:');
    todayUsers.forEach(u => {
      console.log(`  - ${u.name} (${u.email}) - ${u.role} - ${u.created_at}`);
    });
  } else {
    console.log('⚠️  沒有發現今天創建的新用戶');
  }
  
  // 檢查 sasha0970@gmail.com
  const sashaUser = users.find(u => u.email === 'sasha0970@gmail.com');
  if (sashaUser) {
    console.log('\n✅ 找到 sasha0970@gmail.com 用戶:');
    console.log(`  - ID: ${sashaUser.id}`);
    console.log(`  - 姓名: ${sashaUser.name}`);
    console.log(`  - 角色: ${sashaUser.role}`);
    console.log(`  - 創建時間: ${sashaUser.created_at}`);
    
    const createDate = new Date(sashaUser.created_at);
    const now = new Date();
    const minutesDiff = Math.floor((now - createDate) / (1000 * 60));
    
    if (minutesDiff < 60) {
      console.log(`  ⚠️  這個帳號是 ${minutesDiff} 分鐘前剛創建的！`);
    } else {
      const hoursDiff = Math.floor(minutesDiff / 60);
      console.log(`  📅 這個帳號是 ${hoursDiff} 小時前創建的`);
    }
  } else {
    console.log('\n❌ 沒有找到 sasha0970@gmail.com 用戶');
  }
  
  db.close();
});
 