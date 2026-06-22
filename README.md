# TikLike

Panel de monitoreo en tiempo real para **TikTok LIVE** y **Twitch** a la vez, pensado para usarse
como **dock dentro de OBS**. Muestra chat, regalos, tap-tap (likes), subs/bits, entradas y viewers
de ambas plataformas juntos, con efectos de regalo y avatares.

> No es un plugin nativo de OBS: es un pequeño servidor local + un panel web que añades como
> "dock de navegador" en OBS. Así funcionan herramientas como TikFinity.

## Características
- 🔴 **TikTok + Twitch a la vez** (multistream) en un solo panel.
- 💬 Chat, 🎁 regalos, ⭐ subs, 💜 bits, ❤️ tap-tap, 🚪 entradas, 👀 viewers (con desglose por plataforma).
- 🖼️ Avatares y stats oficiales de Twitch (con tu propia app de Twitch, opcional).
- 🎉 Efectos de regalo dentro del panel.
- 🔌 **Auto-conexión**: detecta cuando inicias tu directo y se conecta solo.
- 🧩 Overlays opcionales para poner sobre el video en OBS (chat, alertas, top, efectos).

## Requisitos
- **Node.js 18 o superior** (recomendado 20+). Descárgalo en https://nodejs.org

## Instalación
```bash
git clone https://github.com/TU_USUARIO/tiklike.git
cd tiklike
npm install
```

### Iniciar
- **Windows**: doble clic en `start.bat` (o `install-autostart.bat` para que arranque solo con Windows).
- **Cualquier sistema**: `npm start`

Luego abre **http://localhost:4321/dashboard.html**

## Configurar tus cuentas
1. Abre el dashboard → botón **⚙** (arriba a la derecha).
2. Escribe tu **@usuario de TikTok** y/o tu **canal de Twitch**.
3. Marca **"Conectar solo cuando inicie mi directo"** para que se conecte automático.

> **TikTok funciona sin configurar nada** (solo tu @usuario; el directo es público).

## Twitch — avatares y viewers oficiales (opcional, recomendado)
El chat, subs y bits de Twitch funcionan **sin configurar nada**. Para tener **avatares** y
**viewers/título oficiales** necesitas tu propia app de Twitch (gratis):

1. Entra a https://dev.twitch.tv/console/apps → **Registrar tu aplicación**.
2. URL de redirección de OAuth: `http://localhost:4321/auth/twitch/callback`
   · Tipo: `Confidential` · Categoría: `Application Integration`.
3. Copia el **Client ID** y genera un **Client Secret**.
4. Copia el archivo `twitch.config.example.json` a **`twitch.config.json`** y pega ahí tus datos.

> ⚠️ Tu `twitch.config.json` es **personal y secreto** — el `.gitignore` ya evita que se suba a GitHub.

## Añadir a OBS
1. OBS → **Acoplables → Acoplables de navegador personalizados**.
2. Nombre: `TikLike` · URL: `http://localhost:4321/dashboard.html`
3. Acopla el panel donde quieras.

Overlays opcionales (Fuente → Navegador, 1920×1080, fondo transparente):
`/overlays/chat.html`, `/overlays/alerts.html`, `/overlays/effects.html`,
`/overlays/top.html?metric=likes`, `/overlays/top.html?metric=gifts`.

Guía detallada en [SETUP.md](SETUP.md).

## Aviso
TikTok no ofrece una API pública para eventos de LIVE; la conexión se hace mediante una librería
de terceros y puede dejar de funcionar si TikTok cambia su backend. Úsalo bajo tu responsabilidad
y respetando los términos de cada plataforma. Proyecto sin afiliación con TikTok ni Twitch.

## Licencia
MIT
