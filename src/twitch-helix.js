// twitch-helix.js — cliente de la API oficial de Twitch (Helix).
// Nivel 1: token de app (client_credentials) para datos públicos:
// perfiles/avatares y estado del directo (viewers, título, juego, uptime).
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CONFIG_PATH = join(__dirname, '..', 'twitch.config.json');

class Helix {
  constructor() {
    this.clientId = null;
    this.clientSecret = null;
    this.redirectUri = 'http://localhost:4321/auth/twitch/callback';
    this.enabled = false;
    this._token = null;
    this._tokenExp = 0;
  }

  async load() {
    try {
      const cfg = JSON.parse(await readFile(CONFIG_PATH, 'utf8'));
      this.clientId = (cfg.clientId || '').trim() || null;
      this.clientSecret = (cfg.clientSecret || '').trim() || null;
      if (cfg.redirectUri) this.redirectUri = cfg.redirectUri;
      this.enabled = !!(this.clientId && this.clientSecret);
    } catch {
      this.enabled = false;
    }
    return this.enabled;
  }

  // Token de aplicación (sin login) para endpoints públicos.
  async appToken() {
    if (!this.enabled) return null;
    if (this._token && Date.now() < this._tokenExp - 60000) return this._token;
    const body = new URLSearchParams({
      client_id: this.clientId,
      client_secret: this.clientSecret,
      grant_type: 'client_credentials',
    });
    const r = await fetch('https://id.twitch.tv/oauth2/token', { method: 'POST', body });
    if (!r.ok) throw new Error('Twitch app token error ' + r.status);
    const j = await r.json();
    this._token = j.access_token;
    this._tokenExp = Date.now() + (j.expires_in * 1000);
    return this._token;
  }

  async get(path, params) {
    const token = await this.appToken();
    if (!token) return null;
    const url = 'https://api.twitch.tv/helix/' + path + (params ? '?' + params.toString() : '');
    const r = await fetch(url, { headers: { 'Client-Id': this.clientId, Authorization: 'Bearer ' + token } });
    if (!r.ok) return null;
    return r.json();
  }

  async getUsersById(ids) {
    if (!ids.length) return [];
    const p = new URLSearchParams();
    ids.slice(0, 100).forEach((id) => p.append('id', id));
    const j = await this.get('users', p);
    return j?.data || [];
  }

  async getUserByLogin(login) {
    const p = new URLSearchParams();
    p.append('login', login);
    const j = await this.get('users', p);
    return j?.data?.[0] || null;
  }

  async getStream(login) {
    const p = new URLSearchParams();
    p.append('user_login', login);
    const j = await this.get('streams', p);
    return j?.data?.[0] || null;
  }
}

export const helix = new Helix();
