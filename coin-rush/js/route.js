// route.js — "coin pusher": plataformas HORIZONTALES con una máquina de movimiento
// (cinta / ventilador / empujador) en el extremo cerrado que empuja las monedas
// hacia el borde abierto (con hueco alterno), por donde caen a la de abajo.

const Route = (() => {
  let m = null;
  let lastW = 0, lastH = 0;

  function randomSlots(tier) {
    const n = GAME.slotsForTier(tier);
    const pool = GAME.stationPool(tier);
    const slots = [];
    for (let i = 0; i < n; i++) slots.push(pool[(Math.random() * pool.length) | 0]);
    if (!slots.includes('mult')) slots[0] = 'mult';
    return slots;
  }

  function build(W, H, tier, slots) {
    const wallL = 22, wallR = W - 22, top = 64, bot = 84;
    const shaftW = wallR - wallL;
    const n = slots.length;
    const usable = H - top - bot;
    const rowGap = usable / (n + 1);
    const gapW = Math.min(shaftW * 0.36, 150);
    const moverPool = GAME.moverPool(tier);

    const shelves = [], stations = [];
    for (let i = 0; i < n; i++) {
      const y = top + (i + 1) * rowGap;
      const gapRight = i % 2 === 0;
      const x1 = gapRight ? wallL : wallL + gapW;
      const x2 = gapRight ? wallR - gapW : wallR;
      const closedX = gapRight ? wallL : wallR;
      const openX = gapRight ? x2 : x1;
      const dir = gapRight ? 1 : -1;
      const mover = moverPool[i % moverPool.length];
      // Etiqueta de mejora de la plataforma (junto al extremo cerrado, sobre ella).
      const tag = { x: gapRight ? wallL + 30 : wallR - 30, y: y - 26 };
      shelves.push({ index: i, y, x1, x2, dir, closedX, openX, mover, station: slots[i], tag });
      // Máquina de valor (gate) junto al borde abierto.
      const sx = gapRight ? x2 - 16 : x1 + 16;
      stations.push({ index: i, type: slots[i], shelf: i, pos: { x: sx, y: y - 24 } });
    }

    const s0 = shelves[0];
    return {
      shelves, stations, wallL, wallR, top, W, H,
      bankY: H - bot + 40,
      spawn: { x: s0.closedX + s0.dir * (gapW * 0.4), y: top - 12 },
    };
  }

  function set(W, H) {
    lastW = W; lastH = H;
    if (!state.route) state.route = { tier: state.tier, slots: randomSlots(state.tier) };
    // Niveles de mejora por plataforma (propios de este tier).
    if (!Array.isArray(state.route.levels) || state.route.levels.length !== state.route.slots.length) {
      state.route.levels = new Array(state.route.slots.length).fill(0);
    }
    m = build(W, H, state.route.tier, state.route.slots);
  }
  function rebuild() { if (lastW && lastH) set(lastW, lastH); }
  function get() { return m; }
  function newForTier(tier) {
    const slots = randomSlots(tier);
    state.route = { tier, slots, levels: new Array(slots.length).fill(0) };
  }

  return { set, rebuild, get, newForTier, randomSlots, build };
})();
