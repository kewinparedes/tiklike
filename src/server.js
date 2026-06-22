// server.js — Fastify + WebSocket + estáticos. Punto de arranque de TikLike.
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { readFile, writeFile } from 'node:fs/promises';
import Fastify from 'fastify';
import fastifyStatic from '@fastify/static';
import fastifyWebsocket from '@fastify/websocket';

import { stats } from './state.js';
import * as bus from './bus.js';
import { TikTokManager } from './tiktok.js';
import { TwitchManager } from './twitch.js';
import { helix } from './twitch-helix.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT) || 4321;
const HOST = process.env.HOST || '127.0.0.1';

const app = Fastify({ logger: false });

// Una instancia por plataforma; AMBAS pueden estar activas a la vez (multistream).
const managers = { tiktok: new TikTokManager(), twitch: new TwitchManager() };
stats.reset();

// Parser tolerante: acepta POST sin cuerpo o con JSON vacío sin lanzar 415/400.
app.addContentTypeParser('application/json', { parseAs: 'string' }, (_req, body, done) => {
  if (!body || body.trim() === '') return done(null, {});
  try { done(null, JSON.parse(body)); } catch (err) { err.statusCode = 400; done(err); }
});

await app.register(fastifyWebsocket);
await app.register(fastifyStatic, {
  root: join(__dirname, '..', 'public'),
  prefix: '/',
});

// ---- Conectamos cada manager con el bus y los contadores ----
function wireManager(m) {
  m.on('event', (ev) => {
    ev.platform = m.platform; // etiqueta de qué plataforma viene
    const changed = stats.apply(ev);
    bus.broadcast(ev);
    if (changed) bus.broadcast({ type: 'state', ...stats.snapshot() });
  });
  m.on('status', (info) => bus.broadcast({ type: 'status', ...info }));
  m.on('app-error', (msg) => bus.broadcast({ type: 'notice', level: 'error', message: msg, platform: m.platform }));
}
Object.values(managers).forEach(wireManager);

function allStatuses() {
  return { tiktok: managers.tiktok.statusInfo(), twitch: managers.twitch.statusInfo() };
}

// ---- Cuentas guardadas + auto-conexión al detectar tu directo ----
const ACCOUNTS_PATH = join(__dirname, '..', 'accounts.json');
let accounts = { tiktok: { username: '', auto: false }, twitch: { username: '', auto: false } };

async function loadAccounts() {
  try {
    const j = JSON.parse(await readFile(ACCOUNTS_PATH, 'utf8'));
    for (const p of ['tiktok', 'twitch']) if (j[p]) accounts[p] = { username: j[p].username || '', auto: !!j[p].auto };
  } catch { /* primera vez: sin archivo */ }
}
async function saveAccounts() {
  try { await writeFile(ACCOUNTS_PATH, JSON.stringify(accounts, null, 2)); } catch { /* ignore */ }
}

let autoBusy = false;
async function autoWatch() {
  if (autoBusy) return;
  autoBusy = true;
  try {
    for (const p of ['tiktok', 'twitch']) {
      const acc = accounts[p];
      if (!acc.auto || !acc.username) continue;
      const m = managers[p];
      const st = m.statusInfo();
      if (st.status === 'connecting') continue;
      const live = await m.isLive(acc.username).catch(() => false);
      if (live && st.status !== 'connected') {
        m.connect(acc.username).catch(() => {});
      } else if (!live && st.status === 'connected'
                 && (st.username || '').toLowerCase() === acc.username.toLowerCase()) {
        await m.disconnect();
      }
    }
  } finally {
    autoBusy = false;
  }
}

// ---- WebSocket: cada overlay/panel que se conecta ----
app.get('/ws', { websocket: true }, (socket) => {
  bus.addClient(socket);
  // Estado inicial de ambas plataformas para que el cliente pinte de inmediato.
  socket.send(JSON.stringify({ type: 'status', ...managers.tiktok.statusInfo() }));
  socket.send(JSON.stringify({ type: 'status', ...managers.twitch.statusInfo() }));
  socket.send(JSON.stringify({ type: 'state', ...stats.snapshot() }));
  socket.on('close', () => bus.removeClient(socket));
  socket.on('error', () => bus.removeClient(socket));
});

// ---- API REST para el panel ----
// Conecta UNA plataforma (sin tocar la otra) -> ambas pueden estar activas a la vez.
app.post('/api/connect', async (req, reply) => {
  const platform = req.body?.platform === 'twitch' ? 'twitch' : 'tiktok';
  const username = req.body?.username;
  try {
    const info = await managers[platform].connect(username);
    return { ok: true, ...info };
  } catch (err) {
    reply.code(400);
    return { ok: false, error: err.message, platform };
  }
});

