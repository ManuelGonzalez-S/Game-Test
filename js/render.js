// render.js — dibujo 2D lateral: cintas, tolva, estaciones, monedas (con valor) y cofre.

const Render = (() => {
  let canvas, ctx, W = 0, H = 0, dpr = 1, tick = 0;
  const floats = [], rings = [];
  let vaultPulse = 0;

  function init(cv) {
    canvas = cv;
    ctx = canvas.getContext('2d');
    resize();
    if (window.ResizeObserver) new ResizeObserver(() => resize()).observe(canvas);
  }
  function resize() {
    const r = canvas.getBoundingClientRect();
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = Math.max(200, r.width); H = Math.max(200, r.height);
    canvas.width = Math.floor(W * dpr); canvas.height = Math.floor(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    Route.set(W, H);
  }
  function size() { return { W, H }; }

  function consumeBankEvents() {
    while (bankEvents.length) {
      const e = bankEvents.shift();
      floats.push({ x: e.x, y: e.y, text: '+' + formatNumber(e.value), color: GAME.coinTiers[e.tier].glow, life: 1 });
      rings.push({ x: e.x, y: e.y, r: 8, life: 1 });
      vaultPulse = 1;
    }
  }

  function draw() {
    const m = Route.get();
    if (!m) return;
    tick++;
    consumeBankEvents();
    ctx.clearRect(0, 0, W, H);
    drawVault(m);
    drawBelts(m);
    drawHopper(m);
    drawStations(m);
    drawCoins();
    drawFx();
  }

  function drawBelts(m) {
    for (const b of m.belts) {
      const th = 9;
      // cuerpo de la cinta
      roundRect(b.x1, b.y - th / 2, b.x2 - b.x1, th, 5);
      ctx.fillStyle = 'rgba(20,32,58,0.95)'; ctx.fill();
      ctx.strokeStyle = 'rgba(124,196,255,0.35)'; ctx.lineWidth = 1.5; ctx.stroke();
      // banda en movimiento (tread)
      ctx.save();
      ctx.beginPath(); ctx.rect(b.x1, b.y - th / 2, b.x2 - b.x1, th); ctx.clip();
      ctx.strokeStyle = 'rgba(124,196,255,0.5)'; ctx.lineWidth = 3;
      ctx.setLineDash([9, 11]);
      ctx.lineDashOffset = -(tick * b.dir * 1.6) % 20;
      ctx.beginPath(); ctx.moveTo(b.x1, b.y); ctx.lineTo(b.x2, b.y); ctx.stroke();
      ctx.restore();
      ctx.setLineDash([]);
      // rodillos en los extremos
      roller(b.x1, b.y); roller(b.x2, b.y);
    }
  }
  function roller(x, y) {
    ctx.fillStyle = '#7cc4ff';
    ctx.beginPath(); ctx.arc(x, y, 6, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.beginPath(); ctx.arc(x, y, 2.5, 0, Math.PI * 2); ctx.fill();
  }

  function drawHopper(m) {
    const h = m.hopper;
    ctx.fillStyle = '#1a2a44'; ctx.strokeStyle = 'rgba(124,196,255,0.6)'; ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(h.x - 22, h.y - 16); ctx.lineTo(h.x + 22, h.y - 16);
    ctx.lineTo(h.x + 8, h.y + 10); ctx.lineTo(h.x - 8, h.y + 10);
    ctx.closePath(); ctx.fill(); ctx.stroke();
    emoji('🪙', h.x, h.y - 4, 15);
  }

  function drawStations(m) {
    for (const st of m.stations) {
      const def = GAME.stations[st.type];
      const pulse = st.pulse || 0;
      const x = st.pos.x, y = st.pos.y;
      // poste hasta la cinta
      ctx.strokeStyle = 'rgba(255,255,255,0.12)'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(x, y + 14); ctx.lineTo(x, y + 30); ctx.stroke();
      const r = 17 + pulse * 6;
      disc(x, y, r, 'rgba(10,16,32,0.95)', def.color);
      emoji(def.emoji, x, y, 17);
      st.pulse = pulse * 0.85;
    }
  }

  function drawCoins() {
    const coins = getCoins();
    for (const c of coins) {
      const t = GAME.coinTiers[Math.min(c.tier, GAME.coinTiers.length - 1)];
      const R = GAME.physics.coinR;
      // cuerpo
      const g = ctx.createRadialGradient(c.x - R * 0.35, c.y - R * 0.35, 1, c.x, c.y, R);
      g.addColorStop(0, t.glow); g.addColorStop(1, t.color);
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(c.x, c.y, R, 0, Math.PI * 2); ctx.fill();
      ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(0,0,0,0.35)'; ctx.stroke();
      // valor
      const label = formatNumber(c.value);
      ctx.font = '800 ' + (label.length > 4 ? 8 : 10) + 'px -apple-system, sans-serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.lineWidth = 2.5; ctx.strokeStyle = 'rgba(255,255,255,0.55)';
      ctx.strokeText(label, c.x, c.y + 0.5);
      ctx.fillStyle = '#241a06';
      ctx.fillText(label, c.x, c.y + 0.5);
    }
  }

  function drawVault(m) {
    const w = Math.min(160, m.W * 0.5);
    const x = m.W / 2 - w / 2, y = m.vaultY - 6, hh = 40 + vaultPulse * 6;
    roundRect(x, y, w, hh, 12);
    ctx.fillStyle = '#1c2e1c'; ctx.fill();
    ctx.strokeStyle = 'rgba(88,224,138,0.8)'; ctx.lineWidth = 2.5; ctx.stroke();
    emoji('🧰', m.W / 2, y + hh / 2 + 2, 24);
    vaultPulse *= 0.86;
  }

  function drawFx() {
    for (let i = rings.length - 1; i >= 0; i--) {
      const r = rings[i]; r.r += 3; r.life -= 0.05;
      ctx.globalAlpha = Math.max(0, r.life);
      ctx.strokeStyle = 'rgba(88,224,138,0.9)'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(r.x, r.y, r.r, 0, Math.PI * 2); ctx.stroke();
      if (r.life <= 0) rings.splice(i, 1);
    }
    ctx.globalAlpha = 1; ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
    ctx.font = '800 15px -apple-system, sans-serif';
    for (let i = floats.length - 1; i >= 0; i--) {
      const f = floats[i]; f.y -= 0.8; f.life -= 0.02;
      ctx.globalAlpha = Math.max(0, f.life);
      ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(0,0,0,0.5)';
      ctx.strokeText(f.text, f.x, f.y);
      ctx.fillStyle = f.color; ctx.fillText(f.text, f.x, f.y);
      if (f.life <= 0) floats.splice(i, 1);
    }
    ctx.globalAlpha = 1;
  }

  // helpers
  function roundRect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }
  function disc(x, y, r, fill, stroke) {
    ctx.fillStyle = fill; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
    if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = 2.5; ctx.stroke(); }
  }
  function emoji(e, x, y, s) {
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = s + 'px -apple-system, sans-serif'; ctx.fillText(e, x, y + 1);
  }

  return { init, resize, draw, size };
})();
