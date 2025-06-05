const http = require('http');

console.log('🧪 測試預約創建 API');
console.log('======================\n');

// 測試數據 - 使用從前面測試中獲得的真實用戶ID
const testData = {
  doctorId: '4',
  patientId: '3',
  appointmentDate: '2025-08-15',
  timeSlot: '15:00',
  reason: '測試API預約',
  notes: '通過API測試創建的預約',
  isNewPatient: true,
  patientInfo: {
    name: '假的',
    phone: '62998036',
    email: 'samu003@gmail.com',
    gender: '',
    birthDate: ''
  },
  timezone: 'Asia/Hong_Kong'
};

// 創建HTTP請求
const requestData = JSON.stringify(testData);

const options = {
  hostname: 'localhost',
  port: 5000,
  path: '/api/appointments',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(requestData),
    // 使用有效的JWT token
    'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MywibmFtZSI6IuadjuaYh-aBhiIsImVtYWlsIjoic2FtdTAwM0BnbWFpbC5jb20iLCJyb2xlIjoicGF0aWVudCIsImlhdCI6MTc0OTEyODQ5MywiZXhwIjoxNzQ5MjE0ODkzfQ.ssxp130B82nsJJdTgfiUQMpQDKVR6H0wBJ7C1JSHFWs'
  }
};

console.log('🚀 發送請求到:', `http://${options.hostname}:${options.port}${options.path}`);
console.log('📝 請求數據:');
console.log(JSON.stringify(testData, null, 2));
console.log('\n⏳ 等待回應...\n');

const req = http.request(options, (res) => {
  console.log(`📊 狀態碼: ${res.statusCode}`);
  console.log(`📋 回應標頭:`, res.headers);
  
  let data = '';
  
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    console.log('\n📥 回應內容:');
    try {
      const response = JSON.parse(data);
      console.log(JSON.stringify(response, null, 2));
      
      if (res.statusCode === 201 && response.success) {
        console.log('\n✅ 預約創建成功!');
        console.log(`   預約ID: ${response.appointment.id}`);
      } else {
        console.log('\n❌ 預約創建失敗');
        if (response.error) {
          console.log(`   錯誤信息: ${response.error}`);
        }
      }
    } catch (e) {
      console.log('原始回應:', data);
      console.log('JSON 解析失敗:', e.message);
    }
  });
});

req.on('error', (error) => {
  console.error('❌ 請求錯誤:', error.message);
  console.log('\n💡 可能的原因:');
  console.log('   1. 伺服器未啟動（請先運行 node server.js）');
  console.log('   2. 端口被占用');
  console.log('   3. 網絡連接問題');
});

req.write(requestData);
req.end();

// 設置超時
setTimeout(() => {
  console.log('\n⏰ 請求超時，請檢查伺服器是否正常運行');
  process.exit(1);
}, 10000); 