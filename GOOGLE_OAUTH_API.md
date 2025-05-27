# Google OAuth 2.0 API 文檔

## 概述

本文檔描述了心理治療預約系統的 Google OAuth 2.0 認證 API 端點。支援 Authorization Code 流程，可用於用戶登入和註冊。

## 端點列表

### 1. 檢查 OAuth 配置

**端點**: `GET /api/auth/google/config`  
**用途**: 檢查後端 Google OAuth 配置狀態，獲取 Client ID

**回應範例**:
```json
{
  "success": true,
  "configured": true,
  "clientId": "your-google-client-id.apps.googleusercontent.com",
  "details": {
    "hasClientId": true,
    "hasClientSecret": true,
    "clientId": "your-google-client-id..."
  }
}
```

### 2. Google OAuth 回調端點

**端點**: `POST /api/auth/google/callback`  
**用途**: 處理 Google OAuth authorization code，完成登入或註冊流程

#### 請求參數

| 參數 | 類型 | 必需 | 說明 |
|------|------|------|------|
| `code` | string | ✅ | Google OAuth authorization code |
| `mode` | string | ✅ | 認證模式：`"login"` 或 `"register"` |
| `role` | string | ⚠️ | 用戶角色：`"patient"`, `"doctor"`, `"admin"`（僅註冊模式需要） |

#### 登入模式範例

```javascript
POST /api/auth/google/callback
Content-Type: application/json

{
  "code": "4/0AfA_google_authorization_code...",
  "mode": "login"
}
```

#### 註冊模式範例

```javascript
POST /api/auth/google/callback
Content-Type: application/json

{
  "code": "4/0AfA_google_authorization_code...",
  "mode": "register",
  "role": "patient"
}
```

#### 成功回應範例

```json
{
  "success": true,
  "message": "Google 登入成功",
  "user": {
    "id": 123,
    "name": "張三",
    "email": "user@example.com",
    "role": "patient",
    "phone": null,
    "profilePicture": "https://lh3.googleusercontent.com/..."
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "authMethod": "google",
  "mode": "login"
}
```

#### 錯誤回應範例

**參數驗證錯誤** (400):
```json
{
  "success": false,
  "error": "缺少必要的 authorization code"
}
```

**OAuth 認證失敗** (401):
```json
{
  "success": false,
  "error": "Google OAuth 認證失敗，請重新嘗試",
  "details": "無法獲取 Google access token: Invalid grant"
}
```

**用戶已存在** (409):
```json
{
  "success": false,
  "error": "此 Google 帳戶已被註冊，請直接登入",
  "suggestion": "login",
  "userEmail": "user@example.com",
  "hasGoogleId": true
}
```

## 認證流程

### 前端實施步驟

1. **獲取配置**: 呼叫 `/api/auth/google/config` 獲取 Client ID
2. **初始化 Google OAuth**: 使用 Client ID 初始化 Google OAuth 流程
3. **獲取 Authorization Code**: 用戶授權後獲得 code
4. **提交回調請求**: 將 code 和模式參數發送到 `/api/auth/google/callback`
5. **處理回應**: 保存用戶資訊和 token，設置登入狀態

### 後端處理流程

1. **驗證參數**: 檢查 code 和 mode 參數
2. **交換 Token**: 使用 authorization code 向 Google 換取 access token
3. **獲取用戶資訊**: 使用 access token 獲取 Google 用戶資料
4. **用戶處理**: 根據模式進行登入或註冊邏輯
5. **生成會話**: 創建 JWT token 並設置 cookie
6. **回應前端**: 返回用戶資訊和認證狀態

## 環境設定

### 後端環境變數

```bash
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-client-secret
```

### Google Cloud Console 設定

1. **創建 OAuth 2.0 客戶端**
2. **設定授權重定向 URI**:
   - 開發環境: `http://localhost:8080`
   - 生產環境: `https://your-domain.zeabur.app`
3. **啟用 Google+ API** (或 People API)

## 安全考量

- ✅ Client Secret 僅在後端使用，不暴露給前端
- ✅ 使用 HTTPS 進行生產環境通信
- ✅ JWT token 設置適當的過期時間（24小時）
- ✅ Cookie 設置 HttpOnly 和 Secure 標誌
- ✅ 驗證 Google 用戶資訊的完整性

## 測試

使用測試腳本驗證端點功能：

```bash
node test-google-oauth-callback.js
```

測試包含：
- 配置端點驗證
- 參數驗證測試
- 錯誤處理測試
- 不同模式組合測試

## 版本資訊

- **版本**: 1.0.0
- **實施日期**: 2025-01-26
- **Node.js 要求**: >=18.0.0
- **依賴套件**: `node-fetch@^2.7.0`, `jsonwebtoken@^9.0.2` 