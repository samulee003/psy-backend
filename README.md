# 心理治療預約系統 - 後端

## 身份驗證問題修復說明

### 問題描述

在不同裝置或無痕模式下登入系統時，用戶無法看到原有的排班資訊和治療師列表。問題的根本原因是身份驗證機制在跨裝置/無痕模式環境中未能正確保持登入狀態。

具體表現為：
- 登入成功後，伺服器正確設置了Cookie
- 但後續API請求中，Cookie未被瀏覽器帶上
- 導致所有需要身份驗證的API請求（如獲取排班資訊、預約等）返回401錯誤

### 已實施的修復

後端已做出以下修改：

1. **增強身份驗證中介軟體**：
   - 增加token獲取方式，除了從Cookie和Authorization頭外，還支持從URL參數獲取
   - 優化了身份驗證失敗時的錯誤訊息

2. **改進登入API回應**：
   - 登入成功時除了設置Cookie，還在回應中返回token
   - 這使得前端可以選擇將token存儲在localStorage中，解決跨裝置/無痕模式問題

3. **優化CORS配置**：
   - 設置更完整的CORS屬性，確保跨域請求可以正確傳遞Cookie和Authorization頭
   - 添加額外的允許源和方法

### 前端需要做的調整

為了完全解決問題，前端需要做以下調整：

1. **修改登入處理**：
   ```javascript
   // 登入成功後，將token存入localStorage
   const handleLogin = async (credentials) => {
     try {
       const response = await fetch('/api/auth/login', {
         method: 'POST',
         headers: { 'Content-Type': 'application/json' },
         credentials: 'include', // 重要：告訴瀏覽器包含Cookie
         body: JSON.stringify(credentials)
       });
       
       const data = await response.json();
       
       if (response.ok) {
         // 存儲token到localStorage
         localStorage.setItem('authToken', data.token);
         
         // 繼續處理登入成功邏輯...
       }
     } catch (error) {
       console.error('登入失敗:', error);
     }
   };
   ```

2. **添加請求攔截器**：
   ```javascript
   // 為所有API請求添加Authorization頭
   const apiRequest = async (url, options = {}) => {
     // 從localStorage獲取token
     const token = localStorage.getItem('authToken');
     
     // 準備請求選項
     const requestOptions = {
       ...options,
       credentials: 'include', // 包含Cookie
       headers: {
         ...options.headers,
         'Content-Type': 'application/json',
       }
     };
     
     // 如果有token，添加到請求頭
     if (token) {
       requestOptions.headers = {
         ...requestOptions.headers,
         'Authorization': `Bearer ${token}`
       };
     }
     
     return fetch(url, requestOptions);
   };
   ```

3. **登出處理**：
   ```javascript
   const handleLogout = async () => {
     try {
       await fetch('/api/auth/logout', {
         method: 'POST',
         credentials: 'include'
       });
       
       // 清除localStorage中的token
       localStorage.removeItem('authToken');
       
       // 繼續處理登出邏輯...
     } catch (error) {
       console.error('登出失敗:', error);
     }
   };
   ```

### 測試方法

1. 使用普通模式登入系統，檢查是否能看到排班資訊
2. 使用無痕模式登入系統，檢查是否能看到排班資訊
3. 在不同裝置上登入系統，檢查是否能看到排班資訊
4. 登入後關閉並重新打開瀏覽器，檢查是否仍保持登入狀態

如果您有任何問題或需要進一步的協助，請聯繫系統管理員。 