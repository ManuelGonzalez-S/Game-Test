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

  function build(W, H, tier, slots, insetTop, insetBot) {
    // Pozo a pantalla completa: los márgenes dejan hueco al HUD flotante
    // (medido en tiempo real) para que tolva y cofre no queden tapados.
    const wallL = 14, wallR = W - 14;
    const top = Math.max(120, (insetTop || 0) + 22);
    const bot = Math.max(150, (insetBot || 0) + 30);
    const shaftW = wallR - wallL;
    const n = slots.length;
    const usable = H - top - bot;
    const rowGap = usable / (n + 1);
    const gapW = Math.min(shaftW * 0.30, 170);
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
      const tag = { x: gapRight ? wallL + 40 : wallR - 40, y: y - 34 };
      shelves.push({ index: i, y, x1, x2, dir, closedX, openX, mover, station: slots[i], tag });
      // Máquina de valor (gate) junto al borde abierto.
      const sx = gapRight ? x2 - 22 : x1 + 22;
      stations.push({ index: i, type: slots[i], shelf: i, pos: { x: sx, y: y - 30 } });
    }

    const s0 = shelves[0];
    return {
      shelves, stations, wallL, wallR, top, W, H,
      bankY: H - bot - 40,                               // cofre por encima del dock
      spawn: { x: s0.closedX + s0.dir * (gapW * 0.4), y: top + 18 }, // tolva bajo el HUD
    };
  }

  let lastTop = 0, lastBot = 0;
  function set(W, H, insetTop, insetBot) {
    lastW = W; lastH = H;
    if (insetTop != null) lastTop = insetTop;
    if (insetBot != null) lastBot = insetBot;
    if (!state.route) state.route = { tier: state.tier, slots: randomSlots(state.tier) };
    // Niveles de mejora por plataforma (propios de este tier).
    if (!Array.isArray(state.route.levels) || state.route.levels.length !== state.route.slots.length) {
      state.route.levels = new Array(state.route.slots.length).fill(0);
    }
    m = build(W, H, state.route.tier, state.route.slots, lastTop, lastBot);
  }
  function rebuild() { if (lastW && lastH) set(lastW, lastH); }
  function get() { return m; }
  function newForTier(tier) {
    const slots = randomSlots(tier);
    state.route = { tier, slots, levels: new Array(slots.length).fill(0) };
  }

  return { set, rebuild, get, newForTier, randomSlots, build };
})();
