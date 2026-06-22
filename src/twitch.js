// twitch.js — conexión anónima al chat de Twitch (IRC over WebSocket).
// Mapea los eventos de Twitch a los mismos eventos normalizados que TikTok,
// para que overlays y dashboard funcionen igual.
import { EventEmitter } from 'node:events';
import WebSocket from 'ws';
import { helix } from './twitch-helix.js';

const IRC_URL = 'wss://irc-ws.chat.twitch.tv:443';

// Parser mínimo de IRC con tags de Twitch.
function parseIRC(line) {
  let rest = line;
  const tags = {};
  if (rest[0] === '@') {
    const sp = rest.indexOf(' ');
    for (const kv of rest.slice(1, sp).split(';')) {
      const i = kv.indexOf('=');
      tags[kv.slice(0, i)] = kv.slice(i + 1);
    }
    rest = rest.slice(sp + 1);
  }
  let prefix = null;
  if (rest[0] === ':') {
    const sp = rest.indexOf(' ');
    prefix = rest.slice(1, sp);
    rest = rest.slice(sp + 1);
  }
  let trailing = null;
  const ti = rest.indexOf(' :');
  if (ti !== -1) { trailing = rest.slice(ti + 2); rest = rest.slice(0, ti); }
  const parts = rest.split(' ').filter(Boolean);
  return { tags, prefix, command: parts[0], params: parts.slice(1), trailing };
}

function nickOf(prefix) {
  return prefix ? prefix.split('!')[0] : '';
}

export class TwitchManager extends EventEmitter {
  constructor() {
    super();
    this.platform = 'twitch';
    this.ws = null;
    this.channel = null;
    this.status = 'disconnected';
    this.lastError = null;
    this.users = new Map();
    this._viewerTimer = null;
    this.streamInfo = null;
    this._avatarCache = new Map(); // userId -> url
    this._avatarQueue = new Set(); // userIds pendientes de resolver avatar
    this._avatarTimer = null;
  }

  statusInfo() {
    return {
      platform: 'twitch',
      status: this.status,
      username: this.channel,
      roomId: null,
      lastError: this.lastError,
    };
  }

  getUser(handle) {
    return this.users.get(String(handle || '').toLowerCase().replace(/^@/, '')) || null;
  }

