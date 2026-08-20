// route.js — "máquina" de caída vertical: rampas escalonadas alternas (izq/dcha)
// por las que las monedas caen y ruedan hasta el cofre. Física real (sin cintas).

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
    const wallL = 24, wallR = W - 24;
    const top = 74, bot = 96;
    const shaftW = wallR - wallL;
    const n = slots.length;
    const usable = H - top - bot;
    const rowGap = usable / (n + 1);
    const rampLen = shaftW * 0.6;
    const R = GAME.physics.coinR;
    // La caída de una rampa DEBE dejar holgura > 2R respecto a la siguiente,
    // o la moneda se encaja entre la punta de una y la superficie de la otra.
    const drop = Math.max(8, Math.min(rowGap * 0.3, rowGap - 2 * R - 12));

    const ramps = [], stations = [];
    for (let i = 0; i < n; i++) {
      const y = top + (i + 1) * rowGap;
      const left = i % 2 === 0;
      const ax = left ? wallL : wallR;
      const bx = left ? wallL + rampLen : wallR - rampLen;
      const seg = { ax, ay: y, bx, by: y + drop, left, index: i, type: slots[i] };
      ramps.push(seg);
      const t = 0.5;
      stations.push({ index: i, type: slots[i], ramp: i,
        pos: { x: ax + (bx - ax) * t, y: y + drop * t } });
    }
    return {
      ramps, stations, wallL, wallR, top, W, H,
      bottomY: H - bot + 46,
      spawn: { x: wallL + shaftW * 0.2, y: top - 14 },
    };
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
