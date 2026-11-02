@echo off
title AI-NBA Frontend Server (Port 5500)
echo ==============================================================
echo   Serving AI-NBA Frontend on http://localhost:5500
echo   Open in browser: http://localhost:5500
echo   Press Ctrl+C to stop.
echo ==============================================================
python -m http.server 5500
pause

