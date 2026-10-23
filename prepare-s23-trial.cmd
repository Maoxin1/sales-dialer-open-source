@echo off
cd /d "%~dp0"
pwsh -NoProfile -File tools\prepare-s23-trial.ps1
if errorlevel 1 pause
