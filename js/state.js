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

// Calcula y aplica el progreso offline. Devuelve las esporas ganadas.
function applyOfflineProgress() {
  const now = Date.now();
  const elapsedSec = Math.max(0, (now - (state.lastSeen || now)) / 1000);
  if (elapsedSec < 1) return 0;

  const capped = Math.min(elapsedSec, GAME_DATA.offlineCapSeconds);
  const perSec = passiveProduction();
  const gained = perSec * capped * GAME_DATA.offlineRate;

  if (gained > 0) {
    state.spores += gained;
    state.totalSpores += gained;
  }
  return gained;
}
