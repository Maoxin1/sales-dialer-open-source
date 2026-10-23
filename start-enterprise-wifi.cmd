@echo off
cd /d "%~dp0"
pwsh -NoProfile -File tools\start-enterprise-wifi.ps1
pause
