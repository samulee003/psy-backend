const axios = require('axios');

async function quickTest() {
    try {
        // 嘗試abc用戶登入
        console.log('🔍 測試abc用戶登入...');
        const loginResponse = await axios.post('http://localhost:5000/api/auth/login', {
            email: 'abc@gmail.com',
            password: 'abc123'
        });
        
        if (!loginResponse.data.success) {
            console.log('❌ abc用戶登入失敗，嘗試其他方式...');
            
            // 嘗試江之妍登入
            const loginResponse2 = await axios.post('http://localhost:5000/api/auth/login', {
                email: 'abcdef2012cn@gmail.com',
                password: 'abc123'
            });
            
            if (!loginResponse2.data.success) {
                console.log('❌ 江之妍用戶也登入失敗');
                return;
            }
            
            const token = loginResponse2.data.token;
            console.log('✅ 江之妍用戶登入成功');
            
            // 獲取我的預約
            const myAppointments = await axios.get('http://localhost:5000/api/appointments/my', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            console.log('\n📊 江之妍的預約:');
            if (myAppointments.data.appointments) {
                myAppointments.data.appointments.forEach(app => {
                    console.log(`   預約 ${app.id}: actualPatientName="${app.actualPatientName}", bookerName="${app.bookerName}"`);
                });
            }
        } else {
            const token = loginResponse.data.token;
            console.log('✅ abc用戶登入成功');
            
            // 獲取我的預約
            const myAppointments = await axios.get('http://localhost:5000/api/appointments/my', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            console.log('\n📊 abc用戶的預約:');
            if (myAppointments.data.appointments) {
                myAppointments.data.appointments.forEach(app => {
                    console.log(`   預約 ${app.id}: actualPatientName="${app.actualPatientName}", bookerName="${app.bookerName}"`);
                });
            }
        }
        
    } catch (error) {
        console.error('❌ 測試失敗:', error.message);
    }
}

quickTest(); 