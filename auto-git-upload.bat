@echo off
chcp 65001
echo 正在準備自動上傳至Git...

REM 獲取更改的文件列表
git status --porcelain > changed_files.txt

REM 檢查是否有修改
for /f %%i in ("changed_files.txt") do set size=%%~zi
if %size% == 0 (
    echo 沒有檢測到任何更改，無需上傳。
    del changed_files.txt
    pause
    exit /b
)

echo 檢測到以下更改：
git status --short

REM 添加所有更改的文件
echo.
echo 正在添加文件到Git暫存區...
git add .

REM 設置提交訊息
echo.
set /p commit_message=請輸入提交訊息 (或直接按Enter使用默認訊息): 
if "%commit_message%"=="" set commit_message=自動提交更新 - %date% %time%

REM 提交更改
echo.
echo 正在提交更改...
git commit -q -m "%commit_message%"

if %errorlevel% neq 0 (
    echo 提交失敗！請檢查Git設定。
    del changed_files.txt
    pause
    exit /b
)

REM 推送到遠程倉庫
echo 正在推送到遠程倉庫...
git push -q

if %errorlevel% neq 0 (
    echo 推送失敗！請檢查網路連接和Git設定。
    del changed_files.txt
    pause
    exit /b
)

REM 刪除臨時文件
del changed_files.txt

echo.
echo ✅ 已成功上傳至Git!
echo 提交訊息: "%commit_message%"
echo.
pause 