  async getUserDetail(handle) {
    handle = String(handle || '').toLowerCase().replace(/^[#@]/, '');
    const m = this.users.get(handle) || { handle };
    if (helix.enabled && (!m.pic || !m.createdAt)) {
      try {
        const u = await helix.getUserByLogin(handle);
        if (u) {
          m.pic = u.profile_image_url;
          if (u.display_name) m.name = u.display_name;
          m.userId = u.id;
          m.createdAt = u.created_at;
          m.broadcasterType = u.broadcaster_type;
          m.description = u.description;
          this.users.set(handle, m);
        }
      } catch { /* devolvemos lo que haya */ }
    }
    return m;
  }

  // ¿El canal está transmitiendo ahora? (para auto-conexión)
  async isLive(rawChannel) {
    const channel = String(rawChannel || '').replace(/^[#@]/, '').trim().toLowerCase();
    if (!channel) return false;
    try {
      if (helix.enabled) return !!(await helix.getStream(channel));
      const r = await fetch('https://decapi.me/twitch/uptime/' + encodeURIComponent(channel));
      const t = (await r.text()).trim().toLowerCase();
      return !!t && !t.includes('offline') && !t.includes("isn't") && !t.includes('not live');
    } catch {
      return false;
    }
  }

  user(login, display, tags) {
    login = (login || 'anon').toLowerCase();
    const name = display || login;
    const m = this.users.get(login) || { handle: login };
    m.name = name;
    let pic = null;
    if (tags) {
      if (tags['subscriber'] === '1') m.subscriber = true;
      if (tags['mod'] === '1') m.mod = true;
      const uid = tags['user-id'];
      if (uid) {
        m.userId = uid;
        pic = this._avatarCache.get(uid) || m.pic || null;
        if (!pic && helix.enabled) this._avatarQueue.add(uid); // se resuelve en lote
      }
    }
    if (pic) m.pic = pic;
    this.users.set(login, m);
    return { handle: login, name, pic };
  }

  // Resuelve avatares en lote vía Helix y los cachea para los próximos eventos.
  _startAvatarBatch() {
    if (!helix.enabled || this._avatarTimer) return;
    this._avatarTimer = setInterval(async () => {
      if (!this._avatarQueue.size) return;
      const ids = [...this._avatarQueue].slice(0, 100);
      ids.forEach((id) => this._avatarQueue.delete(id));
      try {
        const users = await helix.getUsersById(ids);
        for (const u of users) {
          this._avatarCache.set(u.id, u.profile_image_url);
          const m = this.users.get(u.login) || { handle: u.login };
          m.pic = u.profile_image_url;
          m.userId = u.id;
          if (u.display_name) m.name = u.display_name;
          m.createdAt = u.created_at;
          m.broadcasterType = u.broadcaster_type;
          m.description = u.description;
          this.users.set(u.login, m);
        }
      } catch { /* reintenta en el próximo ciclo */ }
    }, 1500);
  }

  async connect(rawChannel) {
    const channel = String(rawChannel || '').replace(/^[#@]/, '').trim().toLowerCase();
    if (!channel) throw new Error('Falta el nombre del canal de Twitch');
    if (this.ws) await this.disconnect();

    this.channel = channel;
    this.status = 'connecting';
    this.lastError = null;
    this.users = new Map();
    this.emit('status', this.statusInfo());

    await this._open(channel);
    this._startAvatarBatch();
    this._startViewerPoll(channel);
    return this.statusInfo();
  }

  _open(channel) {
    return new Promise((resolve, reject) => {
      const ws = new WebSocket(IRC_URL);
      this.ws = ws;
      let done = false;
      const finish = (ok, err) => {
        if (done) return; done = true;
        if (ok) { this.status = 'connected'; this.emit('status', this.statusInfo()); resolve(this.statusInfo()); }
        else { this.status = 'error'; this.lastError = err; this.emit('status', this.statusInfo()); reject(new Error(err)); }
      };

      ws.on('open', () => {
        ws.send('CAP REQ :twitch.tv/tags twitch.tv/commands');
        ws.send('NICK justinfan' + (10000 + Math.floor(Math.random() * 80000)));
        ws.send('JOIN #' + channel);
      });
      ws.on('message', (data) => {
        for (const line of data.toString().split('\r\n')) {
          if (line) this._handle(line, () => finish(true));
        }
      });
      ws.on('close', () => {
        if (this.status !== 'disconnected') { this.status = 'disconnected'; this.emit('status', this.statusInfo()); }
      });
      ws.on('error', (e) => finish(false, e.message || 'Error de conexión con Twitch'));

      setTimeout(() => finish(false, 'Tiempo de espera agotado al conectar con Twitch'), 12000);
    });
  }

  _handle(line, onJoined) {
    const msg = parseIRC(line);
    switch (msg.command) {
      case 'PING':
        this.ws?.send('PONG :' + (msg.trailing || 'tmi.twitch.tv'));
        return;
      case '366': // fin de lista de nombres = ya unido al canal
      case 'JOIN':
        onJoined();
        return;
      case 'PRIVMSG': {
        const t = msg.tags;
        const u = this.user(nickOf(msg.prefix), t['display-name'], t);
        this.emit('event', { type: 'chat', user: u, comment: msg.trailing || '' });
        const bits = parseInt(t['bits'] || '0', 10);
        if (bits > 0) {
          this.emit('event', {
            type: 'gift', user: u, giftId: 'bits', giftName: 'Bits', giftIcon: null,
            count: bits, diamonds: bits, streaking: false, countable: true,
          });
        }
        return;
      }
      case 'USERNOTICE': {
        const t = msg.tags;
        const u = this.user(t['login'] || nickOf(msg.prefix), t['display-name'], t);
        const id = t['msg-id'];
        if (id === 'sub' || id === 'resub') {
          this.emit('event', { type: 'subscribe', user: u, months: parseInt(t['msg-param-cumulative-months'] || '0', 10) || null });
        } else if (id === 'subgift' || id === 'submysterygift' || id === 'anonsubgift') {
          this.emit('event', { type: 'subscribe', user: u });
        } else if (id === 'raid') {
          this.emit('event', { type: 'share', user: u });
        }
        // mensaje de resub (si trae texto) también al chat
        if ((id === 'resub' || id === 'sub') && msg.trailing) {
          this.emit('event', { type: 'chat', user: u, comment: msg.trailing });
        }
        return;
      }
      default:
        return;
    }
  }

  // Espectadores: Helix oficial si hay credenciales; si no, API pública.
  _startViewerPoll(channel) {
    const poll = async () => {
      try {
        if (helix.enabled) {
          const s = await helix.getStream(channel);
          this.streamInfo = s ? { title: s.title, game: s.game_name, startedAt: s.started_at } : null;
          this.emit('event', { type: 'viewers', count: s ? Number(s.viewer_count) || 0 : 0 });
        } else {
          const r = await fetch('https://decapi.me/twitch/viewercount/' + encodeURIComponent(channel));
          const n = parseInt((await r.text()).trim(), 10);
          if (Number.isFinite(n)) this.emit('event', { type: 'viewers', count: n });
        }
      } catch { /* ignorar */ }
    };
    poll();
    this._viewerTimer = setInterval(poll, 30000);
  }

  async disconnect() {
    if (this._viewerTimer) { clearInterval(this._viewerTimer); this._viewerTimer = null; }
    if (this._avatarTimer) { clearInterval(this._avatarTimer); this._avatarTimer = null; }
    const ws = this.ws;
    this.ws = null;
    if (ws) { try { ws.close(); } catch { /* ignore */ } }
    this.status = 'disconnected';
    this.emit('event', { type: 'viewers', count: 0 }); // limpia su aporte al total
    this.emit('status', this.statusInfo());
  }
}
