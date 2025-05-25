const axios = require('axios');

console.log('🔍 測試醫生端預約 API 回應\n');

async function testDoctorAppointmentsAPI() {
    try {
        // 1. 用醫生帳號登入
        console.log('1️⃣ 醫生登入...');
        const loginResponse = await axios.post('http://localhost:5000/api/auth/login', {
            email: 'sasha0970@gmail.com',
            password: 'sasha0970'
        });
        
        if (!loginResponse.data.success) {
            console.error('❌ 醫生登入失敗:', loginResponse.data.error);
            return;
        }
        
        const token = loginResponse.data.token;
        console.log('✅ 醫生登入成功');
        
        // 2. 測試醫生端預約API
        console.log('\n2️⃣ 調用醫生端預約 API...');
        const headers = { 'Authorization': `Bearer ${token}` };
        
        const appointmentsResponse = await axios.get('http://localhost:5000/api/appointments', { headers });
        
        if (!appointmentsResponse.data.success) {
            console.error('❌ 獲取預約失敗:', appointmentsResponse.data.error);
            return;
        }
        
        const appointments = appointmentsResponse.data.appointments;
        console.log(`📊 找到 ${appointments.length} 個預約`);
        
        // 3. 分析每個預約的顯示資料
        console.log('\n3️⃣ 分析預約顯示資料:');
        appointments.forEach((app, index) => {
            console.log(`\n${index + 1}. 預約 ID: ${app.id}`);
            console.log(`   📅 日期時間: ${app.date} ${app.time}`);
            console.log(`   📝 狀態: ${app.status}`);
            console.log(`   👤 patientName: ${app.patientName}`);
            console.log(`   🎯 actualPatientName: ${app.actualPatientName}`);
            console.log(`   📞 bookerName: ${app.bookerName}`);
            console.log(`   👨‍⚕️ doctorName: ${app.doctorName}`);
            
            // 特別檢查abc相關預約
            if (app.patientName === 'abc' || app.actualPatientName === 'abc' || app.bookerName === 'abc') {
                console.log(`   🚨 ABC 相關預約發現！`);
                console.log(`      - 前端應該顯示: ${app.actualPatientName}`);
                console.log(`      - 期望值: 假的`);
                console.log(`      - ${app.actualPatientName === '假的' ? '✅ 正確' : '❌ 錯誤'}`);
            }
        });
        
        console.log('\n🎯 醫生端 API 測試完成！');
        
    } catch (error) {
        console.error('❌ 測試過程中發生錯誤:', error.message);
        if (error.response) {
            console.error('   狀態碼:', error.response.status);
            console.error('   錯誤資料:', error.response.data);
        }
    }
}

testDoctorAppointmentsAPI(); 