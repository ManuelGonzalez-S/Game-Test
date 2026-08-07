// engine.js — lógica del juego: producción, toques, compras y game loop.

// ---- Milestones (bonus automático por cantidad) ----
// Cada umbral alcanzado dobla la producción de ese generador.
function milestoneMultiplier(owned) {
  let m = 1;
  for (const t of GAME_DATA.milestones) if (owned >= t) m *= 2;
  return m;
}
// Siguiente umbral aún no alcanzado (o null si ya se alcanzaron todos).
function nextMilestone(owned) {
  for (const t of GAME_DATA.milestones) if (owned < t) return t;
  return null;
}

// ---- Mejoras ----
function upgradeById(id) { return GAME_DATA.upgrades.find(u => u.id === id); }
function isPurchased(id) { return !!state.upgrades[id]; }

// ¿Se cumple la condición de desbloqueo de una mejora?
function upgradeUnlocked(u) {
  const c = u.unlock || {};
  if (c.clicks && state.totalClicks < c.clicks) return false;
  if (c.total && state.totalSpores < c.total) return false;
  if (c.gen && (state.generators[c.gen.id] || 0) < c.gen.n) return false;
  return true;
}

// Multiplicador global acumulado por las mejoras compradas.
function globalMultiplier() {
  let m = 1;
  for (const u of GAME_DATA.upgrades) {
    if (u.globalMult && isPurchased(u.id)) m *= u.globalMult;
  }
  return m;
}

// Producción de un generador concreto (con milestones), sin el global.
function generatorOutput(gen) {
  const owned = state.generators[gen.id] || 0;
  return owned * gen.baseProd * milestoneMultiplier(owned);
}

// ---- Prestigio (Florecer) ----
// Multiplicador permanente por Semillas Estelares.
function prestigeMultiplier() {
  return 1 + (state.seeds || 0) * GAME_DATA.prestige.bonusPerSeed;
}
// Semillas que se ganarían al florecer ahora (según esporas totales del run).
function pendingSeeds() {
  const p = GAME_DATA.prestige;
  return Math.floor(Math.pow(Math.max(0, state.totalSpores) / p.seedScale, p.seedExponent));
}
function canFlorecer() {
  return pendingSeeds() >= GAME_DATA.prestige.minToFlorecer;
}
// Ejecuta el prestigio: suma semillas y reinicia el run. Devuelve semillas ganadas.
function florecer() {
  const gain = pendingSeeds();
  if (gain < GAME_DATA.prestige.minToFlorecer) return 0;
  state.seeds = (state.seeds || 0) + gain;
  state.floradas = (state.floradas || 0) + 1;
  // Reinicio del run (se conservan: semillas, floradas, logros, toques totales, sonido).
  state.spores = 0;
  state.totalSpores = 0;
  for (const g of GAME_DATA.generators) state.generators[g.id] = 0;
  state.upgrades = {};
  return gain;
}

// Producción pasiva total (esporas/seg), con prestigio incluido.
function passiveProduction() {
  let total = 0;
  for (const g of GAME_DATA.generators) total += generatorOutput(g);
  return total * globalMultiplier() * prestigeMultiplier();
}

// Esporas ganadas por un toque: base × multiplicadores + % de la producción/seg.
function clickValue() {
  let base = GAME_DATA.clickBase * prestigeMultiplier();
  let pct = 0;
  for (const u of GAME_DATA.upgrades) {
    if (!isPurchased(u.id)) continue;
    if (u.clickMult) base *= u.clickMult;
    if (u.cpsPct) pct += u.cpsPct;
  }
  return base + passiveProduction() * pct;
}

// ---- Logros ----
// Comprueba todos los logros; devuelve un array de los recién desbloqueados.
function checkAchievements() {
  const newly = [];
  for (const a of GAME_DATA.achievements) {
    if (state.achievements[a.id]) continue;
    if (a.check(state)) {
      state.achievements[a.id] = true;
      newly.push(a);
    }
  }
  return newly;
}
function achievementsUnlockedCount() {
  let n = 0;
  for (const a of GAME_DATA.achievements) if (state.achievements[a.id]) n++;
  return n;
}

// Compra una mejora si procede. Devuelve true si se compró.
function buyUpgrade(id) {
  const u = upgradeById(id);
  if (!u || isPurchased(id) || !upgradeUnlocked(u)) return false;
  if (state.spores < u.cost) return false;
  state.spores -= u.cost;
  state.upgrades[id] = true;
  return true;
}

// Registra un toque en el planeta.
function doClick() {
  const value = clickValue();
  state.spores += value;
  state.totalSpores += value;
  state.totalClicks += 1;
  return value;
}

// ¿Puede permitirse comprar un generador?
function canAfford(genId) {
  const gen = GAME_DATA.generators.find(g => g.id === genId);
  if (!gen) return false;
  const owned = state.generators[genId] || 0;
  return state.spores >= generatorCost(gen, owned);
}

// Compra un generador si hay esporas suficientes. Devuelve true si compró.
function buyGenerator(genId) {
  const gen = GAME_DATA.generators.find(g => g.id === genId);
  if (!gen) return false;
  const owned = state.generators[genId] || 0;
  const cost = generatorCost(gen, owned);
  if (state.spores < cost) return false;
  state.spores -= cost;
  state.generators[genId] = owned + 1;
  return true;
}

// ---- Game loop (tick fijo + acumulador) ----
let _lastTick = null;
const TICK_MS = 100; // resolución de la lógica

// Avanza la simulación `dtSeconds` segundos (producción pasiva).
function step(dtSeconds) {
  const gained = passiveProduction() * dtSeconds;
  if (gained > 0) {
    state.spores += gained;
    state.totalSpores += gained;
  }
}

// Bucle principal: se llama vía requestAnimationFrame.
function gameLoop(timestamp) {
  if (_lastTick === null) _lastTick = timestamp;
  let elapsed = timestamp - _lastTick;

  // Evita saltos enormes si la pestaña estuvo en segundo plano.
  if (elapsed > 5000) elapsed = TICK_MS;

  if (elapsed >= TICK_MS) {
    step(elapsed / 1000);
    _lastTick = timestamp;
    UI.render();
  }

  requestAnimationFrame(gameLoop);
}
