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

// ---- Árbol de Semillas (prestigio) ----
function treeHas(id) { return !!(state.tree && state.tree[id]); }
function treeNode(id) { return GAME_DATA.tree.find(n => n.id === id); }

// Multiplicador global de producción aportado por el árbol (multiplicativo).
function treeGlobalMult() {
  let m = 1;
  for (const n of GAME_DATA.tree) {
    if (!treeHas(n.id)) continue;
    if (n.prodMult) m *= n.prodMult;
    if (n.group && n.group.g === 'all') m *= n.group.mult;
  }
  return m;
}
// Multiplicador de grupo (base/mid/adv) para un generador concreto.
function treeGroupMult(genId) {
  const grp = generatorGroup(genId);
  let m = 1;
  for (const n of GAME_DATA.tree) {
    if (treeHas(n.id) && n.group && n.group.g === grp) m *= n.group.mult;
  }
  return m;
}
function treeClickMult() {
  let m = 1;
  for (const n of GAME_DATA.tree) if (treeHas(n.id) && n.clickMult) m *= n.clickMult;
  return m;
}
function treeClickCps() {
  let p = 0;
  for (const n of GAME_DATA.tree) if (treeHas(n.id) && n.clickCps) p += n.clickCps;
  return p;
}
function treeSeedGainMult() {
  let m = 1;
  for (const n of GAME_DATA.tree) if (treeHas(n.id) && n.seedGainMult) m *= n.seedGainMult;
  return m;
}
function effectiveOfflineRate() {
  let r = GAME_DATA.offlineRate;
  for (const n of GAME_DATA.tree) if (treeHas(n.id) && n.offlineRate) r = Math.max(r, n.offlineRate);
  return r;
}
function effectiveOfflineCap() {
  let c = GAME_DATA.offlineCapSeconds;
  for (const n of GAME_DATA.tree) if (treeHas(n.id) && n.offlineCap) c = Math.max(c, n.offlineCap);
  return c;
}

// Estado de un nodo del árbol: 'owned' | 'available' | 'locked' | 'expensive'.
function treeNodeState(node) {
  if (treeHas(node.id)) return 'owned';
  if (node.req && !treeHas(node.req)) return 'locked';
  if ((state.seeds || 0) < node.cost) return 'expensive';
  return 'available';
}
// Compra un nodo del árbol si procede. Devuelve true si se compró.
function buyTreeNode(id) {
  const node = treeNode(id);
  if (!node || treeNodeState(node) !== 'available') return false;
  state.seeds -= node.cost;
  state.tree[id] = true;
  return true;
}

// ---- Prestigio (Florecer) ----
// Semillas que se ganarían al florecer ahora (según esporas totales del run).
function pendingSeeds() {
  const p = GAME_DATA.prestige;
  const raw = Math.pow(Math.max(0, state.totalSpores) / p.seedScale, p.seedExponent);
  return Math.floor(raw * treeSeedGainMult());
}
function canFlorecer() {
  return pendingSeeds() >= GAME_DATA.prestige.minToFlorecer;
}
// Aplica el "head start" del árbol al empezar un nuevo mundo.
function applyHeadStart() {
  // Generadores iniciales (se toma el máximo aportado por los nodos).
  let baseN = 0, midN = 0;
  for (const n of GAME_DATA.tree) {
    if (!treeHas(n.id) || !n.startGen) continue;
    if (n.startGen.group === 'base') baseN = Math.max(baseN, n.startGen.n);
    if (n.startGen.group === 'mid') {
      midN = Math.max(midN, n.startGen.n);
      if (n.startGen.alsoBase) baseN = Math.max(baseN, n.startGen.alsoBase);
    }
  }
  for (const id of GAME_DATA.groups.base) state.generators[id] = baseN;
  for (const id of GAME_DATA.groups.mid) state.generators[id] = midN;
  // Mejoras iniciales.
  for (const n of GAME_DATA.tree) {
    if (treeHas(n.id) && n.startUpgrades) {
      for (const uid of n.startUpgrades) state.upgrades[uid] = true;
    }
  }
}
// Ejecuta el prestigio: suma semillas y reinicia el run. Devuelve semillas ganadas.
function florecer() {
  const gain = pendingSeeds();
  if (gain < GAME_DATA.prestige.minToFlorecer) return 0;
  state.seeds = (state.seeds || 0) + gain;
  state.totalSeeds = (state.totalSeeds || 0) + gain;
  state.floradas = (state.floradas || 0) + 1;
  // Reinicio del run (se conservan: semillas, árbol, floradas, logros, toques, sonido).
  state.spores = 0;
  state.totalSpores = 0;
  for (const g of GAME_DATA.generators) state.generators[g.id] = 0;
  state.upgrades = {};
  applyHeadStart();
  return gain;
}

// Producción de un generador (con milestones y sinergias de grupo del árbol).
function generatorOutput(gen) {
  const owned = state.generators[gen.id] || 0;
  return owned * gen.baseProd * milestoneMultiplier(owned) * treeGroupMult(gen.id);
}

// Producción pasiva total (esporas/seg).
function passiveProduction() {
  let total = 0;
  for (const g of GAME_DATA.generators) total += generatorOutput(g);
  return total * globalMultiplier() * treeGlobalMult();
}

// Esporas ganadas por un toque: base × multiplicadores + % de la producción/seg.
function clickValue() {
  let base = GAME_DATA.clickBase * treeClickMult();
  let pct = treeClickCps();
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
