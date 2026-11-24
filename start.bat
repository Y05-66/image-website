@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo ========================================
echo   Image Website - Docker 一键启动
echo ========================================
echo.

REM 检查 Docker 是否运行
docker info >nul 2>&1
if errorlevel 1 (
    echo [错误] Docker 未运行，请先启动 Docker Desktop
    pause
    exit /b 1
)

echo [1/3] 启动 MySQL + Backend 服务...
call docker-compose up -d
if errorlevel 1 (
    echo [错误] Docker Compose 启动失败
    pause
    exit /b 1
)

echo.
echo [2/3] 等待数据库初始化（约30秒）...
timeout /t 35 /nobreak >nul

echo.
echo [3/3] 检查服务状态...
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

echo.
echo ========================================
echo   启动完成！
echo ========================================
echo.
echo   后端 API: http://localhost:8080
echo   MySQL: localhost:3307 (数据库: image_website)
echo.
echo   默认管理员账号: admin / admin123
echo.
echo   停止服务: docker-compose down
echo ========================================
pause