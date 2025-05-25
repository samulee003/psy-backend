const sqlite3 = require('sqlite3').verbose();

console.log('🔧 修復預約 54 的就診者資訊\n');

const db = new sqlite3.Database('database.sqlite', (err) => {
    if (err) {
        console.error('❌ 無法連接到數據庫:', err.message);
        process.exit(1);
    }
    console.log('✅ 已連接到數據庫\n');
});

const patientInfo = {
    name: '假的',
    phone: '+85362998036',
    email: 'abc@gmail.com',
    isActualPatient: true,
    bookerName: 'abc',
    bookerId: 15
};

const patientInfoJson = JSON.stringify(patientInfo);

console.log('📋 準備修復預約 54...');
console.log('🏥 就診者資訊:', patientInfo);

db.run(
    'UPDATE appointments SET patient_info = ?, updated_at = datetime("now") WHERE id = 54',
    [patientInfoJson],
    function(err) {
        if (err) {
            console.error('❌ 修復失敗:', err.message);
        } else {
            console.log(`✅ 修復成功！影響行數: ${this.changes}`);
        }
        
        // 驗證修復結果
        db.get('SELECT patient_info FROM appointments WHERE id = 54', (err, result) => {
            if (err) {
                console.error('❌ 驗證失敗:', err.message);
            } else if (result && result.patient_info) {
                try {
                    const info = JSON.parse(result.patient_info);
                    console.log('🎯 驗證成功！就診者姓名:', info.name);
                } catch (e) {
                    console.error('❌ 解析失敗:', e.message);
                }
            } else {
                console.log('❌ 沒有找到 patient_info');
            }
            
            db.close();
        });
    }
); 