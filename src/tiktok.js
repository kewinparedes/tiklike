// tiktok.js — gestiona la conexión al TikTok LIVE y normaliza los eventos.
import { EventEmitter } from 'node:events';
import { TikTokLiveConnection, WebcastEvent, ControlEvent } from 'tiktok-live-connector';

// --- helpers para extraer campos del proto v3 de forma defensiva ---
function img(model) {
  return model?.urlList?.[0] || null;
}
// El catálogo extendido a veces usa snake_case (url_list).
function imgAny(model) {
  if (!model) return null;
  return model.urlList?.[0] || model.url_list?.[0] || null;
}
function handleOf(user) {
  return user?.uniqueId || user?.displayId || user?.nickname || 'anon';
}
function nameOf(user) {
  return user?.nickname || handleOf(user);
}
function avatarOf(user) {
  return img(user?.avatarThumb) || img(user?.avatarMedium) || img(user?.avatarLarge) || null;
}

export class TikTokManager extends EventEmitter {
  constructor() {
    super();
    this.platform = 'tiktok';
    this.conn = null;
    this.username = null;
    this.roomId = null;
    this.status = 'disconnected'; // disconnected | connecting | connected | error
    this.lastError = null;
    this.users = new Map(); // handle -> perfil enriquecido (acumulado en la sesión)
  }

  // Guarda/mezcla el perfil más completo visto de un usuario (los campos ricos
  // como followInfo/fansClub no vienen en todos los eventos).
  remember(u) {
    if (!u) return;
    const handle = handleOf(u);
    if (handle === 'anon') return;
    const m = { ...(this.users.get(handle) || { handle }) };
    const name = nameOf(u); if (name) m.name = name;
    const pic = avatarOf(u); if (pic) m.pic = pic;
    if (u.id) m.userId = u.id;
    if (u.secUid) m.secUid = u.secUid;
    if (u.verified) m.verified = true;
    if (u.payGrade?.level) m.level = u.payGrade.level;
    const fi = u.followInfo;
    if (fi) {
      if (fi.followerCount) m.followers = Number(fi.followerCount);
      if (fi.followingCount) m.following = Number(fi.followingCount);
      if (fi.followStatus !== undefined && fi.followStatus !== '') m.followStatus = Number(fi.followStatus);
    }
    const fc = u.fansClub?.data;
    if (fc && fc.clubName) { m.fansClubName = fc.clubName; m.fansClubLevel = fc.level || 0; }
    this.users.set(handle, m);
  }

  getUser(handle) {
    return this.users.get(String(handle || '').replace(/^@/, '')) || null;
  }

  async getUserDetail(handle) {
    return this.getUser(handle);
  }

  // ¿El usuario está transmitiendo ahora? (para auto-conexión)
  async isLive(rawUsername) {
    const username = String(rawUsername || '').replace(/^@/, '').trim();
    if (!username) return false;
    try {
      const probe = new TikTokLiveConnection(username, {});
      return await probe.fetchIsLive(username);
    } catch {
      return false;
    }
  }

  get availableGifts() {
    return this.conn?.availableGifts ?? null;
  }

  statusInfo() {
    return {
      platform: 'tiktok',
      status: this.status,
      username: this.username,
      roomId: this.roomId,
      lastError: this.lastError,
    };
  }

  user(u) {
    this.remember(u);
    return { handle: handleOf(u), name: nameOf(u), pic: avatarOf(u) };
  }

  async connect(rawUsername) {
    const username = String(rawUsername || '').replace(/^@/, '').trim();
    if (!username) throw new Error('Falta el nombre de usuario de TikTok');

    if (this.conn) await this.disconnect();

    this.username = username;
    this.roomId = null;
    this.lastError = null;
    this.users = new Map();
    this.status = 'connecting';
    this.emit('status', this.statusInfo());

    const conn = new TikTokLiveConnection(username, {});
    this.conn = conn;
    this._wire(conn);

    try {
      const state = await conn.connect();
      this.roomId = state?.roomId ?? null;
      this.status = 'connected';
      this.emit('status', this.statusInfo());
      return this.statusInfo();
    } catch (err) {
      this.status = 'error';
      this.lastError = friendlyError(err);
      this.conn = null;
      this.emit('status', this.statusInfo());
      throw new Error(this.lastError);
    }
  }

