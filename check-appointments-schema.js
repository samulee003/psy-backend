const sqlite3 = require('sqlite3').verbose();

console.log('=== 檢查 appointments 表結構 ===\n');

const db = new sqlite3.Database('database.sqlite', (err) => {
  if (err) {
    console.error('連接資料庫失敗:', err.message);
    return;
  }
  console.log('✅ 成功連接到資料庫');
});

// 檢查 appointments 表結構
db.all("PRAGMA table_info(appointments)", [], (err, columns) => {
  if (err) {
    console.error('查詢表結構失敗:', err.message);
    return;
  }
  
  console.log('📋 appointments 表結構:');
  console.log('─'.repeat(80));
  console.log('| cid | name           | type    | notnull | dflt_value | pk |');
  console.log('─'.repeat(80));
  
  columns.forEach(col => {
    const cid = col.cid.toString().padEnd(3);
    const name = col.name.padEnd(15);
    const type = col.type.padEnd(8);
    const notnull = col.notnull.toString().padEnd(7);
    const dflt = (col.dflt_value || '').toString().padEnd(10);
    const pk = col.pk.toString().padEnd(2);
    
    console.log(`| ${cid} | ${name} | ${type} | ${notnull} | ${dflt} | ${pk} |`);
  });
  console.log('─'.repeat(80));
  
  // 檢查是否有 isNewPatient 欄位
  const hasIsNewPatient = columns.some(col => col.name === 'isNewPatient');
  
  if (hasIsNewPatient) {
    console.log('\n✅ 找到 isNewPatient 欄位');
    const isNewPatientCol = columns.find(col => col.name === 'isNewPatient');
    console.log(`   類型: ${isNewPatientCol.type}`);
    console.log(`   是否必填: ${isNewPatientCol.notnull ? '是' : '否'}`);
    console.log(`   預設值: ${isNewPatientCol.dflt_value || '無'}`);
  } else {
    console.log('\n❌ 未找到 isNewPatient 欄位');
    console.log('   建議添加此欄位以支援初診/非初診區分');
  }
  
  // 查看現有預約資料樣本
  console.log('\n📊 查看現有預約資料樣本:');
  db.all("SELECT * FROM appointments LIMIT 3", [], (err, appointments) => {
    if (err) {
      console.error('查詢預約資料失敗:', err.message);
    } else {
      console.log(`找到 ${appointments.length} 筆預約記錄樣本:`);
      appointments.forEach((apt, index) => {
        console.log(`\n[${index + 1}] 預約 ID: ${apt.id}`);
        console.log(`    醫生 ID: ${apt.doctor_id}`);
        console.log(`    患者 ID: ${apt.patient_id}`);
        console.log(`    日期: ${apt.date}`);
        console.log(`    時間: ${apt.time}`);
        console.log(`    狀態: ${apt.status}`);
        console.log(`    備註: ${apt.notes || '無'}`);
        console.log(`    患者資訊: ${apt.patient_info || '無'}`);
        if (apt.isNewPatient !== undefined) {
          console.log(`    是否初診: ${apt.isNewPatient}`);
        }
      });
    }
    
    db.close((err) => {
      if (err) {
        console.error('關閉資料庫失敗:', err.message);
      } else {
        console.log('\n✅ 資料庫已關閉');
      }
    });
  });
}); 