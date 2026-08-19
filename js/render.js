// render.js — dibujo 2D lateral premium: cintas metálicas, iconos Lucide,
// monedas glossy con su valor, tolva y cofre.

const Render = (() => {
  let canvas, ctx, W = 0, H = 0, dpr = 1, tick = 0;
  const floats = [], rings = [];
  let vaultPulse = 0;

  const STEEL = '#9fb2cc';
  const MINT = '#35e0a1';

  function init(cv) {
    canvas = cv;
    ctx = canvas.getContext('2d');
    // Precarga de iconos (se cachean como imágenes coloreadas).
    Icons.image('factory', STEEL, 2.2);
    Icons.image('vault', MINT, 2.2);
    for (const k in GAME.stations) { const s = GAME.stations[k]; Icons.image(s.ico, s.color, 2.2); }
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
    drawBackground();
    drawVault(m);
    for (const b of m.belts) drawBelt(b);
    drawHopper(m);
    for (const st of m.stations) drawStation(st);
    drawCoins();
    drawFx();
  }

  function drawBackground() {
    // rejilla de puntos muy sutil
    ctx.fillStyle = 'rgba(255,255,255,0.03)';
    const g = 26;
    for (let y = g; y < H; y += g) for (let x = g; x < W; x += g) {
      ctx.beginPath(); ctx.arc(x, y, 0.8, 0, Math.PI * 2); ctx.fill();
    }
  }

  function drawBelt(b) {
    const th = 12, x = b.x1, w = b.x2 - b.x1, y = b.y;
    // sombra
    ctx.fillStyle = 'rgba(0,0,0,0.28)';
    roundRect(x + 3, y - th / 2 + 5, w, th, 6); ctx.fill();
    // cuerpo metálico
    const grad = ctx.createLinearGradient(0, y - th / 2, 0, y + th / 2);
    grad.addColorStop(0, '#33404f'); grad.addColorStop(0.5, '#232e3b'); grad.addColorStop(1, '#161d27');
    roundRect(x, y - th / 2, w, th, 6); ctx.fillStyle = grad; ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.10)'; ctx.lineWidth = 1; ctx.stroke();
    // banda con muescas en movimiento
    ctx.save();
    roundRect(x, y - th / 2, w, th, 6); ctx.clip();
    ctx.strokeStyle = 'rgba(159,178,204,0.35)'; ctx.lineWidth = 2;
    const off = (tick * b.dir * 1.4) % 16;
    for (let sx = x - 16 + off; sx < x + w + 16; sx += 16) {
      ctx.beginPath(); ctx.moveTo(sx, y - th / 2 + 2); ctx.lineTo(sx - 5 * b.dir, y + th / 2 - 2); ctx.stroke();
    }
    ctx.restore();
    // rodillos
    roller(x, y); roller(x + w, y);
  }
  function roller(cx, cy) {
    const g = ctx.createRadialGradient(cx - 2, cy - 2, 1, cx, cy, 8);
    g.addColorStop(0, '#c7d3e4'); g.addColorStop(1, '#556274');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(cx, cy, 8, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.beginPath(); ctx.arc(cx, cy, 2.5, 0, Math.PI * 2); ctx.fill();
  }

  function drawHopper(m) {
    const h = m.hopper, w = 46, hh = 34;
    const x = h.x - w / 2, y = h.y - hh + 6;
    ctx.fillStyle = 'rgba(0,0,0,0.3)'; roundRect(x + 2, y + 3, w, hh, 8); ctx.fill();
    const g = ctx.createLinearGradient(0, y, 0, y + hh);
    g.addColorStop(0, '#2a3543'); g.addColorStop(1, '#1a222e');
    roundRect(x, y, w, hh, 8); ctx.fillStyle = g; ctx.fill();
    ctx.strokeStyle = 'rgba(159,178,204,0.35)'; ctx.lineWidth = 1.2; ctx.stroke();
    // chute inferior
    ctx.fillStyle = '#12181f';
    ctx.beginPath(); ctx.moveTo(h.x - 8, y + hh); ctx.lineTo(h.x + 8, y + hh);
    ctx.lineTo(h.x + 4, y + hh + 8); ctx.lineTo(h.x - 4, y + hh + 8); ctx.closePath(); ctx.fill();
    drawIcon('factory', STEEL, h.x, y + hh / 2, 22);
  }

  function drawStation(st) {
    const def = GAME.stations[st.type];
    const pulse = st.pulse || 0;
    const x = st.pos.x, y = st.pos.y;
    // soporte a la cinta
    ctx.strokeStyle = 'rgba(159,178,204,0.25)'; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.moveTo(x, y + 18); ctx.lineTo(x, y + 30); ctx.stroke();
    // glow de pulso
    if (pulse > 0.02) {
      ctx.globalAlpha = pulse * 0.5;
      ctx.fillStyle = def.color;
      ctx.beginPath(); ctx.arc(x, y, 30, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 1;
    }
    const s = 42 + pulse * 6;
    // chip mecánico
    ctx.fillStyle = 'rgba(0,0,0,0.3)'; roundRect(x - s / 2 + 2, y - s / 2 + 3, s, s, 12); ctx.fill();
    const g = ctx.createLinearGradient(0, y - s / 2, 0, y + s / 2);
    g.addColorStop(0, '#222c3a'); g.addColorStop(1, '#161d27');
    roundRect(x - s / 2, y - s / 2, s, s, 12); ctx.fillStyle = g; ctx.fill();
    ctx.strokeStyle = def.color; ctx.lineWidth = 2; ctx.globalAlpha = 0.85; ctx.stroke(); ctx.globalAlpha = 1;
    drawIcon(def.ico, def.color, x, y, 24);
    st.pulse = pulse * 0.86;
  }

  function drawCoins() {
    const coins = getCoins();
    for (const c of coins) {
      const t = GAME.coinTiers[Math.min(c.tier, GAME.coinTiers.length - 1)];
      const R = GAME.physics.coinR;
      const rot = c.x * 0.05;
      // sombra
      ctx.fillStyle = 'rgba(0,0,0,0.28)';
      ctx.beginPath(); ctx.ellipse(c.x, c.y + R * 0.75, R * 0.8, R * 0.32, 0, 0, Math.PI * 2); ctx.fill();
      // cuerpo
      const g = ctx.createRadialGradient(c.x - R * 0.35, c.y - R * 0.35, 1, c.x, c.y, R);
      g.addColorStop(0, t.glow); g.addColorStop(0.6, t.color); g.addColorStop(1, shade(t.color));
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(c.x, c.y, R, 0, Math.PI * 2); ctx.fill();
      // aro de canto (giro)
      ctx.strokeStyle = 'rgba(0,0,0,0.28)'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.ellipse(c.x, c.y, Math.max(1, R * 0.62 * Math.abs(Math.cos(rot))), R * 0.82, 0, 0, Math.PI * 2); ctx.stroke();
      ctx.strokeStyle = 'rgba(0,0,0,0.35)'; ctx.beginPath(); ctx.arc(c.x, c.y, R, 0, Math.PI * 2); ctx.stroke();
      // brillo
      ctx.fillStyle = 'rgba(255,255,255,0.4)';
      ctx.beginPath(); ctx.ellipse(c.x - R * 0.32, c.y - R * 0.4, R * 0.28, R * 0.16, -0.5, 0, Math.PI * 2); ctx.fill();
      // valor
      const label = formatNumber(c.value);
      ctx.font = '800 ' + (label.length > 4 ? 8 : 10) + 'px Sora, Inter, sans-serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(255,255,255,0.6)'; ctx.strokeText(label, c.x, c.y + 0.5);
      ctx.fillStyle = '#2a1c05'; ctx.fillText(label, c.x, c.y + 0.5);
    }
  }

  function drawVault(m) {
    const w = Math.min(150, m.W * 0.46), hh = 46 + vaultPulse * 6;
    const x = m.W / 2 - w / 2, y = m.vaultY - 10;
    if (vaultPulse > 0.02) {
      ctx.globalAlpha = vaultPulse * 0.4; ctx.fillStyle = MINT;
      roundRect(x - 8, y - 8, w + 16, hh + 16, 18); ctx.fill(); ctx.globalAlpha = 1;
    }
    ctx.fillStyle = 'rgba(0,0,0,0.35)'; roundRect(x + 2, y + 4, w, hh, 14); ctx.fill();
    const g = ctx.createLinearGradient(0, y, 0, y + hh);
    g.addColorStop(0, '#1e2b28'); g.addColorStop(1, '#141d1a');
    roundRect(x, y, w, hh, 14); ctx.fillStyle = g; ctx.fill();
    ctx.strokeStyle = 'rgba(53,224,161,0.6)'; ctx.lineWidth = 2; ctx.stroke();
    // ranura
    ctx.fillStyle = 'rgba(0,0,0,0.55)'; roundRect(m.W / 2 - 26, y + 7, 52, 5, 3); ctx.fill();
    drawIcon('vault', MINT, m.W / 2, y + hh / 2 + 6, 26);
    vaultPulse *= 0.86;
  }

  function drawFx() {
    for (let i = rings.length - 1; i >= 0; i--) {
      const r = rings[i]; r.r += 3; r.life -= 0.05;
      ctx.globalAlpha = Math.max(0, r.life);
      ctx.strokeStyle = MINT; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(r.x, r.y, r.r, 0, Math.PI * 2); ctx.stroke();
      if (r.life <= 0) rings.splice(i, 1);
    }
    ctx.globalAlpha = 1; ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
    ctx.font = '800 15px Sora, Inter, sans-serif';
    for (let i = floats.length - 1; i >= 0; i--) {
      const f = floats[i]; f.y -= 0.8; f.life -= 0.02;
      ctx.globalAlpha = Math.max(0, f.life);
      ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(0,0,0,0.55)'; ctx.strokeText(f.text, f.x, f.y);
      ctx.fillStyle = f.color; ctx.fillText(f.text, f.x, f.y);
      if (f.life <= 0) floats.splice(i, 1);
    }
    ctx.globalAlpha = 1;
  }

  // ---- helpers ----
  function drawIcon(name, color, cx, cy, s) {
    const img = Icons.image(name, color, 2.2);
    if (img && img.complete && img.naturalWidth) ctx.drawImage(img, cx - s / 2, cy - s / 2, s, s);
  }
  function roundRect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }
  function shade(hex) {
    const n = parseInt(hex.slice(1), 16);
    const r = Math.max(0, ((n >> 16) & 255) * 0.55) | 0;
    const g = Math.max(0, ((n >> 8) & 255) * 0.55) | 0;
    const b = Math.max(0, (n & 255) * 0.55) | 0;
    return 'rgb(' + r + ',' + g + ',' + b + ')';
  }

  return { init, resize, draw, size };
})();
