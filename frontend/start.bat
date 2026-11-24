@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo ========================================
echo   Image Website - 前端开发服务器
echo ========================================
echo.
echo 请确保后端已在运行: start.bat
echo.
echo 访问地址: http://localhost:5173
echo ========================================
echo.
call npm run dev
pause
