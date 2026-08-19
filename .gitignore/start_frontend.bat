@echo off
cd /d "%~dp0frontend"
echo Installing frontend dependencies...
call npm install
if errorlevel 1 (
    echo Frontend dependency installation failed.
    pause
    exit /b 1
)
echo Building SafeML SOC frontend...
call npm run build
if errorlevel 1 (
    echo Frontend build failed.
    pause
    exit /b 1
)
echo Frontend build complete.
pause
