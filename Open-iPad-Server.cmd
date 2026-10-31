@echo off
chcp 65001 >nul
cd /d "%~dp0"
powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -File "%~dp0serve-ipad.ps1"
echo.
echo The server has stopped. Press any key to close this window.
pause >nul
