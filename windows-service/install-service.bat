@echo off
REM Windows Service Installation Script for College WhatsApp System
REM Run as Administrator

cd /d "%~dp0\.."

echo ========================================
echo College WhatsApp System - Service Installer
echo ========================================
echo.

REM Check if running as Administrator
net session >nul 2>&1
if errorlevel 1 (
    echo ERROR: This script must be run as Administrator!
    echo Right-click and select "Run as administrator"
    pause
    exit /b 1
)

REM Check if Node is installed
echo Checking Node.js installation...
node --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Node.js is not installed or not in PATH
    echo Please install Node.js first: https://nodejs.org/
    pause
    exit /b 1
)

echo Node.js found: 
node --version
echo.

REM Install npm dependencies
echo Installing dependencies...
cd backend
call npm install
if errorlevel 1 (
    echo ERROR: Failed to install dependencies
    pause
    exit /b 1
)
cd ..
echo Dependencies installed successfully!
echo.

REM Download and setup NSSM if not already present
if not exist "windows-service\nssm.exe" (
    echo Downloading NSSM (Non-Sucking Service Manager)...
    if not exist "windows-service" mkdir windows-service
    cd windows-service
    
    REM Download NSSM
    powershell -Command "(New-Object System.Net.ServicePointManager).SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072; iwr https://nssm.cc/release/nssm-2.24.zip -OutFile nssm.zip"
    
    if not exist "nssm.zip" (
        echo ERROR: Failed to download NSSM
        echo Please download manually from: https://nssm.cc/download
        pause
        exit /b 1
    )
    
    echo Extracting NSSM...
    powershell -Command "Expand-Archive -Path nssm.zip -DestinationPath . -Force"
    
    REM Find the correct architecture folder
    if exist "nssm-2.24\win64\nssm.exe" (
        copy "nssm-2.24\win64\nssm.exe" "nssm.exe"
    ) else if exist "nssm-2.24\win32\nssm.exe" (
        copy "nssm-2.24\win32\nssm.exe" "nssm.exe"
    ) else (
        echo ERROR: Could not find NSSM executable
        pause
        exit /b 1
    )
    
    REM Cleanup
    del /q nssm.zip
    rmdir /s /q nssm-2.24
    
    cd ..
    echo NSSM downloaded and extracted successfully!
    echo.
)

REM Get absolute paths
set "PROJECT_DIR=%~dp0.."
set "PROJECT_DIR=%PROJECT_DIR:~0,-1%"
set "NODE_PATH=%~dp0nssm.exe"

REM Check if service already exists
sc query CollegeWhatsAppService >nul 2>&1
if not errorlevel 1 (
    echo Service already exists. Removing old service...
    "%NODE_PATH%" remove CollegeWhatsAppService confirm
    timeout /t 2 >nul
)

REM Install service
echo Creating Windows Service...
"%NODE_PATH%" install CollegeWhatsAppService node "%PROJECT_DIR%\backend\server.js"

if errorlevel 1 (
    echo ERROR: Failed to install service
    pause
    exit /b 1
)

REM Configure service
echo Configuring service settings...
"%NODE_PATH%" set CollegeWhatsAppService AppDirectory "%PROJECT_DIR%\backend"
"%NODE_PATH%" set CollegeWhatsAppService AppStdout "%PROJECT_DIR%\logs\service.log"
"%NODE_PATH%" set CollegeWhatsAppService AppStderr "%PROJECT_DIR%\logs\service-error.log"
"%NODE_PATH%" set CollegeWhatsAppService Start SERVICE_AUTO_START
"%NODE_PATH%" set CollegeWhatsAppService Type SERVICE_WIN32_OWN_PROCESS
"%NODE_PATH%" set CollegeWhatsAppService AppEnvironmentExtra "NODE_ENV=production"

echo.
echo ========================================
echo Service installed successfully!
echo ========================================
echo.
echo Service Name: CollegeWhatsAppService
echo.
echo IMPORTANT: Before starting the service:
echo 1. Create .env file in backend folder with your Exotel credentials
echo 2. Copy env.example to backend\.env and fill in your values
echo.
echo Next steps:
echo 1. Edit backend\.env file with your Exotel credentials
echo 2. Run: windows-service\start-service.bat
echo.
echo To manage the service:
echo - Start:   windows-service\start-service.bat
echo - Stop:    windows-service\stop-service.bat
echo - Remove:  windows-service\uninstall-service.bat
echo.
pause
