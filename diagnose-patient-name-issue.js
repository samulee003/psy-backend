const sqlite3 = require('sqlite3').verbose();
const path = require('path');

console.log('🔍 診斷預約數據處理問題 - 只讀分析\n');

// 連接到數據庫
const dbPath = path.join(__dirname, 'database.sqlite');
const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READONLY, (err) => {
    if (err) {
        console.error('❌ 無法連接到數據庫:', err.message);
        process.exit(1);
    }
    console.log('✅ 已連接到數據庫（只讀模式）\n');
});

// 診斷步驟
async function diagnoseIssue() {
    console.log('📋 開始診斷預約數據處理問題...\n');

    // 1. 檢查數據庫結構
    console.log('1️⃣ 檢查 appointments 表結構:');
    await new Promise((resolve) => {
        db.all("PRAGMA table_info(appointments)", (err, columns) => {
            if (err) {
                console.error('❌ 查詢表結構失敗:', err.message);
                return resolve();
            }
            
            console.log('   📊 appointments 表欄位:');
            columns.forEach(col => {
                console.log(`      - ${col.name} (${col.type})`);
            });
            
            // 檢查是否有 patient_info 欄位
            const hasPatientInfo = columns.some(col => col.name === 'patient_info');
            console.log(`   ${hasPatientInfo ? '✅' : '❌'} patient_info 欄位: ${hasPatientInfo ? '存在' : '不存在'}`);
            console.log();
            resolve();
        });
    });

    // 2. 檢查現有預約數據
    console.log('2️⃣ 檢查現有預約數據:');
    await new Promise((resolve) => {
        const query = `
            SELECT a.id, a.doctor_id, a.patient_id, a.date, a.time, 
                   a.patient_info, a.notes, a.status,
                   d.name as doctor_name, 
                   p.name as patient_name
            FROM appointments a
            JOIN users d ON a.doctor_id = d.id
            JOIN users p ON a.patient_id = p.id
            ORDER BY a.created_at DESC
            LIMIT 10
        `;
        
        db.all(query, (err, appointments) => {
            if (err) {
                console.error('❌ 查詢預約數據失敗:', err.message);
                return resolve();
            }
            
            console.log(`   📊 找到 ${appointments.length} 個預約記錄:`);
            
            appointments.forEach((app, index) => {
                console.log(`\n   ${index + 1}. 預約 ID: ${app.id}`);
                console.log(`      👨‍⚕️ 醫生: ${app.doctor_name} (ID: ${app.doctor_id})`);
                console.log(`      👤 預約人: ${app.patient_name} (ID: ${app.patient_id})`);
                console.log(`      📅 日期時間: ${app.date} ${app.time}`);
                console.log(`      📝 狀態: ${app.status}`);
                
                // 分析 patient_info 欄位
                if (app.patient_info) {
                    try {
                        const patientInfo = JSON.parse(app.patient_info);
                        console.log(`      🏥 就診者資訊: ${JSON.stringify(patientInfo)}`);
                        
                        if (patientInfo.patientName) {
                            console.log(`      ✅ 就診者姓名: ${patientInfo.patientName}`);
                        } else if (patientInfo.name) {
                            console.log(`      ✅ 就診者姓名 (name): ${patientInfo.name}`);
                        } else {
                            console.log(`      ❌ 未找到就診者姓名`);
                        }
                    } catch (e) {
                        console.log(`      ❌ patient_info 解析失敗: ${app.patient_info}`);
                    }
                } else {
                    console.log(`      ❌ 無 patient_info 資料`);
                }
            });
            
            console.log();
            resolve();
        });
    });

    // 3. 檢查 abc 用戶的預約
    console.log('3️⃣ 檢查 abc 用戶的預約:');
    await new Promise((resolve) => {
        // 先找到 abc 用戶
        db.get("SELECT * FROM users WHERE name = 'abc' OR email LIKE '%abc%'", (err, user) => {
            if (err) {
                console.error('❌ 查詢 abc 用戶失敗:', err.message);
                return resolve();
            }
            
            if (!user) {
                console.log('   ❌ 未找到 abc 用戶');
                return resolve();
            }
            
            console.log(`   👤 找到 abc 用戶: ID ${user.id}, 姓名: ${user.name}, 郵箱: ${user.email}`);
            
            // 查詢 abc 用戶的預約
            const query = `
                SELECT a.*, d.name as doctor_name
                FROM appointments a
                JOIN users d ON a.doctor_id = d.id
                WHERE a.patient_id = ?
                ORDER BY a.created_at DESC
            `;
            
            db.all(query, [user.id], (err, appointments) => {
                if (err) {
                    console.error('❌ 查詢 abc 用戶預約失敗:', err.message);
                    return resolve();
                }
                
                console.log(`   📊 abc 用戶有 ${appointments.length} 個預約:`);
                
                appointments.forEach((app, index) => {
                    console.log(`\n   ${index + 1}. 預約 ID: ${app.id}`);
                    console.log(`      👨‍⚕️ 醫生: ${app.doctor_name}`);
                    console.log(`      📅 日期時間: ${app.date} ${app.time}`);
                    
                    if (app.patient_info) {
                        try {
                            const patientInfo = JSON.parse(app.patient_info);
                            console.log(`      🏥 就診者資訊: ${JSON.stringify(patientInfo)}`);
                            
                            // 檢查是否有就診者姓名「假的」
                            const actualName = patientInfo.patientName || patientInfo.name;
                            if (actualName) {
                                console.log(`      ${actualName === '假的' ? '✅' : '❌'} 就診者姓名: ${actualName}`);
                            } else {
                                console.log(`      ❌ 未找到就診者姓名`);
                            }
                        } catch (e) {
                            console.log(`      ❌ patient_info 解析失敗: ${app.patient_info}`);
                        }
                    } else {
                        console.log(`      ❌ 無 patient_info 資料`);
                    }
                });
                
                console.log();
                resolve();
            });
        });
    });

    // 4. 模擬 API 回應
    console.log('4️⃣ 模擬 getAppointments API 回應:');
    await new Promise((resolve) => {
        const query = `
            SELECT a.*, 
                d.name as doctor_name, 
                p.name as patient_name,
                a.patient_info
            FROM appointments a
            JOIN users d ON a.doctor_id = d.id
            JOIN users p ON a.patient_id = p.id
            WHERE p.name = 'abc'
            ORDER BY a.date DESC, a.time ASC
        `;
        
        db.all(query, (err, appointments) => {
            if (err) {
                console.error('❌ 模擬 API 查詢失敗:', err.message);
                return resolve();
            }
            
            console.log(`   📊 模擬 API 返回 ${appointments.length} 個 abc 用戶的預約:`);
            
            const processedAppointments = appointments.map(app => {
                const { patient_name, doctor_name, patient_info, ...rest } = app;
                
                // 模擬當前的處理邏輯
                let displayPatientName = patient_name; // 預設使用預約人姓名
                
                if (patient_info) {
                    try {
                        const patientInfoObj = JSON.parse(patient_info);
                        if (patientInfoObj.patientName) {
                            displayPatientName = patientInfoObj.patientName; // 優先使用就診者姓名
                        }
                    } catch (e) {
                        console.warn('解析 patient_info 失敗:', e.message);
                    }
                }
                
                return {
                    id: rest.id,
                    patientName: displayPatientName,
                    doctorName: doctor_name,
                    actualPatientName: displayPatientName, // 新增欄位，明確表示就診者姓名
                    bookerName: patient_name // 新增欄位，表示預約人姓名
                };
            });
            
            processedAppointments.forEach((app, index) => {
                console.log(`\n   ${index + 1}. 預約 ID: ${app.id}`);
                console.log(`      patientName: ${app.patientName}`);
                console.log(`      actualPatientName: ${app.actualPatientName}`);
                console.log(`      bookerName: ${app.bookerName}`);
                console.log(`      doctorName: ${app.doctorName}`);
                
                // 診斷問題
                if (app.actualPatientName === 'abc') {
                    console.log(`      ❌ 問題確認：actualPatientName 顯示預約人姓名而非就診者姓名`);
                } else if (app.actualPatientName === '假的') {
                    console.log(`      ✅ 正常：actualPatientName 正確顯示就診者姓名`);
                } else {
                    console.log(`      ⚠️  未知狀態：actualPatientName = ${app.actualPatientName}`);
                }
            });
            
            console.log();
            resolve();
        });
    });

    console.log('🎯 診斷完成！');
}

// 執行診斷
diagnoseIssue().then(() => {
    db.close((err) => {
        if (err) {
            console.error('❌ 關閉數據庫連接失敗:', err.message);
        } else {
            console.log('✅ 數據庫連接已關閉');
        }
    });
}).catch(error => {
    console.error('❌ 診斷過程中發生錯誤:', error);
    db.close();
}); 