# Cómo construir el instalador (TikLike-Setup.exe)

Esto genera el `TikLike-Setup.exe` que repartes a la gente. Solo lo hace quien publica
(no los usuarios finales). Se hace una vez por cada versión nueva.

## Requisitos
- **Node.js** instalado (se empaqueta automáticamente dentro del instalador).
- **Inno Setup 6** (gratis): https://jrsoftware.org/isdl.php
  - O por terminal: `winget install --id JRSoftware.InnoSetup -e`
- Haber corrido `npm install` en la raíz del proyecto (para que exista `node_modules`).

## Construir
Desde la carpeta `installer/`, en PowerShell:
```powershell
powershell -ExecutionPolicy Bypass -File .\build.ps1
```
Esto:
1. Copia tu `node.exe` a `installer/runtime/` (para empaquetarlo).
2. Compila el instalador con Inno Setup.

Resultado: **`installer/Output/TikLike-Setup.exe`**

> Alternativa sin terminal: abre `installer.iss` con Inno Setup (doble clic) y pulsa
> **Build → Compile**. (Antes copia tu `node.exe` a `installer/runtime/node.exe`.)

## Qué hace el instalador en la PC del usuario
- Instala en `%LOCALAPPDATA%\TikLike` (no pide permisos de administrador).
- Crea accesos directos (Inicio) y lo pone en el **arranque de Windows**.
- Al terminar, inicia TikLike y abre una página con la **URL del panel + botón Copiar**
  para pegarla en OBS.
- No incluye `twitch.config.json` ni `accounts.json` (cada usuario pone los suyos).
