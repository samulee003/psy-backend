const sqlite3 = require('sqlite3').verbose();
const path = require('path');

console.log('🔧 修復 abc 用戶預約的就診者資訊\n');

// 連接到數據庫
const dbPath = path.join(__dirname, 'database.sqlite');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('❌ 無法連接到數據庫:', err.message);
        process.exit(1);
    }
    console.log('✅ 已連接到數據庫\n');
});

async function fixAbcPatientInfo() {
    console.log('📋 開始修復 abc 用戶的預約資訊...\n');

    // 1. 找到 abc 用戶
    console.log('1️⃣ 查找 abc 用戶...');
    const user = await new Promise((resolve, reject) => {
        db.get("SELECT * FROM users WHERE email = 'abcdef2012cn@gmail.com'", (err, user) => {
            if (err) reject(err);
            else resolve(user);
        });
    });

    if (!user) {
        console.log('❌ 找不到 abc 用戶');
        return;
    }

    console.log(`✅ 找到用戶: ${user.name} (ID: ${user.id})`);

    // 2. 查找該用戶的預約
    console.log('\n2️⃣ 查找用戶的預約...');
    const appointments = await new Promise((resolve, reject) => {
        const query = `
            SELECT a.*, d.name as doctor_name
            FROM appointments a
            JOIN users d ON a.doctor_id = d.id
            WHERE a.patient_id = ? AND (a.patient_info IS NULL OR a.patient_info = '')
        `;
        
        db.all(query, [user.id], (err, appointments) => {
            if (err) reject(err);
            else resolve(appointments);
        });
    });

    console.log(`📊 找到 ${appointments.length} 個需要修復的預約:`);
    
    if (appointments.length === 0) {
        console.log('✅ 沒有需要修復的預約');
        return;
    }

    // 3. 為每個預約添加就診者資訊
    console.log('\n3️⃣ 開始修復預約資訊...');
    
    const patientInfo = {
        name: '假的',  // 根據用戶報告，就診者姓名應該是「假的」
        phone: user.phone || '',
        email: user.email,
        isActualPatient: true,
        bookerName: user.name,
        bookerId: user.id
    };

    const patientInfoJson = JSON.stringify(patientInfo);
    
    for (let i = 0; i < appointments.length; i++) {
        const appointment = appointments[i];
        console.log(`\n   修復預約 ${i + 1}/${appointments.length}:`);
        console.log(`   - 預約 ID: ${appointment.id}`);
        console.log(`   - 醫生: ${appointment.doctor_name}`);
        console.log(`   - 日期時間: ${appointment.date} ${appointment.time}`);
        
        try {
            await new Promise((resolve, reject) => {
                const updateQuery = `
                    UPDATE appointments 
                    SET patient_info = ?, updated_at = datetime('now')
                    WHERE id = ?
                `;
                
                db.run(updateQuery, [patientInfoJson, appointment.id], function(err) {
                    if (err) reject(err);
                    else {
                        console.log(`   ✅ 修復成功 (影響行數: ${this.changes})`);
                        resolve();
                    }
                });
            });
        } catch (error) {
            console.log(`   ❌ 修復失敗: ${error.message}`);
        }
    }

    // 4. 驗證修復結果
    console.log('\n4️⃣ 驗證修復結果...');
    const verifyQuery = `
        SELECT a.*, 
            d.name as doctor_name, 
            p.name as patient_name,
            a.patient_info
        FROM appointments a
        JOIN users d ON a.doctor_id = d.id
        JOIN users p ON a.patient_id = p.id
        WHERE a.patient_id = ?
        ORDER BY a.created_at DESC
    `;
    
    const verifyAppointments = await new Promise((resolve, reject) => {
        db.all(verifyQuery, [user.id], (err, appointments) => {
            if (err) reject(err);
            else resolve(appointments);
        });
    });

    console.log(`📊 驗證結果 - 用戶共有 ${verifyAppointments.length} 個預約:`);
    
    verifyAppointments.forEach((app, index) => {
        console.log(`\n   ${index + 1}. 預約 ID: ${app.id}`);
        console.log(`      醫生: ${app.doctor_name}`);
        console.log(`      日期時間: ${app.date} ${app.time}`);
        
        if (app.patient_info) {
            try {
                const patientInfo = JSON.parse(app.patient_info);
                console.log(`      ✅ 就診者姓名: ${patientInfo.name}`);
                console.log(`      📞 預約人: ${patientInfo.bookerName}`);
            } catch (e) {
                console.log(`      ❌ patient_info 解析失敗: ${app.patient_info}`);
            }
        } else {
            console.log(`      ❌ 仍然沒有 patient_info 資料`);
        }
    });

    console.log('\n🎯 修復完成！');
}

// 執行修復
fixAbcPatientInfo().then(() => {
    db.close((err) => {
        if (err) {
            console.error('❌ 關閉數據庫連接失敗:', err.message);
        } else {
            console.log('\n✅ 數據庫連接已關閉');
        }
    });
}).catch(error => {
    console.error('❌ 修復過程中發生錯誤:', error);
    db.close();
}); 