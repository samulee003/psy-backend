const sqlite3 = require('sqlite3').verbose();

console.log('🔧 統一更新所有預約的就診者姓名資訊\n');

const db = new sqlite3.Database('database.sqlite', (err) => {
    if (err) {
        console.error('❌ 無法連接到數據庫:', err.message);
        process.exit(1);
    }
    console.log('✅ 已連接到數據庫\n');
});

async function updateAllPatientInfo() {
    console.log('📊 分析當前預約狀態...\n');

    // 1. 檢查當前狀態
    await new Promise((resolve) => {
        const query = `
            SELECT 
                COUNT(*) as total_appointments,
                COUNT(CASE WHEN patient_info IS NOT NULL THEN 1 END) as with_info,
                COUNT(CASE WHEN patient_info IS NULL THEN 1 END) as without_info
            FROM appointments
        `;
        
        db.get(query, (err, stats) => {
            if (err) {
                console.error('❌ 統計查詢失敗:', err.message);
                return resolve();
            }
            
            console.log(`📈 預約統計:`);
            console.log(`   總預約數: ${stats.total_appointments}`);
            console.log(`   已有就診者資訊: ${stats.with_info}`);
            console.log(`   缺少就診者資訊: ${stats.without_info}\n`);
            
            resolve();
        });
    });

    // 2. 為缺少patient_info的預約添加資料
    console.log('🔧 為缺少就診者資訊的預約添加資料...\n');
    
    await new Promise((resolve) => {
        const query = `
            SELECT a.id, a.patient_id, u.name, u.email
            FROM appointments a
            JOIN users u ON a.patient_id = u.id
            WHERE a.patient_info IS NULL
            ORDER BY a.id
        `;
        
        db.all(query, (err, appointments) => {
            if (err) {
                console.error('❌ 查詢缺少資訊的預約失敗:', err.message);
                return resolve();
            }
            
            console.log(`📋 找到 ${appointments.length} 個需要更新的預約:`);
            
            if (appointments.length === 0) {
                console.log('   所有預約都已有就診者資訊！');
                return resolve();
            }
            
            let processed = 0;
            
            appointments.forEach((app, index) => {
                console.log(`   ${index + 1}. 預約 ID ${app.id}: ${app.name} → 添加就診者資訊`);
                
                // 為自己預約：就診者姓名 = 患者註冊姓名
                const patientInfo = {
                    "name": app.name,
                    "phone": "", // 暫時留空，可以後續補充
                    "email": app.email,
                    "isActualPatient": true,
                    "bookerName": app.name,
                    "bookerId": app.patient_id
                };
                
                const updateQuery = `
                    UPDATE appointments 
                    SET patient_info = ?, updated_at = datetime('now')
                    WHERE id = ?
                `;
                
                db.run(updateQuery, [JSON.stringify(patientInfo), app.id], function(err) {
                    if (err) {
                        console.error(`   ❌ 更新預約 ${app.id} 失敗:`, err.message);
                    } else {
                        console.log(`   ✅ 更新預約 ${app.id} 成功`);
                    }
                    
                    processed++;
                    if (processed === appointments.length) {
                        resolve();
                    }
                });
            });
        });
    });

    // 3. 驗證更新結果
    console.log('\n🔍 驗證更新結果...\n');
    
    await new Promise((resolve) => {
        const query = `
            SELECT 
                COUNT(*) as total_appointments,
                COUNT(CASE WHEN patient_info IS NOT NULL THEN 1 END) as with_info,
                COUNT(CASE WHEN patient_info IS NULL THEN 1 END) as without_info
            FROM appointments
        `;
        
        db.get(query, (err, stats) => {
            if (err) {
                console.error('❌ 驗證統計查詢失敗:', err.message);
                return resolve();
            }
            
            console.log(`📈 更新後統計:`);
            console.log(`   總預約數: ${stats.total_appointments}`);
            console.log(`   已有就診者資訊: ${stats.with_info} ✅`);
            console.log(`   缺少就診者資訊: ${stats.without_info} ${stats.without_info === 0 ? '✅' : '❌'}`);
            
            if (stats.without_info === 0) {
                console.log('\n🎉 所有預約都已包含完整的就診者資訊！');
            } else {
                console.log('\n⚠️  仍有預約缺少就診者資訊，請檢查。');
            }
            
            resolve();
        });
    });

    // 4. 顯示幾個範例
    console.log('\n📋 顯示更新範例...\n');
    
    await new Promise((resolve) => {
        const query = `
            SELECT a.id, a.patient_id, a.patient_info, u.name as user_name
            FROM appointments a
            JOIN users u ON a.patient_id = u.id
            ORDER BY a.id DESC
            LIMIT 10
        `;
        
        db.all(query, (err, appointments) => {
            if (err) {
                console.error('❌ 範例查詢失敗:', err.message);
                return resolve();
            }
            
            console.log(`📊 最新10個預約的就診者資訊:`);
            
            appointments.forEach((app, index) => {
                if (app.patient_info) {
                    try {
                        const patientInfo = JSON.parse(app.patient_info);
                        const actualName = patientInfo.name || patientInfo.patientName;
                        console.log(`   ${index + 1}. 預約 ${app.id}: 預約人=${app.user_name}, 就診者=${actualName} ${actualName === app.user_name ? '(自己)' : '(代理)'}`);
                    } catch (e) {
                        console.log(`   ${index + 1}. 預約 ${app.id}: 解析失敗`);
                    }
                } else {
                    console.log(`   ${index + 1}. 預約 ${app.id}: 無就診者資訊`);
                }
            });
            
            resolve();
        });
    });

    console.log('\n🎯 更新完成！現在所有預約都會顯示正確的就診者姓名。');
}

// 執行更新
updateAllPatientInfo().then(() => {
    db.close((err) => {
        if (err) {
            console.error('❌ 關閉數據庫連接失敗:', err.message);
        } else {
            console.log('✅ 數據庫連接已關閉');
        }
    });
}).catch(error => {
    console.error('❌ 更新過程中發生錯誤:', error);
    db.close();
}); 