// Desconecta una plataforma (o ambas si no se especifica).
app.post('/api/disconnect', async (req) => {
  const platform = req.body?.platform;
  if (platform === 'tiktok' || platform === 'twitch') {
    await managers[platform].disconnect();
  } else {
    await Promise.all(Object.values(managers).map((m) => m.disconnect()));
  }
  return { ok: true, platforms: allStatuses() };
});

app.post('/api/reset', async () => {
  stats.reset();
  bus.broadcast({ type: 'state', ...stats.snapshot() });
  return { ok: true, ...stats.snapshot() };
});

// Simulador: dispara eventos falsos para probar overlays sin estar en directo.
app.post('/api/simulate', async () => {
  const u = (handle, name) => ({ handle, name, pic: null });
  const ana = u('ana_rivas', 'Ana Rivas');
  const leo = u('leo.dev', 'Leo');
  const sofi = u('sofi_99', 'Sofi');
  const demo = u('demo', 'Usuario Demo');
  const samples = [
    { type: 'chat', user: ana, comment: '¡Hola, qué buen directo! 🔥' },
    { type: 'like', user: ana, count: 30, total: 1240 },
    { type: 'like', user: leo, count: 12, total: 1252 },
    { type: 'like', user: sofi, count: 50, total: 1302 },
    { type: 'gift', user: leo, giftId: '5655', giftName: 'Rosa', giftIcon: null, count: 3, diamonds: 3, streaking: false, countable: true },
    { type: 'gift', user: sofi, giftId: '5827', giftName: 'TikTok', giftIcon: null, count: 1, diamonds: 1, streaking: false, countable: true },
    { type: 'gift', user: ana, giftId: '6064', giftName: 'Universo', giftIcon: null, count: 1, diamonds: 34999, streaking: false, countable: true },
    { type: 'follow', user: leo },
    { type: 'share', user: sofi },
    { type: 'member', user: demo },
    { type: 'viewers', count: 87 },
  ];
  for (const ev of samples) {
    const changed = stats.apply(ev);
    bus.broadcast(ev);
    if (changed) bus.broadcast({ type: 'state', ...stats.snapshot() });
  }
  return { ok: true, sent: samples.length };
});

// Detalle de un usuario: perfil + actividad en la sesión.
app.get('/api/user', async (req, reply) => {
  const handle = String(req.query.handle || '').replace(/^@/, '').trim();
  const platform = req.query.platform === 'twitch' ? 'twitch' : 'tiktok';
  if (!handle) { reply.code(400); return { ok: false, error: 'falta handle' }; }
  return {
    ok: true,
    handle,
    platform,
    profile: await managers[platform].getUserDetail(handle),
    activity: stats.userActivity(handle, platform),
  };
});

// Cuentas propias para auto-conexión (se guardan en accounts.json).
app.get('/api/accounts', async () => accounts);
app.post('/api/accounts', async (req) => {
  const b = req.body || {};
  for (const p of ['tiktok', 'twitch']) {
    if (b[p] && typeof b[p] === 'object') {
      if (typeof b[p].username === 'string') accounts[p].username = b[p].username.replace(/^[@#]/, '').trim();
      if (typeof b[p].auto === 'boolean') accounts[p].auto = b[p].auto;
    }
  }
  await saveAccounts();
  autoWatch(); // aplica de inmediato
  return { ok: true, accounts };
});

app.get('/api/status', async () => {
  return {
    platforms: allStatuses(),
    ...stats.snapshot(),
    clients: bus.clientCount(),
  };
});

// Raíz -> panel de control
app.get('/', async (_req, reply) => reply.redirect('/panel.html'));

const twitchReady = await helix.load();
console.log(twitchReady ? '  Twitch API (Helix) activa: avatares + stats oficiales' : '  Twitch API: sin credenciales (modo anónimo)');

await loadAccounts();
// Vigilante de auto-conexión: revisa si tus cuentas están en vivo y conecta solo.
setInterval(autoWatch, 20000);
setTimeout(autoWatch, 2500);
const autoOn = ['tiktok', 'twitch'].filter((p) => accounts[p].auto && accounts[p].username);
console.log(autoOn.length ? `  Auto-conexión activa para: ${autoOn.join(', ')}` : '  Auto-conexión: sin cuentas configuradas');

try {
  await app.listen({ port: PORT, host: HOST });
  console.log(`\n  TikLike escuchando en http://${HOST}:${PORT}`);
  console.log(`  Panel de control:   http://${HOST}:${PORT}/panel.html`);
  console.log(`  Overlay chat:       http://${HOST}:${PORT}/overlays/chat.html`);
  console.log(`  Overlay alertas:    http://${HOST}:${PORT}/overlays/alerts.html`);
  console.log(`  Overlay contadores: http://${HOST}:${PORT}/overlays/counters.html\n`);
} catch (err) {
  console.error('No se pudo iniciar el servidor:', err);
  process.exit(1);
}
