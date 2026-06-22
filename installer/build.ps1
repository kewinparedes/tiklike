# Compila TikLike-Setup.exe
# 1) Copia tu node.exe ya instalado (para empaquetarlo, el usuario final no instala Node).
# 2) Compila el instalador con Inno Setup (ISCC.exe).

$here = $PSScriptRoot
$runtime = Join-Path $here 'runtime'
New-Item -ItemType Directory -Force $runtime | Out-Null

$node = (Get-Command node -ErrorAction SilentlyContinue).Source
if (-not $node) { Write-Host "No encuentro node.exe en el PATH. Instala Node.js primero."; exit 1 }
Copy-Item $node (Join-Path $runtime 'node.exe') -Force
Write-Host "node.exe empaquetado desde: $node"

# Busca el compilador de Inno Setup
$iscc = @(
  "$env:LOCALAPPDATA\Programs\Inno Setup 6\ISCC.exe",
  "C:\Program Files (x86)\Inno Setup 6\ISCC.exe",
  "C:\Program Files\Inno Setup 6\ISCC.exe"
) | Where-Object { Test-Path $_ } | Select-Object -First 1

if (-not $iscc) {
  Write-Host ""
  Write-Host "No encontre Inno Setup. Instalalo gratis desde https://jrsoftware.org/isdl.php"
  Write-Host "Luego vuelve a ejecutar este build.ps1 (o abre installer.iss en Inno Setup y pulsa Compile)."
  exit 1
}

& $iscc (Join-Path $here 'installer.iss')
Write-Host ""
Write-Host "Listo. El instalador esta en: $here\Output\TikLike-Setup.exe"
