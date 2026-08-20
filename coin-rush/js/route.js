// route.js — genera la "máquina" vista de lado: cintas transportadoras en zig-zag
// hacia abajo, con una estación por cinta. Las monedas caen y ruedan por ellas.

const Route = (() => {
  let m = null;               // máquina { belts, stations, hopper, vaultY, W, H }
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
    const mx = 30;
    const top = 56, bot = 66;
    const n = slots.length;
    const span = H - top - bot;
    const gap = span / n;
    const belts = [];
    for (let i = 0; i < n; i++) {
      const y = top + (i + 0.5) * gap + gap * 0.15;
      const dir = i % 2 === 0 ? 1 : -1; // par: derecha, impar: izquierda
      belts.push({ y, x1: mx, x2: W - mx, dir, speed: GAME.physics.beltSpeed });
    }
    // Una estación por cinta, colocada en la parte final del recorrido de esa cinta.
    const stations = [];
    for (let i = 0; i < n; i++) {
      const b = belts[i];
      const t = 0.58;
      const x = b.dir > 0 ? b.x1 + (b.x2 - b.x1) * t : b.x2 - (b.x2 - b.x1) * t;
      stations.push({ index: i, type: slots[i], belt: i, x, pos: { x, y: b.y - 30 } });
    }
    const hopper = { x: mx + 18, y: top - 20 };
    return { belts, stations, hopper, vaultY: H - bot + 22, W, H };
  }

  function set(W, H) {
    lastW = W; lastH = H;
    if (!state.route) state.route = { tier: state.tier, slots: randomSlots(state.tier) };
    m = build(W, H, state.route.tier, state.route.slots);
  }
  function rebuild() { if (lastW && lastH) set(lastW, lastH); }
  function get() { return m; }
  function newForTier(tier) { state.route = { tier, slots: randomSlots(tier) }; }

  return { set, rebuild, get, newForTier, randomSlots, build };
})();
