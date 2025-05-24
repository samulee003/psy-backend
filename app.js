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

// **修復：更具體的 CORS 配置**
const corsOptions = {
  origin: function (origin, callback) {
    // 允許的來源清單
    const allowedOrigins = [
      'https://therapy-booking.zeabur.app',
      'http://localhost:3000',
      'http://localhost:3001',
      'http://localhost:3002',
      'http://localhost:5173',
      'http://127.0.0.1:3000',
      'http://127.0.0.1:3001',
      'http://127.0.0.1:3002',
      'http://127.0.0.1:5173'
    ];
    
    // 允許沒有 origin 的請求（例如 Postman、伺服器到伺服器的請求）
    if (!origin) return callback(null, true);
    
    // 檢查來源是否在允許清單中
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      console.log('[CORS] 拒絕來源:', origin);
      callback(new Error('不被 CORS 政策允許的來源'), false);
    }
  },
  credentials: true, // 允許跨域傳遞 cookie
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'HEAD', 'PATCH'],
  allowedHeaders: [
    'Content-Type', 
    'Authorization', 
    'X-Requested-With',
    'Accept',
    'Origin',
    'Access-Control-Request-Method',
    'Access-Control-Request-Headers'
  ],
  exposedHeaders: ['Content-Range', 'X-Content-Range'],
  preflightContinue: false
};

app.use(cors(corsOptions));
console.log('[APP] CORS 中間件已註冊');

// **新增：手動處理 OPTIONS 預檢請求**
app.options('*', (req, res) => {
  console.log('[CORS] 處理 OPTIONS 預檢請求:', req.method, req.path);
  res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, HEAD, PATCH');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.sendStatus(200);
});

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

// 直接掛載所有 API 路由
app.use(routes);
console.log('[APP] API 路由已成功掛載');

// --- 錯誤處理中間件 (應在所有路由和中間件之後) ---
console.log('[APP] 準備註冊 Not Found 和 Error Handler 中間件...');
app.use(notFound);
app.use(errorHandler);
console.log('[APP] Not Found 和 Error Handler 中間件已註冊');

console.log('[APP] 準備導出 app 和 db...');
module.exports = { app, db };
console.log('[APP] app 和 db 已導出'); 