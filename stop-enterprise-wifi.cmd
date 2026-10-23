@echo off
cd /d "%~dp0"
pwsh -NoProfile -File tools\stop-enterprise-wifi.ps1
pwsh -NoProfile -File tools\stop-enterprise.ps1
pause
