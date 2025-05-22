# 心理治療預約系統 API 文檔

## 基礎 URL

所有 API 請求應使用基礎 URL：`/api`

## 認證

大多數 API 端點需要認證。認證方式有兩種：

1. 使用 HTTP-only Cookie（推薦）
2. 使用 Bearer Token（作為備用選項）

### 獲取認證 Token

```
POST /api/auth/login
```

**請求體**：

```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**成功回應**：

```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "name": "用戶名",
    "email": "user@example.com",
    "role": "doctor"
  }
}
```

## 用戶管理 API

### 獲取所有用戶

```
GET /api/users
```

**需要角色**：`admin`

**成功回應**：

```json
{
  "users": [
    {
      "id": 1,
      "name": "管理員",
      "email": "admin@example.com",
      "role": "admin",
      "created_at": "2023-05-01T12:00:00.000Z",
      "updated_at": "2023-05-01T12:00:00.000Z"
    },
    // 更多用戶...
  ]
}
```

### 獲取醫生列表

```
GET /api/users/doctors
```

**需要角色**：已認證用戶

**成功回應**：

```json
{
  "doctors": [
    {
      "id": 2,
      "name": "王醫生",
      "email": "doctor1@example.com"
    },
    // 更多醫生...
  ]
}
```

### 獲取單個用戶

```
GET /api/users/:userId
```

**需要角色**：`admin` 或 用戶本人

**成功回應**：

```json
{
  "user": {
    "id": 1,
    "name": "用戶名",
    "email": "user@example.com",
    "role": "patient",
    "created_at": "2023-05-01T12:00:00.000Z",
    "updated_at": "2023-05-01T12:00:00.000Z"
  }
}
```

### 更新用戶

```
PUT /api/users/:userId
```

**需要角色**：`admin` 或 用戶本人

**請求體**：

```json
{
  "name": "新用戶名",
  "email": "newemail@example.com",
  "password": "newpassword123",
  "role": "doctor" // 僅管理員可更新角色
}
```

**成功回應**：

```json
{
  "message": "用戶信息更新成功",
  "user": {
    "id": 1,
    "name": "新用戶名",
    "email": "newemail@example.com",
    "role": "doctor",
    "created_at": "2023-05-01T12:00:00.000Z",
    "updated_at": "2023-06-01T12:00:00.000Z"
  }
}
```

### 刪除用戶

```
DELETE /api/users/:userId
```

**需要角色**：`admin`

**成功回應**：

```json
{
  "message": "用戶已成功刪除",
  "canProceed": true
}
```

**衝突回應**（存在關聯數據）：

```json
{
  "error": "無法刪除此用戶，因為存在關聯的排班或預約數據",
  "canProceed": false,
  "scheduleCount": 5,
  "appointmentCount": 10,
  "reason": "has_related_data"
}
```

或（嘗試刪除最後一個管理員）：

```json
{
  "error": "無法刪除最後一個管理員帳戶",
  "canProceed": false,
  "reason": "last_admin"
}
```

### 級聯刪除用戶及其關聯數據

```
DELETE /api/users/:userId/cascade
```

**需要角色**：`admin`

**請求體**：

```json
{
  "confirm": "CASCADE_DELETE_CONFIRMED"
}
```

**成功回應**：

```json
{
  "message": "用戶及其關聯數據已成功刪除",
  "results": {
    "deleted": {
      "schedules": 5,
      "doctorAppointments": 10,
      "user": 1
    }
  },
  "canProceed": true
}
```

**衝突回應**（嘗試刪除最後一個管理員）：

```json
{
  "error": "無法刪除最後一個管理員帳戶，即使使用級聯刪除",
  "canProceed": false,
  "reason": "last_admin"
}
```

## 排班管理 API

（尚待完成）

## 預約管理 API

（尚待完成） 