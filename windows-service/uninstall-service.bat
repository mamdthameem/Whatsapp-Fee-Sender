@echo off
REM Uninstall Windows Service for College WhatsApp System
REM Run as Administrator

echo Uninstalling College WhatsApp System service...

REM Check if running as Administrator
net session >nul 2>&1
if errorlevel 1 (
    echo ERROR: This script must be run as Administrator!
    echo Right-click and select "Run as administrator"
    pause
    exit /b 1
)

REM Stop service first if running
sc query CollegeWhatsAppService >nul 2>&1
if not errorlevel 1 (
    echo Stopping service...
    sc stop CollegeWhatsAppService
    timeout /t 3 >nul
)

REM Remove service using NSSM
cd /d "%~dp0"
if exist "nssm.exe" (
    echo Removing service...
    nssm.exe remove CollegeWhatsAppService confirm
    
    if errorlevel 1 (
        echo ERROR: Failed to remove service
        echo Try removing manually: sc delete CollegeWhatsAppService
    ) else (
        echo.
        echo ========================================
        echo Service uninstalled successfully!
        echo ========================================
        echo.
    )
) else (
    echo WARNING: NSSM not found. Trying manual removal...
    sc delete CollegeWhatsAppService
    
    if errorlevel 1 (
        echo ERROR: Failed to remove service
    ) else (
        echo Service removed successfully!
    )
)

pause
