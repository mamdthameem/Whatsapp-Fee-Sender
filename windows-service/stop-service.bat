@echo off
REM Stop Windows Service for College WhatsApp System
REM Run as Administrator

echo Stopping College WhatsApp System service...

REM Check if running as Administrator
net session >nul 2>&1
if errorlevel 1 (
    echo ERROR: This script must be run as Administrator!
    echo Right-click and select "Run as administrator"
    pause
    exit /b 1
)

sc stop CollegeWhatsAppService

if errorlevel 1 (
    echo.
    echo ERROR: Failed to stop service.
    echo Service may not be running.
) else (
    echo.
    echo ========================================
    echo Service stopped successfully!
    echo ========================================
    echo.
)

pause
