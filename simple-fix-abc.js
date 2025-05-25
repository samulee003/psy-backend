const sqlite3 = require('sqlite3').verbose();

const db = new sqlite3.Database('database.sqlite');

console.log('🔧 修復ABC相關預約...');

// 修復用戶ID 12的預約（江之妍 -> 假的）
const patientInfo12 = JSON.stringify({
    "name": "假的",
    "phone": "+85368870476",
    "email": "abcdef2012cn@gmail.com",
    "isActualPatient": true,
    "bookerName": "江之妍",
    "bookerId": 12
});

// 修復用戶ID 15的預約（abc -> 假的）  
const patientInfo15 = JSON.stringify({
    "name": "假的",
    "phone": "+85362998036",
    "email": "abc@gmail.com",
    "isActualPatient": true,
    "bookerName": "abc",
    "bookerId": 15
});

// 更新用戶ID 12的所有預約
db.run('UPDATE appointments SET patient_info = ? WHERE patient_id = 12', [patientInfo12], function(err) {
    if (err) {
        console.error('❌ 修復用戶12失敗:', err.message);
    } else {
        console.log(`✅ 修復用戶12的 ${this.changes} 個預約`);
    }
});

// 更新用戶ID 15的所有預約
db.run('UPDATE appointments SET patient_info = ? WHERE patient_id = 15', [patientInfo15], function(err) {
    if (err) {
        console.error('❌ 修復用戶15失敗:', err.message);
    } else {
        console.log(`✅ 修復用戶15的 ${this.changes} 個預約`);
    }
    
    // 驗證結果
    setTimeout(() => {
        db.all('SELECT id, patient_id, patient_info FROM appointments WHERE patient_id IN (12, 15)', (err, rows) => {
            if (err) {
                console.error('❌ 驗證失敗:', err.message);
            } else {
                console.log('\n📊 驗證結果:');
                rows.forEach(row => {
                    try {
                        const info = JSON.parse(row.patient_info);
                        console.log(`   預約 ${row.id}: patient_id=${row.patient_id}, 就診者姓名=${info.name}`);
                    } catch (e) {
                        console.log(`   預約 ${row.id}: 解析失敗`);
                    }
                });
            }
            db.close();
        });
    }, 1000);
}); 