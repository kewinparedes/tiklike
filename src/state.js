// state.js — contadores de la sesión en memoria (sin base de datos).
function emptyCounters() {
  return {
    viewers: 0,    // espectadores actuales
    likes: 0,      // likes totales del directo
    followers: 0,  // nuevos seguidores en esta sesión
    gifts: 0,      // regalos recibidos (completados)
    diamonds: 0,   // monedas/diamantes totales
    shares: 0,     // veces compartido
    joins: 0,      // entradas a la sala
  };
}

class Stats {
  constructor() {
    this.counters = emptyCounters();
    this._gifters = new Map(); // platform:handle -> { handle, name, pic, platform, diamonds, gifts }
    this._likers = new Map();  // platform:handle -> { handle, name, pic, platform, likes }
    this._viewers = {};        // por plataforma -> espectadores actuales (se suman)
    this.startedAt = null;
  }

  reset() {
    this.counters = emptyCounters();
    this._gifters = new Map();
    this._likers = new Map();
    this._viewers = {};
    this.startedAt = Date.now();
  }

  // Aplica un evento normalizado y devuelve true si cambiaron los contadores/tops.
  apply(ev) {
    const c = this.counters;
    switch (ev.type) {
      case 'gift':
        if (!ev.countable) return false; // racha en progreso, aún no se cuenta
        c.gifts += 1;
        c.diamonds += ev.diamonds || 0;
        this._trackGifter(ev);
        return true;
      case 'like':
        if (ev.total != null) c.likes = Math.max(c.likes, Number(ev.total) || 0);
        else c.likes += ev.count || 1;
        this._trackLiker(ev);
        return true;
      case 'follow':
        c.followers += 1;
        return true;
      case 'share':
        c.shares += 1;
        return true;
      case 'member':
        c.joins += 1;
        return true;
      case 'viewers':
        // cada plataforma reporta sus espectadores; el total es la suma.
        this._viewers[ev.platform || 'default'] = ev.count || 0;
        c.viewers = Object.values(this._viewers).reduce((a, b) => a + b, 0);
        return true;
      default:
        return false;
    }
  }

  _trackGifter(ev) {
    const handle = ev.user?.handle || 'anon';
    const key = (ev.platform || '?') + ':' + handle;
    const prev = this._gifters.get(key) || { handle, name: ev.user?.name || handle, pic: ev.user?.pic || null, platform: ev.platform, diamonds: 0, gifts: 0 };
    prev.diamonds += ev.diamonds || 0;
    prev.gifts += 1;
    if (ev.user?.pic) prev.pic = ev.user.pic;
    this._gifters.set(key, prev);
  }

  _trackLiker(ev) {
    const handle = ev.user?.handle || 'anon';
    if (handle === 'anon') return;
    const key = (ev.platform || '?') + ':' + handle;
    const prev = this._likers.get(key) || { handle, name: ev.user?.name || handle, pic: ev.user?.pic || null, platform: ev.platform, likes: 0 };
    prev.likes += ev.count || 1;
    if (ev.user?.pic) prev.pic = ev.user.pic;
    this._likers.set(key, prev);
  }

  topGifts(n = 5) {
    return [...this._gifters.values()].sort((a, b) => b.diamonds - a.diamonds).slice(0, n);
  }

  topLikes(n = 5) {
    return [...this._likers.values()].sort((a, b) => b.likes - a.likes).slice(0, n);
  }

  // Actividad de un usuario concreto en esta sesión (por plataforma).
  userActivity(handle, platform) {
    const key = (platform || '?') + ':' + handle;
    const g = this._gifters.get(key);
    const l = this._likers.get(key);
    return { diamonds: g?.diamonds || 0, gifts: g?.gifts || 0, likes: l?.likes || 0 };
  }

  snapshot() {
    return {
      counters: { ...this.counters },
      top: {
        gifts: this.topGifts(5),
        likes: this.topLikes(5),
      },
      viewersByPlatform: { ...this._viewers },
      startedAt: this.startedAt,
    };
  }
}

export const stats = new Stats();
