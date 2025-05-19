# Zeabur SQLite 資料庫持久化儲存配置

本文件提供在 Zeabur 平台上配置 SQLite 資料庫持久化儲存的步驟和說明，以確保在部署更新時不會遺失資料庫中的資料。

## 問題背景

在 Zeabur 平台上，默認情況下服務實例是無狀態的（stateless），這意味著在重新部署或重啟服務時，所有數據將恢復到初始狀態。對於使用 SQLite 資料庫的應用程序，這會導致資料庫文件（`database.sqlite`）被重置，從而丟失所有已儲存的用戶數據、預約記錄等信息。

## 解決方案

Zeabur 提供了持久化卷（Volumes）功能，允許將特定目錄持久化儲存，即使在服務重啟或重新部署後，這些數據也不會丟失。

### 步驟 1：在 Zeabur 上創建持久化卷

1. 登入 Zeabur Dashboard
2. 選擇您的專案和服務
3. 點擊「Volumes」標籤
4. 點擊「Mount Volumes」按鈕
5. 設置：
   - **Volume ID**：`data`（或任何易於識別的名稱）
   - **Mount Directory**：`/data`（這是在容器內部的掛載路徑）
6. 點擊「Mount」按鈕確認

### 步驟 2：配置環境變數

在 Zeabur Dashboard 的「Environment Variables」標籤中添加以下環境變數：

- **Key**：`DB_PATH`
- **Value**：`/data/database.sqlite`

### 步驟 3：代碼適配

應用程式已經適配為使用環境變數設定資料庫路徑：

```javascript
// 在 server.js 和 update_schema.js 中
const dbPath = process.env.DB_PATH || path.join(__dirname, 'database.sqlite');
```

### 步驟 4：資料庫備份與還原（首次部署）

首次配置持久化卷後，需要將現有資料庫數據還原到持久化卷中：

1. 在部署前備份當前的 `database.sqlite` 文件
2. 首次部署後，執行以下指令將數據還原到持久化卷：
   ```bash
   # 這需要在應用程式容器內執行，或通過 Zeabur 的終端介面執行
   cp /path/to/backup/database.sqlite /data/database.sqlite
   chmod 644 /data/database.sqlite
   ```

## 注意事項

1. **權限**：確保容器內的應用程式擁有對 `/data` 目錄的讀寫權限
2. **備份策略**：即使使用了持久化卷，仍建議定期備份資料庫文件，以防止意外數據丟失
3. **監控**：定期檢查 Zeabur 的磁盤使用情況，避免存儲空間耗盡

## 驗證持久化配置

部署後，可以通過以下方式驗證持久化配置是否生效：

1. 在應用程式中創建一些測試數據（例如，新用戶或預約）
2. 重新部署應用程式
3. 驗證數據是否仍然存在

如果數據保留，則說明持久化配置成功。如果數據丟失，請檢查持久化卷配置和環境變數設置是否正確。 