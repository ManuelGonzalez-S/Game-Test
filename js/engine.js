// engine.js — lógica del juego: producción, toques, compras y game loop.

// Producción pasiva total (esporas/seg) sumando todos los generadores.
function passiveProduction() {
  let total = 0;
  for (const g of GAME_DATA.generators) {
    total += (state.generators[g.id] || 0) * g.baseProd;
  }
  return total;
}

// Esporas ganadas por un toque (por ahora, base fijo; escalará con mejoras).
function clickValue() {
  return GAME_DATA.clickBase;
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
