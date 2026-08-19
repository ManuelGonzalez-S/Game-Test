// render.js — dibujo 2D en canvas del recorrido, estaciones y monedas.

const Render = (() => {
  let canvas, ctx, W = 0, H = 0, dpr = 1;
  const floats = [];   // textos flotantes "+valor" en el cofre
  const rings = [];    // ondas al banquear
  let vaultPulse = 0;

  function init(cv) {
    canvas = cv;
    ctx = canvas.getContext('2d');
    resize();
    // Re-mide cuando el layout del canvas cambie (arranque, rotación, resize).
    if (window.ResizeObserver) {
      const ro = new ResizeObserver(() => resize());
      ro.observe(canvas);
    }
  }
  function resize() {
    const r = canvas.getBoundingClientRect();
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = Math.max(200, r.width);
    H = Math.max(200, r.height);
    canvas.width = Math.floor(W * dpr);
    canvas.height = Math.floor(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    Route.set(W, H);
  }
  function size() { return { W, H }; }

  function consumeBankEvents() {
    while (bankEvents.length) {
      const e = bankEvents.shift();
      floats.push({ x: e.x + (Math.random() - 0.5) * 24, y: e.y - 14, text: '+' + formatNumber(e.value), color: GAME.coinTiers[e.tier].glow, life: 1 });
      rings.push({ x: e.x, y: e.y, r: 10, life: 1 });
      vaultPulse = 1;
    }
  }

  function draw() {
    const geo = Route.get();
    if (!geo) return;
    consumeBankEvents();
    ctx.clearRect(0, 0, W, H);

    drawTrack(geo);
    drawEndpoints(geo);
    drawStations(geo);
    drawCoins(geo);
    drawFx();
  }

  function drawTrack(geo) {
    const p = geo.points;
    // Carril exterior
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    ctx.strokeStyle = 'rgba(255,255,255,0.06)';
    ctx.lineWidth = 22;
    strokePath(p);
    // Carril interior
    ctx.strokeStyle = 'rgba(124,196,255,0.18)';
    ctx.lineWidth = 12;
    strokePath(p);
    ctx.strokeStyle = 'rgba(124,196,255,0.35)';
    ctx.lineWidth = 2;
    strokePath(p);
  }
  function strokePath(p) {
    ctx.beginPath();
    ctx.moveTo(p[0].x, p[0].y);
    for (let i = 1; i < p.length; i++) ctx.lineTo(p[i].x, p[i].y);
    ctx.stroke();
  }

  function drawEndpoints(geo) {
    // Generador
    disc(geo.spawn.x, geo.spawn.y, 20, '#1a2a44', 'rgba(124,196,255,0.6)');
    emoji('🛠️', geo.spawn.x, geo.spawn.y, 20);
    // Cofre (con pulso)
    const vs = 24 + vaultPulse * 8;
    disc(geo.vault.x, geo.vault.y, vs, '#243a24', 'rgba(88,224,138,0.8)');
    emoji('🧰', geo.vault.x, geo.vault.y, 22);
    vaultPulse *= 0.86;
  }

  function drawStations(geo) {
    for (const st of geo.stations) {
      const def = GAME.stations[st.type];
      const pulse = st.pulse || 0;
      const r = 19 + pulse * 7;
      disc(st.pos.x, st.pos.y, r, 'rgba(10,16,32,0.9)', def.color);
      emoji(def.emoji, st.pos.x, st.pos.y, 19);
      st.pulse = pulse * 0.85;
    }
  }

  function drawCoins() {
    const coins = getCoins();
    for (const c of coins) {
      const pos = Route.pointAt(c.s);
      const t = GAME.coinTiers[Math.min(c.tier, GAME.coinTiers.length - 1)];
      const rad = 7 + Math.min(4, c.tier);
      const g = ctx.createRadialGradient(pos.x - rad * 0.3, pos.y - rad * 0.3, 1, pos.x, pos.y, rad);
      g.addColorStop(0, t.glow);
      g.addColorStop(1, t.color);
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, rad, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,0.35)';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
  }

  function drawFx() {
    for (let i = rings.length - 1; i >= 0; i--) {
      const r = rings[i];
      r.r += 3; r.life -= 0.05;
      ctx.globalAlpha = Math.max(0, r.life);
      ctx.strokeStyle = 'rgba(88,224,138,0.9)';
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(r.x, r.y, r.r, 0, Math.PI * 2); ctx.stroke();
      if (r.life <= 0) rings.splice(i, 1);
    }
    ctx.globalAlpha = 1;
    ctx.textAlign = 'center';
    ctx.font = '700 14px -apple-system, sans-serif';
    for (let i = floats.length - 1; i >= 0; i--) {
      const f = floats[i];
      f.y -= 0.7; f.life -= 0.018;
      ctx.globalAlpha = Math.max(0, f.life);
      ctx.fillStyle = f.color;
      ctx.fillText(f.text, f.x, f.y);
      if (f.life <= 0) floats.splice(i, 1);
    }
    ctx.globalAlpha = 1;
  }

  // Helpers de dibujo
  function disc(x, y, r, fill, stroke) {
    ctx.fillStyle = fill;
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
    if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = 2.5; ctx.stroke(); }
  }
  function emoji(e, x, y, size) {
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = size + 'px -apple-system, sans-serif';
    ctx.fillText(e, x, y + 1);
  }

  return { init, resize, draw, size };
})();
