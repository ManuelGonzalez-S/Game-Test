// route.js — genera el recorrido 2D (serpiente) y coloca las estaciones.
// El estado guarda solo { tier, slots:[tipo...] }; la geometría se recalcula
// según el tamaño del canvas (para adaptarse a móvil/portátil y a resize).

const Route = (() => {
  let geo = null; // { points, cum, total, stationS, stations, spawn, vault }
  let lastW = 0, lastH = 0;

  // Elige tipos de estación para un tier (al menos un multiplicador).
  function randomSlots(tier) {
    const n = GAME.slotsForTier(tier);
    const pool = GAME.stationPool(tier);
    const slots = [];
    for (let i = 0; i < n; i++) slots.push(pool[(Math.random() * pool.length) | 0]);
    if (!slots.includes('mult')) slots[0] = 'mult';
    return slots;
  }

  // Construye la geometría serpenteante y coloca estaciones por longitud de arco.
  function buildGeometry(W, H, tier, slots) {
    const mx = 46, myTop = 70, myBot = 60;
    const rows = Math.max(2, Math.ceil((slots.length + 1) / 2));
    const rowGap = (H - myTop - myBot) / (rows - 1);
    const pts = [];
    for (let i = 0; i < rows; i++) {
      const y = myTop + i * rowGap;
      if (i % 2 === 0) { pts.push({ x: mx, y }); pts.push({ x: W - mx, y }); }
      else { pts.push({ x: W - mx, y }); pts.push({ x: mx, y }); }
    }
    // Longitudes acumuladas.
    const cum = [0];
    for (let i = 1; i < pts.length; i++) {
      cum.push(cum[i - 1] + Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y));
    }
    const total = cum[cum.length - 1];
    // Estaciones repartidas (evitando extremos).
    const stationS = [], stations = [];
    for (let i = 0; i < slots.length; i++) {
      const t = (i + 1) / (slots.length + 1);
      const s = t * total;
      stationS.push(s);
      stations.push({ type: slots[i], pos: pointAtLen(pts, cum, s), s, index: i });
    }
    return {
      points: pts, cum, total, stationS, stations,
      spawn: pts[0], vault: pts[pts.length - 1],
    };
  }

  // Punto (x,y) a distancia `s` a lo largo de la polilínea.
  function pointAtLen(pts, cum, s) {
    s = Math.max(0, Math.min(cum[cum.length - 1], s));
    let i = 1;
    while (i < cum.length && cum[i] < s) i++;
    const a = pts[i - 1], b = pts[i] || pts[i - 1];
    const segLen = (cum[i] || cum[i - 1]) - cum[i - 1] || 1;
    const f = (s - cum[i - 1]) / segLen;
    return { x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f };
  }

  function set(W, H) {
    lastW = W; lastH = H;
    if (!state.route) state.route = { tier: state.tier, slots: randomSlots(state.tier) };
    geo = buildGeometry(W, H, state.route.tier, state.route.slots);
  }
  function rebuild() { if (lastW && lastH) set(lastW, lastH); }
  function get() { return geo; }
  function pointAt(s) { return pointAtLen(geo.points, geo.cum, s); }
  function newForTier(tier) { state.route = { tier, slots: randomSlots(tier) }; }

  return { set, rebuild, get, pointAt, newForTier, randomSlots, buildGeometry };
})();
