@echo off
powershell -NoProfile -Command "Remove-Item ([Environment]::GetFolderPath('Startup')+'\TikLike.lnk') -ErrorAction SilentlyContinue"
echo TikLike ya no arrancara con Windows.
echo (El servidor en ejecucion sigue activo hasta que reinicies o lo cierres.)
pause
