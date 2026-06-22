@echo off
title TikLike
cd /d "%~dp0"

REM Primera vez: instala dependencias automaticamente
if not exist "node_modules\" (
  echo ============================================
  echo   Primera vez: instalando TikLike...
  echo   Esto puede tardar 1-2 minutos. Espera.
  echo ============================================
  call npm install
  echo.
)

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
