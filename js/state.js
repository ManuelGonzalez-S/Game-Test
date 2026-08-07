// state.js — estado del juego + guardado/carga + progreso offline.

const SAVE_KEY = 'jardin-cosmico-save-v1';

// Estado por defecto (partida nueva).
function defaultState() {
  const generators = {};
  for (const g of GAME_DATA.generators) generators[g.id] = 0;
  return {
    spores: 0,          // esporas actuales
    totalSpores: 0,     // esporas producidas en total (para bloom/hitos)
    totalClicks: 0,     // toques totales
    generators,         // id -> cantidad
    upgrades: {},       // id -> true (mejoras compradas)
    seeds: 0,           // Semillas Estelares disponibles (se gastan en el árbol)
    totalSeeds: 0,      // semillas ganadas en total (para logros)
    tree: {},           // id de nodo -> true (nodos del árbol comprados)
    floradas: 0,        // nº de veces que has florecido
    achievements: {},   // id -> true (logros desbloqueados)
    lastSeen: Date.now(),
    soundEnabled: true, // sonido activado por defecto (arranca tras 1er toque)
    version: 1,
  };
}

let state = defaultState();

function saveGame() {
  try {
    state.lastSeen = Date.now();
    localStorage.setItem(SAVE_KEY, JSON.stringify(state));
    return true;
  } catch (e) {
    console.warn('No se pudo guardar:', e);
    return false;
  }
}

function loadGame() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return false;
    const parsed = JSON.parse(raw);
    // Fusiona con el estado por defecto por si añadimos campos nuevos.
    state = Object.assign(defaultState(), parsed);
    // Asegura que todos los generadores existen (por si añadimos nuevos).
    for (const g of GAME_DATA.generators) {
      if (typeof state.generators[g.id] !== 'number') state.generators[g.id] = 0;
    }
    if (!state.upgrades || typeof state.upgrades !== 'object') state.upgrades = {};
    if (!state.achievements || typeof state.achievements !== 'object') state.achievements = {};
    if (!state.tree || typeof state.tree !== 'object') state.tree = {};
    if (typeof state.seeds !== 'number') state.seeds = 0;
    if (typeof state.totalSeeds !== 'number') state.totalSeeds = state.seeds || 0;
    if (typeof state.floradas !== 'number') state.floradas = 0;
    return true;
  } catch (e) {
    console.warn('Guardado corrupto, empezando de cero:', e);
    state = defaultState();
    return false;
  }
}

function resetGame() {
  state = defaultState();
  saveGame();
}

// Calcula y aplica el progreso offline. Devuelve { gained, seconds }.
function applyOfflineProgress() {
  const now = Date.now();
  const elapsedSec = Math.max(0, (now - (state.lastSeen || now)) / 1000);
  if (elapsedSec < 1) return { gained: 0, seconds: 0 };

  const capped = Math.min(elapsedSec, effectiveOfflineCap());
  const perSec = passiveProduction();
  const gained = perSec * capped * effectiveOfflineRate();

  if (gained > 0) {
    state.spores += gained;
    state.totalSpores += gained;
  }
  return { gained, seconds: elapsedSec };
}

// Formatea una duración en segundos como "2h 15m", "45m", "30s".
function formatDuration(sec) {
  sec = Math.floor(sec);
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  if (h > 0) return h + 'h ' + m + 'm';
  if (m > 0) return m + 'm';
  return s + 's';
}
