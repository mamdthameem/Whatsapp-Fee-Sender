@echo off
REM Start Windows Service for College WhatsApp System
REM Run as Administrator

echo Starting College WhatsApp System service...

REM Check if running as Administrator
net session >nul 2>&1
if errorlevel 1 (
    echo ERROR: This script must be run as Administrator!
    echo Right-click and select "Run as administrator"
    pause
    exit /b 1
)

sc start CollegeWhatsAppService

if errorlevel 1 (
    echo.
    echo ERROR: Failed to start service.
    echo.
    echo Possible reasons:
    echo 1. Service is already running
    echo 2. .env file is missing or has invalid credentials
    echo 3. Port 3000 is already in use
    echo.
    echo Check logs: backend\logs\activity.log
    echo Check service logs: logs\service-error.log
) else (
    echo.
    echo ========================================
    echo Service started successfully!
    echo ========================================
    echo.
    echo Application should be running at:
    echo http://localhost:3000
    echo.
    echo Check status: sc query CollegeWhatsAppService
    echo View logs: backend\logs\activity.log
    echo.
)

pause
