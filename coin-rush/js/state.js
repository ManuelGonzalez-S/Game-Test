// state.js — estado del juego, guardado/carga, export/import y progreso offline.

const SAVE_KEY = 'coin-rush-save-v1';

function defaultState() {
  return {
    money: 0,
    diamonds: 0,
    tier: 1,
    bankedThisTier: 0,   // dinero banqueado en este tier (meta de ascenso)
    totalBanked: 0,      // total histórico
    route: null,         // { tier, slots:[...], levels:[...] } (geometría se recalcula)
    skills: {},          // id -> true
    rate: 0,             // EMA de dinero/seg (para offline)
    lastSeen: Date.now(),
    soundEnabled: false, // el usuario lo activa (evita autoplay molesto)
    version: 1,
  };
}

let state = defaultState();

function normalizeState() {
  const d = defaultState();
  for (const k in d) if (!(k in state)) state[k] = d[k];
  if (!state.skills || typeof state.skills !== 'object') state.skills = {};
  // Limpia campos de versiones anteriores (mejoras globales / cambios de estación).
  delete state.tracks; delete state.swapsUsed; delete state.boardLevel;
  return state;
}

function saveGame() {
  try {
    state.lastSeen = Date.now();
    localStorage.setItem(SAVE_KEY, JSON.stringify(state));
    return true;
  } catch (e) { console.warn('No se pudo guardar:', e); return false; }
}

function loadGame() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return false;
    state = Object.assign(defaultState(), JSON.parse(raw));
    normalizeState();
    return true;
  } catch (e) {
    console.warn('Guardado corrupto, empezando de cero:', e);
    state = defaultState();
    return false;
  }
}

function resetGame() { state = defaultState(); saveGame(); }

// ---- Copia de seguridad ----
function exportSave() {
  saveGame();
  return btoa(unescape(encodeURIComponent(localStorage.getItem(SAVE_KEY) || JSON.stringify(state))));
}
function importSave(code) {
  try {
    const raw = decodeURIComponent(escape(atob((code || '').trim())));
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || typeof parsed.money !== 'number') return false;
    localStorage.setItem(SAVE_KEY, raw);
    loadGame();
    saveGame();
    return true;
  } catch (e) { return false; }
}

// ---- Progreso offline (aproximado por la tasa reciente) ----
function applyOfflineProgress() {
  const now = Date.now();
  const sec = Math.max(0, (now - (state.lastSeen || now)) / 1000);
  if (sec < 5 || !state.skills.off || state.rate <= 0) return { gained: 0, seconds: sec };
  const capped = Math.min(sec, 8 * 3600);
  const gained = state.rate * capped * 0.5;
  if (gained > 0) {
    state.money += gained;
    state.bankedThisTier += gained;
    state.totalBanked += gained;
  }
  return { gained, seconds: sec };
}

function formatDuration(sec) {
  sec = Math.floor(sec);
  const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60);
  if (h > 0) return h + 'h ' + m + 'm';
  if (m > 0) return m + 'm';
  return sec + 's';
}
