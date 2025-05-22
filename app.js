/**
 * 應用程式主入口點
 */
console.log('[APP] 程式開始執行...');

const express = require('express');
console.log('[APP] Express 已載入');
const cors = require('cors');
console.log('[APP] CORS 已載入');
const cookieParser = require('cookie-parser');
console.log('[APP] Cookie Parser 已載入');
const path = require('path');
console.log('[APP] Path 已載入');

// 引入資料庫連接
console.log('[APP] 準備載入資料庫設定...');
const { connectDatabase } = require('./config/db');
console.log('[APP] 資料庫設定已載入');

// 引入中間件
console.log('[APP] 準備載入錯誤處理中間件...');
const { notFound, errorHandler } = require('./middlewares/errorHandler');
console.log('[APP] 錯誤處理中間件已載入');

// 創建 Express 應用
const app = express();
console.log('[APP] Express 應用程式已創建');

// 連接資料庫
console.log('[APP] 準備連接資料庫...');
const db = connectDatabase();
console.log('[APP] 資料庫連接已初始化 (等待實際連接結果)');

// --- 基本中間件 ---
console.log('[APP] 準備註冊 CORS 中間件...');
app.use(cors({
  origin: true, // 允許所有來源請求，更適合在生產環境中
  credentials: true, // 允許跨域傳遞cookie
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
console.log('[APP] CORS 中間件已註冊');

console.log('[APP] 準備註冊 JSON 和 URL-encoded 中間件...');
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
console.log('[APP] JSON 和 URL-encoded 中間件已註冊');

console.log('[APP] 準備註冊 Cookie Parser 中間件...');
app.use(cookieParser());
console.log('[APP] Cookie Parser 中間件已註冊');

// --- 記錄請求路徑以便調試 ---
if (process.env.DEBUG) {
  app.use((req, res, next) => {
    console.log(`[DEBUG] 收到請求: ${req.method} ${req.path}`);
    next();
  });
}

// --- API 路由優先掛載 ---
console.log('[APP] 準備載入 API 路由...');
const routes = require('./routes')(db);
console.log('[APP] API 路由已成功載入');
console.log('[APP] 準備掛載 API 路由...');

// 添加直接路由來處理常見的問題端點
app.get('/api/doctors', (req, res) => {
  console.log('[APP] 直接處理 /api/doctors 請求');
  // 引入 userController 並調用 getDoctors 函數
  try {
    const userController = require('./controllers/userController')(db);
    // 所有用戶都可以獲取醫生列表，所以跳過驗證
    return userController.getDoctors(req, res);
  } catch (err) {
    console.error('處理 /api/doctors 時出錯:', err);
    return res.status(500).json({ error: '無法獲取醫生列表，發生內部錯誤' });
  }
});

// 直接處理 /api/me 請求
app.get('/api/me', (req, res, next) => {
  console.log('[APP] 直接處理 /api/me 請求');
  try {
    const { authenticateUser } = require('./middlewares/auth');
    const authController = require('./controllers/authController')(db);
    
    // 手動執行驗證中間件，然後執行 getCurrentUser
    authenticateUser(req, res, (err) => {
      if (err) {
        // 如果驗證中間件返回錯誤 (例如 token 無效)，則直接返回錯誤
        // authenticateUser 已經處理了 res.status 和 json
        return;
      }
      if (req.user) {
        return authController.getCurrentUser(req, res);
      } else {
        // 即使 authenticateUser 成功 (next() 被調用)，req.user 可能仍未設置
        // 這種情況通常不應發生，但為保險起見，返回 401
        console.error('[APP] /api/me: authenticateUser 成功但 req.user 未設置');
        return res.status(401).json({ error: '驗證成功但無法獲取用戶資訊' });
      }
    });
  } catch (err) {
    console.error('處理 /api/me 時出錯:', err);
    return res.status(500).json({ error: '無法獲取用戶資訊，發生內部錯誤' });
  }
});

app.get('/api/schedule/:year/:month', (req, res) => {
  console.log('[APP] 直接處理 /api/schedule/:year/:month 請求');
  // 重寫路徑到 /api/schedules/:year/:month
  req.url = req.url.replace('/api/schedule/', '/api/schedules/');
  console.log(`[路由重寫] 從 /api/schedule/:year/:month 到 ${req.url}`);
  // 繼續處理請求
  routes(req, res, (err) => {
    if (err) {
      console.error('處理 schedule 路由時出錯:', err);
      return res.status(500).json({ error: '處理排班請求時發生錯誤' });
    }
  });
});

// 修改：加入路由前綴檢查，確保所有 API 路由不進入靜態文件或 SPA 處理
app.use((req, res, next) => {
  if (req.path.startsWith('/api/')) {
    console.log(`[API 請求攔截] ${req.method} ${req.path}`);
    
    // 手動檢查一些常見路由
    if (req.path === '/api/me' || req.path === '/api/auth/me') {
      // 轉發到 /api/auth/me
      req.url = '/api/auth/me';
    } else if (req.path.startsWith('/api/schedule/')) {
      // 轉發到 /api/schedules/
      req.url = req.url.replace('/api/schedule/', '/api/schedules/');
      console.log(`[路由重寫] ${req.path} => ${req.url}`);
    } else if (req.path === '/api/doctors' || req.path === '/api/users/doctors') {
      // 確保使用正確的醫生列表端點
      req.url = '/api/users/doctors';
    }
  }
  next();
});

app.use(routes); // API 路由應在靜態文件和 SPA 回退之前
console.log('[APP] API 路由已成功掛載');

// --- 錯誤處理中間件 (應在所有路由和中間件之後) ---
console.log('[APP] 準備註冊 Not Found 和 Error Handler 中間件...');
app.use(notFound);
app.use(errorHandler);
console.log('[APP] Not Found 和 Error Handler 中間件已註冊');

console.log('[APP] 準備導出 app 和 db...');
module.exports = { app, db };
console.log('[APP] app 和 db 已導出'); 