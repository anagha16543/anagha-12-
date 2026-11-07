@echo off
REM Double-click or run: start.bat setup   (first time)  /  start.bat   (after that)
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0start.ps1" %*
