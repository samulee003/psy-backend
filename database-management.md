# SQLite 資料庫管理指南

本文件提供關於如何備份和還原 SQLite 資料庫的詳細說明，適用於開發環境和 Zeabur 部署環境。

## 1. 資料庫備份操作

### 本地開發環境

在本地開發環境中進行資料庫備份：

```bash
# 在 backend-deploy 目錄下運行
npm run db:backup
```

這將在 `backend-deploy/backups/` 目錄中創建一個帶有時間戳的備份檔案，例如 `database-backup-2025-05-20T10-30-00-000Z.sqlite`。

### Zeabur 部署環境

在 Zeabur 部署環境中進行資料庫備份：

1. 登入 Zeabur 控制台
2. 進入你的項目和服務
3. 點擊「Terminal」標籤，打開終端
4. 運行以下命令：

```bash
cd /app
npm run db:backup
```

這將在 `/app/backups/` 目錄中創建備份檔案。

## 2. 資料庫還原操作

### 本地開發環境

在本地開發環境中還原資料庫：

```bash
# 在 backend-deploy 目錄下運行
# 將 FILENAME 替換為實際的備份檔案名稱
npm run db:restore FILENAME
```

例如：

```bash
npm run db:restore database-backup-2025-05-20T10-30-00-000Z.sqlite
```

### Zeabur 部署環境

在 Zeabur 部署環境中還原資料庫：

1. 登入 Zeabur 控制台
2. 進入你的項目和服務
3. 點擊「Terminal」標籤，打開終端
4. 運行以下命令：

```bash
cd /app
# 列出所有可用的備份
ls backups
# 選擇一個備份文件進行還原
npm run db:restore FILENAME
```

## 3. 下載備份至本地 (從 Zeabur)

如需將 Zeabur 環境中的備份檔案下載到本地：

1. 登入 Zeabur 控制台
2. 進入你的項目和服務
3. 點擊「Volumes」標籤
4. 找到資料目錄 (通常是 `data`)
5. 使用 Zeabur 提供的下載功能 (如果支援)，或運行以下命令在終端中查看檔案內容：

```bash
ls -la /app/backups
cat /app/backups/[檔案名]
```

## 4. 上傳備份至 Zeabur

如果需要將本地的備份檔案上傳到 Zeabur：

1. 登入 Zeabur 控制台
2. 進入你的項目和服務
3. 點擊「Volumes」標籤
4. 找到資料目錄 (通常是 `data`)
5. 使用 Zeabur 提供的上傳功能 (如果支援)

## 5. 自動備份建議

建議定期執行資料庫備份，可以考慮：

1. 設置 Zeabur 的定時任務 (如果支援)，定期執行 `npm run db:backup`
2. 使用外部服務 (如 curl 或其他 API 工具) 定期觸發備份
3. 考慮使用第三方備份服務

## 6. 最佳實踐

- 在每次後端更新部署前先進行備份
- 定期檢查備份檔案是否可用
- 保留多個時間點的備份
- 定期清理舊備份，避免存儲空間不足
- 考慮將重要備份存儲在外部安全位置

## 7. 故障排除

如果在備份或還原過程中遇到問題：

1. 檢查權限問題：確保有寫入 `backups/` 目錄的權限
2. 檢查磁盤空間：確保有足夠的存儲空間
3. 檢查檔案路徑：確保環境變數 `DB_PATH` 設置正確
4. 檢查日誌輸出：備份和還原腳本會輸出詳細日誌，有助於診斷問題

如需進一步協助，請參考 `db-backup.js` 和 `db-restore.js` 腳本的原始碼。 