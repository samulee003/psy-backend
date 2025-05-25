const axios = require('axios');

console.log('🧪 測試預約創建 API - patientInfo 儲存測試\n');

// 配置
const BASE_URL = 'http://localhost:5000';
const TEST_USER = {
    email: 'abcdef2012cn@gmail.com',
    password: 'abc123'
};

// 測試數據
const TEST_APPOINTMENT = {
    doctorId: 4,
    patientId: 12, // abc 用戶的 ID
    appointmentDate: '2025-07-15',
    timeSlot: '10:00',
    reason: '測試預約 - 檢查就診者姓名儲存',
    patientInfo: {
        name: '假的',
        phone: '12345678',
        email: 'fake@example.com',
        gender: 'male',
        birthDate: '1990-01-01'
    }
};

async function testAppointmentCreation() {
    try {
        console.log('1️⃣ 登入測試用戶...');
        
        // 登入獲取 token
        const loginResponse = await axios.post(`${BASE_URL}/api/auth/login`, {
            email: TEST_USER.email,
            password: TEST_USER.password
        });
        
        if (!loginResponse.data.success) {
            console.error('❌ 登入失敗:', loginResponse.data.error);
            return;
        }
        
        const token = loginResponse.data.token;
        console.log('✅ 登入成功，獲得 token');
        
        // 設置請求頭
        const headers = {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        };
        
        console.log('\n2️⃣ 創建測試預約...');
        console.log('📋 預約數據:', JSON.stringify(TEST_APPOINTMENT, null, 2));
        
        // 創建預約
        const createResponse = await axios.post(`${BASE_URL}/api/appointments`, TEST_APPOINTMENT, { headers });
        
        if (!createResponse.data.success) {
            console.error('❌ 創建預約失敗:', createResponse.data.error);
            return;
        }
        
        const newAppointment = createResponse.data.appointment;
        console.log('✅ 預約創建成功');
        console.log('📊 新預約 ID:', newAppointment.id);
        
        console.log('\n3️⃣ 驗證預約數據儲存...');
        
        // 獲取預約列表驗證
        const appointmentsResponse = await axios.get(`${BASE_URL}/api/appointments/my`, { headers });
        
        if (!appointmentsResponse.data.success) {
            console.error('❌ 獲取預約列表失敗:', appointmentsResponse.data.error);
            return;
        }
        
        const appointments = appointmentsResponse.data.appointments;
        const testAppointment = appointments.find(app => app.id === newAppointment.id);
        
        if (!testAppointment) {
            console.error('❌ 找不到剛創建的預約');
            return;
        }
        
        console.log('📊 API 返回的預約資料:');
        console.log('   - patientName:', testAppointment.patientName);
        console.log('   - actualPatientName:', testAppointment.actualPatientName);
        console.log('   - bookerName:', testAppointment.bookerName);
        console.log('   - doctorName:', testAppointment.doctorName);
        
        // 驗證結果
        console.log('\n4️⃣ 驗證結果:');
        
        if (testAppointment.actualPatientName === '假的') {
            console.log('✅ 成功：actualPatientName 正確顯示就診者姓名「假的」');
        } else {
            console.log(`❌ 失敗：actualPatientName 顯示「${testAppointment.actualPatientName}」而不是「假的」`);
        }
        
        if (testAppointment.bookerName === '江之妍') {
            console.log('✅ 成功：bookerName 正確顯示預約人姓名「江之妍」');
        } else {
            console.log(`❌ 失敗：bookerName 顯示「${testAppointment.bookerName}」而不是「江之妍」`);
        }
        
        console.log('\n🎯 測試完成！');
        
        // 清理：刪除測試預約
        console.log('\n5️⃣ 清理測試數據...');
        try {
            await axios.patch(`${BASE_URL}/api/appointments/${newAppointment.id}`, {
                status: 'cancelled'
            }, { headers });
            console.log('✅ 測試預約已取消');
        } catch (error) {
            console.log('⚠️  清理測試數據失敗，請手動刪除預約 ID:', newAppointment.id);
        }
        
    } catch (error) {
        console.error('❌ 測試過程中發生錯誤:', error.message);
        if (error.response) {
            console.error('   回應狀態:', error.response.status);
            console.error('   回應數據:', error.response.data);
        }
    }
}

// 執行測試
testAppointmentCreation(); 