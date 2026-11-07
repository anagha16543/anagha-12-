@echo off
title AI-NBA Real Backend Server (Port 8000)
cd /d "%~dp0backend"
echo ==============================================================
echo   Starting AI-NBA Real Backend Server on http://localhost:8000
echo   Interactive Swagger Docs: http://localhost:8000/docs
echo   Press Ctrl+C to stop.
echo ==============================================================
uvicorn app.main:app --host 127.0.0.1 --port 8000
pause

