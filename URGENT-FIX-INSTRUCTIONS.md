# 🚨 緊急修復指南 - appointments 表欄位缺失問題

## 問題狀況
您的生產環境資料庫缺少 `isNewPatient` 和 `patient_info` 欄位，導致無法創建新預約。

## 已實施的修復

### 1. 自動修復（推薦）
我已經更新了 Zeabur 啟動配置，**下次部署時會自動修復**：

- **新增檔案**: `production-fix-appointments-table.js` - 專門的修復腳本
- **修改配置**: `zeabur.config.json` - 優先執行修復腳本
- **Git commit**: `dafd72f` - 已推送到遠程倉庫

**您只需要**：
1. 在 Zeabur 控制台重新部署
2. 等待部署完成
3. 問題應該自動解決

### 2. 手動修復（如果自動修復失敗）

如果您有 Zeabur SSH 訪問權限，可以手動執行：

```bash
# 連接到 Zeabur 容器
cd /app
node production-fix-appointments-table.js
```

### 3. 臨時解決方案

如果上述方法都不可行，可以在 Zeabur 控制台執行 SQL：

```sql
-- 添加 isNewPatient 欄位
ALTER TABLE appointments ADD COLUMN isNewPatient BOOLEAN DEFAULT FALSE;

-- 添加 patient_info 欄位  
ALTER TABLE appointments ADD COLUMN patient_info TEXT;
```

## 驗證修復

修復後，您應該在部署日誌中看到：

```
🔧 生產環境修復腳本啟動
✅ isNewPatient 欄位添加成功
✅ patient_info 欄位添加成功
🎉 修復完成！appointments 表現在可以正常使用了。
```

## 後續步驟

1. **監控日誌** - 確認修復腳本成功執行
2. **測試預約** - 嘗試創建新預約
3. **回報結果** - 讓我知道是否成功

## 為什麼會發生這個問題？

- Zeabur 的持久化存儲保留了舊的資料庫結構
- 之前的修復腳本可能執行失敗或被跳過
- 新的修復腳本更加穩定可靠

## 聯繫支援

如果問題仍然存在，請提供：
- Zeabur 部署日誌
- 錯誤訊息截圖
- 您嘗試的修復步驟

我會繼續協助您解決問題。 