  async disconnect() {
    const conn = this.conn;
    this.conn = null;
    if (conn) {
      try { await conn.disconnect(); } catch { /* ignore */ }
    }
    this.status = 'disconnected';
    this.roomId = null;
    this.emit('event', { type: 'viewers', count: 0 }); // limpia su aporte al total
    this.emit('status', this.statusInfo());
  }

  _wire(conn) {
    conn.on(ControlEvent.CONNECTED, () => {
      this.status = 'connected';
      this.emit('status', this.statusInfo());
    });
    conn.on(ControlEvent.DISCONNECTED, () => {
      if (this.conn === conn) {
        this.status = 'disconnected';
        this.emit('status', this.statusInfo());
      }
    });
    conn.on(ControlEvent.ERROR, (err) => {
      this.lastError = friendlyError(err);
      this.emit('app-error', this.lastError);
    });

    conn.on(WebcastEvent.CHAT, (d) => {
      this.emit('event', {
        type: 'chat',
        user: this.user(d.user),
        comment: d.comment ?? d.content ?? '',
      });
    });

    conn.on(WebcastEvent.GIFT, (d) => {
      const g = d.gift || {};
      const count = d.repeatCount || 1;
      const streakable = g.type === 1;
      const streaking = streakable && d.repeatEnd !== 1; // racha en curso
      const diamonds = (g.diamondCount || 0) * count;
      const ext = d.extendedGiftInfo;
      this.emit('event', {
        type: 'gift',
        user: this.user(d.user),
        giftId: String(d.giftId ?? ''),
        giftName: g.name || ext?.name || 'Regalo',
        giftIcon: imgAny(ext?.image) || imgAny(ext?.icon) || img(g.image) || img(g.icon) || null,
        count,
        diamonds,
        streaking,
        countable: !streaking, // solo sumamos al total cuando termina la racha
      });
    });

    conn.on(WebcastEvent.LIKE, (d) => {
      this.emit('event', {
        type: 'like',
        user: this.user(d.user),
        count: d.count || 1,
        total: d.total != null ? Number(d.total) : null,
      });
    });

    conn.on(WebcastEvent.FOLLOW, (d) => {
      this.emit('event', { type: 'follow', user: this.user(d.user) });
    });

    conn.on(WebcastEvent.SHARE, (d) => {
      this.emit('event', { type: 'share', user: this.user(d.user) });
    });

    conn.on(WebcastEvent.MEMBER, (d) => {
      this.emit('event', { type: 'member', user: this.user(d.user) });
    });

    conn.on(WebcastEvent.SUB_NOTIFY, (d) => {
      this.emit('event', {
        type: 'subscribe',
        user: this.user(d.user),
        months: Number(d.subMonth ?? d.totalSubMonth ?? 0) || null,
      });
    });

    conn.on(WebcastEvent.ROOM_USER, (d) => {
      // `total` = espectadores ACTUALES (lo que TikTok muestra en pantalla).
      // `totalUser` = acumulado de todos los que han entrado (mucho mayor).
      const count = Number(d.total ?? d.viewerCount ?? 0);
      this.emit('event', { type: 'viewers', count });
    });

    conn.on(WebcastEvent.STREAM_END, () => {
      this.status = 'disconnected';
      this.lastError = 'El directo terminó';
      this.emit('status', this.statusInfo());
    });
  }
}

function friendlyError(err) {
  const msg = (err && (err.message || err.toString())) || 'Error desconocido';
  if (/offline|not.*live|UserOffline/i.test(msg)) {
    return 'El usuario no está en directo ahora mismo';
  }
  if (/not found|user_not_found|404/i.test(msg)) {
    return 'No se encontró ese usuario de TikTok';
  }
  return msg;
}
