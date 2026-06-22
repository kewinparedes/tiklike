@echo off
cd /d "%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -Command "$ws=New-Object -ComObject WScript.Shell; $lnk=$ws.CreateShortcut([Environment]::GetFolderPath('Startup')+'\TikLike.lnk'); $lnk.TargetPath='%~dp0start-hidden.vbs'; $lnk.WorkingDirectory='%~dp0'; $lnk.Save()"
echo.
echo  Listo: TikLike arrancara solo con Windows (en segundo plano).
echo  Para arrancarlo ahora mismo, haz doble clic en start-hidden.vbs
echo.
pause
