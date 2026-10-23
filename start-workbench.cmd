@echo off
pwsh.exe -NoProfile -File "%~dp0tools\start-workbench.ps1" -OpenBrowser
if errorlevel 1 pause
