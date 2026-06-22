@echo off
title TikLike
cd /d "%~dp0"
echo ============================================
echo   TikLike - servidor local
echo   Deja esta ventana abierta (puedes minimizarla).
echo   Dashboard: http://localhost:4321/dashboard.html
echo ============================================
echo.
node src\server.js
echo.
echo El servidor se detuvo.
pause
