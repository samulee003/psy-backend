/**
 * 設定管理控制器
 */

// 獲取應用程式設定
const getSettings = (db) => (req, res) => {
  try {
    db.get('SELECT * FROM settings WHERE id = 1', [], (err, settings) => {
      if (err) {
        console.error('查詢設定時發生錯誤:', err.message);
        return res.status(500).json({ error: '無法獲取應用程式設定' });
      }

      if (!settings) {
        console.log('尚未設定應用程式參數，正在創建預設值...');
        const defaultSettingsData = {
          id: 1,
          doctorName: '預設醫生名稱',
          clinicName: '預設診所名稱',
          notificationEmail: 'default@example.com',
          defaultTimeSlots: JSON.stringify(['09:00', '10:00', '11:00', '14:00', '15:00', '16:00'])
        };
        db.run(
          'INSERT INTO settings (id, doctorName, clinicName, notificationEmail, defaultTimeSlots, created_at, updated_at) VALUES (?, ?, ?, ?, ?, datetime("now"), datetime("now"))',
          [
            defaultSettingsData.id,
            defaultSettingsData.doctorName,
            defaultSettingsData.clinicName,
            defaultSettingsData.notificationEmail,
            defaultSettingsData.defaultTimeSlots
          ],
          function (insertErr) {
            if (insertErr) {
              console.error('創建預設設定失敗:', insertErr.message);
              return res.status(500).json({ error: '無法創建預設設定' });
            }
            console.log('預設設定創建成功。');
            // 返回剛創建的設定，確保 defaultTimeSlots 已解析
            try {
              defaultSettingsData.defaultTimeSlots = JSON.parse(defaultSettingsData.defaultTimeSlots);
            } catch (e) { defaultSettingsData.defaultTimeSlots = []; }
            return res.json(defaultSettingsData);
          }
        );
      } else {
        if (settings.defaultTimeSlots) {
          try {
            settings.defaultTimeSlots = JSON.parse(settings.defaultTimeSlots);
          } catch (parseError) {
            console.error('解析 defaultTimeSlots 失敗:', parseError.message);
            settings.defaultTimeSlots = [];
          }
        }
        res.json(settings);
      }
    });
  } catch (error) {
    console.error('獲取設定過程中發生錯誤:', error.message);
    res.status(500).json({ error: '獲取設定失敗，請稍後再試' });
  }
};

// 更新應用程式設定
const updateSettings = (db) => (req, res) => {
  try {
    const { doctorName, clinicName, notificationEmail, defaultTimeSlots } = req.body;

    const fieldsToUpdate = {};
    let hasUpdate = false;

    if (typeof doctorName !== 'undefined') { fieldsToUpdate.doctorName = doctorName; hasUpdate = true; }
    if (typeof clinicName !== 'undefined') { fieldsToUpdate.clinicName = clinicName; hasUpdate = true; }
    if (typeof notificationEmail !== 'undefined') { fieldsToUpdate.notificationEmail = notificationEmail; hasUpdate = true; }
    if (typeof defaultTimeSlots !== 'undefined') {
      fieldsToUpdate.defaultTimeSlots = Array.isArray(defaultTimeSlots) ? JSON.stringify(defaultTimeSlots) : defaultTimeSlots;
      hasUpdate = true;
    }

    if (!hasUpdate) {
      return res.status(400).json({ error: '沒有提供任何有效的設定欄位進行更新' });
    }

    const setClauses = Object.keys(fieldsToUpdate).map(key => `${key} = ?`).join(', ');
    const values = [...Object.values(fieldsToUpdate), 1]; // WHERE id = 1

    const query = `UPDATE settings SET ${setClauses}, updated_at = datetime("now") WHERE id = ?`;

    db.run(query, values, function (err) {
      if (err) {
        console.error('更新設定時發生錯誤:', err.message);
        return res.status(500).json({ error: '無法更新應用程式設定' });
      }

      if (this.changes === 0) {
        // 如果 getSettings 邏輯正確，這裡理論上不應該發生 (因為記錄應該已存在)
        // 但作為防禦，如果真的沒有更新任何行，可能表示 ID=1 的記錄意外丟失
        console.warn('更新設定時影響了 0 行，ID=1 的設定記錄可能不存在。請檢查 getSettings 邏輯。');
        // 可以考慮重新調用 getSettings 來觸發創建，或者直接返回錯誤
        return res.status(404).json({ error: '設定記錄不存在，無法更新。請先嘗試獲取設定以自動創建。' });
      } else {
        // 為了返回更新後的完整設定，再次查詢一次
        db.get('SELECT * FROM settings WHERE id = 1', [], (fetchErr, updatedSettings) => {
          if (fetchErr) {
            console.error('更新後查詢設定失敗:', fetchErr.message);
            return res.status(500).json({ error: '設定已更新，但無法立即獲取更新後的資料' });
          }
          if (updatedSettings && updatedSettings.defaultTimeSlots) {
            try {
              updatedSettings.defaultTimeSlots = JSON.parse(updatedSettings.defaultTimeSlots);
            } catch (e) { updatedSettings.defaultTimeSlots = []; }
          }
          res.json({
            message: '應用程式設定已成功更新',
            settings: updatedSettings
          });
        });
      }
    });
  } catch (error) {
    console.error('更新設定過程中發生錯誤:', error.message);
    res.status(500).json({ error: '更新設定失敗，請稍後再試' });
  }
};

module.exports = {
  getSettings,
  updateSettings,
}; 