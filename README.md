# 心理治療預約系統 - 後端

這是一個用於心理治療預約管理的後端 API 服務。

## 主要功能

- 用戶管理：註冊、登入、權限控制
- 醫生排班管理
- 患者預約掛號
- 預約查詢與管理

## 最近改進

### 2023-06-20: 增強資料庫關聯完整性

- 改進用戶刪除功能，防止刪除有關聯數據的用戶造成資料不一致
- 添加了級聯刪除功能，允許在確認後一次性刪除用戶及其關聯數據
- 保護最後一個管理員帳戶不被意外刪除
- 使用資料庫事務確保級聯操作的原子性，提高數據一致性

### 2023-06-15: 系統安全性和數據驗證增強

- 添加了嚴格的日期和時間驗證
- 禁止預約過去的時間
- 禁止為過去的日期創建或更新排班
- 增強了排班時間段的驗證邏輯
- 增加了患者資料的驗證
- 統一了時間處理邏輯，提高了系統的一致性

### 2023-06-12: 修復用戶註冊問題

- 修復了同一帳戶可以多次註冊的問題
- 同時檢查 email 和 username 避免重複註冊

### 2023-06-11: 修復跨裝置登入問題

- 修復了醫生無法從新裝置或無痕模式登入後查看排班的問題
- 優化了 Cookie 設置，支援跨域訪問
- 添加了 token 在回應中的返回，支援前端 localStorage 存儲

## 電子郵件通知功能

系統現在支援透過電子郵件發送以下通知：

1. **預約創建通知** - 當新預約被創建時：
   - 發送通知給治療師，包含患者資訊和預約詳情
   - 發送確認郵件給患者，包含預約詳情

2. **預約狀態變更通知** - 當預約狀態變更時（確認、取消、完成等）：
   - 通知治療師狀態變更
   - 通知患者狀態變更

### 設定郵件服務

要啟用郵件通知功能，請在 `.env` 文件中設定以下環境變數：

```
# 電子郵件服務配置
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
EMAIL_FROM="心理治療預約系統 <noreply@your-domain.com>"
```

若未設定這些環境變數，系統將記錄模擬發送訊息，但不會實際發送郵件。

### 使用 Gmail 發送郵件

如果使用 Gmail 作為郵件提供商，請按照以下步驟設定：

1. 確保您的 Gmail 帳戶已啟用二步驗證
2. 生成應用程式專用密碼：Google 帳戶 > 安全性 > 應用程式密碼
3. 使用此應用程式密碼作為 `EMAIL_PASS` 環境變數

## 技術堆疊

- Node.js
- Express.js
- SQLite 數據庫
- JSON Web Token (JWT) 身份驗證
- bcrypt 密碼加密

## 前端整合說明

### 登入流程

當用戶成功登入後，後端會:

1. 設置一個 HTTP-only Cookie 包含 JWT token
2. 在響應中返回 token 字段，前端應將其存儲在 localStorage 中

前端需要:
```javascript
// 登入請求
async function login(email, password) {
  const response = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include', // 必須，用於接收和發送 cookies
    body: JSON.stringify({ email, password })
  });
  
  const data = await response.json();
  
  if (response.ok) {
    // 存儲 token 到 localStorage 作為後備
    localStorage.setItem('auth_token', data.token);
    return data.user;
  } else {
    throw new Error(data.error || '登入失敗');
  }
}

// API 請求工具函數
async function apiRequest(url, options = {}) {
  // 設置默認 headers
  const headers = options.headers || {};
  
  // 嘗試從 localStorage 獲取 token 並添加到 Authorization header
  const token = localStorage.getItem('auth_token');
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  // 確保 credentials 被設置為 'include' 以發送 cookies
  return fetch(url, {
    ...options,
    headers,
    credentials: 'include'
  });
}
```

### 註冊流程

類似於登入流程，當用戶成功註冊後，後端也會:

1. 設置一個 HTTP-only Cookie 包含 JWT token
2. 在響應中返回 token 字段，前端應將其存儲在 localStorage 中

### 時間處理建議

前端在處理日期和時間時，請注意：

1. 所有日期應使用 YYYY-MM-DD 格式
2. 所有時間應使用 24 小時制的 HH:MM 格式，且分鐘值只能是 00 或 30
3. 請確保在預約和排班時檢查日期和時間的有效性
4. 不要允許用戶選擇過去的日期或時間

## 本地開發

1. 克隆此倉庫
2. 安裝依賴: `npm install`
3. 啟動開發服務器: `npm run dev`

## API 文檔

詳細的 API 文檔可參閱 [API.md](./API.md) 文件。 