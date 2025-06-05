@echo off
echo 🚀 啟動Git自動上傳工具...
echo ================================

REM 檢查Node.js是否可用
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ 錯誤：找不到Node.js
    echo 💡 請確認Node.js已正確安裝並加入PATH環境變數
    pause
    exit /b 1
)

REM 檢查是否在正確的目錄
if not exist "auto-git-upload.js" (
    echo ❌ 錯誤：找不到auto-git-upload.js腳本
    echo 💡 請確認您在正確的專案目錄中執行此批次檔案
    pause
    exit /b 1
)

REM 執行Node.js腳本
echo 📋 執行自動上傳腳本...
node auto-git-upload.js

REM 等待用戶確認後關閉
echo.
echo 📌 按任意鍵關閉視窗...
pause >nul 