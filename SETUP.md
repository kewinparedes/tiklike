# TikLike — Instalación para OBS (uso propio)

Objetivo: que al **encender la PC y darle Transmitir en OBS**, TikLike se conecte solo
a tu TikTok/Twitch y muestre las estadísticas, sin tocar nada.

> No es un plugin nativo de OBS (OBS no puede correr el servidor que se conecta a TikTok/Twitch).
> Es un **servidor local** que arranca solo + el dashboard como **dock de navegador** dentro de OBS.
> Así funcionan TikFinity y similares.

---

## 1. Arranque automático con Windows (una sola vez)
Haz **doble clic** en **`install-autostart.bat`**.
- A partir de ahí, TikLike arranca solo (en segundo plano) cada vez que enciendes la PC.
- Para arrancarlo **ahora mismo** sin reiniciar: doble clic en **`start-hidden.vbs`**.
- ¿Prefieres arrancarlo a mano cuando quieras? Usa **`start.bat`** (abre una ventana; puedes minimizarla).
- Para quitar el autoarranque: **`uninstall-autostart.bat`**.

## 2. Configura tus cuentas (una sola vez)
1. Abre en tu navegador: **http://localhost:4321/dashboard.html**
2. Clic en el botón **⚙** (arriba a la derecha).
3. Escribe tu **@usuario de TikTok** y tu **canal de Twitch**.
4. Marca **"Conectar solo cuando inicie mi directo"** en las que quieras automáticas.
   - Se guardan en `accounts.json`. No hay que volver a escribirlas.

## 3. Añade el dashboard a OBS (una sola vez)
1. En OBS: menú **Acoplables → Acoplables de navegador personalizados**
   (Docks → Custom Browser Docks).
2. Nombre: `TikLike` · URL:
   ```
   http://localhost:4321/dashboard.html
   ```
3. Aplica y acopla el panel donde quieras dentro de OBS.

## ¡Listo!
A partir de ahora:
- Enciendes la PC → el servidor arranca solo.
- Abres OBS → el dock TikLike aparece.
- Le das **Transmitir** → al detectar que tu directo está en vivo, TikLike **se conecta solo**
  y empieza a mostrar chat, regalos, tap-tap, entradas, viewers, etc.

---

## Overlays en pantalla (opcional)
Si además quieres efectos **sobre el video** (chat, alertas, top, efectos de regalo),
añádelos como **Fuente → Navegador** (1920×1080, fondo transparente):
- Chat: `http://localhost:4321/overlays/chat.html`
- Alertas: `http://localhost:4321/overlays/alerts.html`
- Efectos de regalo: `http://localhost:4321/overlays/effects.html`
- Top tap-tap: `http://localhost:4321/overlays/top.html?metric=likes`
- Top regalos: `http://localhost:4321/overlays/top.html?metric=gifts`

## Notas
- **Twitch**: para avatares y viewers oficiales, `twitch.config.json` debe tener tu Client ID/Secret
  (ya configurado). Sin eso, funciona en modo básico.
- Detiene el servidor desde el Administrador de tareas (proceso `node.exe`) si lo necesitas.
- Requiere **Node.js** instalado.
