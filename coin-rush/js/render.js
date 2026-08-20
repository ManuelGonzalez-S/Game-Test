// render.js — vista vertical: conducto, rampas escalonadas, monedas 3D que
// giran al caer, y cofre al fondo. Física real (engine.js).

const Render = (() => {
  let canvas, ctx, W = 0, H = 0, dpr = 1, tick = 0;
  const floats = [], rings = [];
  let vaultPulse = 0;
  const MINT = '#35e0a1', STEEL = '#9fb2cc';

  function init(cv) {
    canvas = cv;
    ctx = canvas.getContext('2d');
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
    drawShaft(m);
    drawVault(m);
    for (const ramp of m.ramps) drawRamp(ramp);
    for (const st of m.stations) drawStation(st);
    drawDispenser(m);
    drawCoins();
    drawFx();
  }

  function drawShaft(m) {
    // rieles laterales
    const railW = 6;
    ctx.fillStyle = 'rgba(255,255,255,0.05)';
    roundRect(m.wallL - railW, m.top - 20, railW, m.bottomY - m.top + 40, 3); ctx.fill();
    roundRect(m.wallR, m.top - 20, railW, m.bottomY - m.top + 40, 3); ctx.fill();
    // puntos de fondo
    ctx.fillStyle = 'rgba(255,255,255,0.025)';
    for (let y = m.top; y < m.bottomY; y += 26) for (let x = m.wallL + 14; x < m.wallR; x += 26) {
      ctx.beginPath(); ctx.arc(x, y, 0.8, 0, Math.PI * 2); ctx.fill();
    }
  }

  function drawRamp(seg) {
    const th = 12;
    ctx.lineCap = 'round';
    // sombra
    ctx.strokeStyle = 'rgba(0,0,0,0.3)'; ctx.lineWidth = th + 2;
    line(seg.ax, seg.ay + 3, seg.bx, seg.by + 3);
    // cuerpo metálico
    const g = ctx.createLinearGradient(0, Math.min(seg.ay, seg.by) - th, 0, Math.max(seg.ay, seg.by) + th);
    g.addColorStop(0, '#3a4658'); g.addColorStop(0.5, '#28323f'); g.addColorStop(1, '#19212b');
    ctx.strokeStyle = g; ctx.lineWidth = th;
    line(seg.ax, seg.ay, seg.bx, seg.by);
    // brillo superior
    ctx.strokeStyle = 'rgba(255,255,255,0.14)'; ctx.lineWidth = 2;
    line(seg.ax, seg.ay - th / 2 + 2, seg.bx, seg.by - th / 2 + 2);
  }

  function drawStation(st) {
    const def = GAME.stations[st.type];
    const pulse = st.pulse || 0;
    const x = st.pos.x, y = st.pos.y - 22;
    ctx.strokeStyle = 'rgba(159,178,204,0.22)'; ctx.lineWidth = 2.5;
    line(x, y + 16, st.pos.x, st.pos.y);
    if (pulse > 0.02) {
      ctx.globalAlpha = pulse * 0.5; ctx.fillStyle = def.color;
      ctx.beginPath(); ctx.arc(x, y, 26, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1;
    }
    const s = 38 + pulse * 6;
    ctx.fillStyle = 'rgba(0,0,0,0.3)'; roundRect(x - s / 2 + 2, y - s / 2 + 3, s, s, 11); ctx.fill();
    const g = ctx.createLinearGradient(0, y - s / 2, 0, y + s / 2);
    g.addColorStop(0, '#222c3a'); g.addColorStop(1, '#161d27');
    roundRect(x - s / 2, y - s / 2, s, s, 11); ctx.fillStyle = g; ctx.fill();
    ctx.strokeStyle = def.color; ctx.lineWidth = 2; ctx.globalAlpha = 0.85; ctx.stroke(); ctx.globalAlpha = 1;
    drawIcon(def.ico, def.color, x, y, 22);
    st.pulse = pulse * 0.86;
  }

  function drawDispenser(m) {
    const x = m.spawn.x, y = m.spawn.y;
    // tubo
    const w = 40, hh = 30;
    ctx.fillStyle = 'rgba(0,0,0,0.3)'; roundRect(x - w / 2 + 2, y - hh + 5, w, hh, 8); ctx.fill();
    const g = ctx.createLinearGradient(0, y - hh, 0, y);
    g.addColorStop(0, '#2a3543'); g.addColorStop(1, '#1a222e');
    roundRect(x - w / 2, y - hh, w, hh, 8); ctx.fillStyle = g; ctx.fill();
    ctx.strokeStyle = 'rgba(159,178,204,0.35)'; ctx.lineWidth = 1.2; ctx.stroke();
    // boca
    ctx.fillStyle = '#0e141b';
    ctx.beginPath(); ctx.moveTo(x - 9, y); ctx.lineTo(x + 9, y);
    ctx.lineTo(x + 5, y + 8); ctx.lineTo(x - 5, y + 8); ctx.closePath(); ctx.fill();
    drawIcon('factory', STEEL, x, y - hh / 2, 20);
  }

  function drawVault(m) {
    const w = Math.min(180, m.W * 0.62), hh = 54 + vaultPulse * 6;
    const x = m.W / 2 - w / 2, y = m.bottomY - 16;
    if (vaultPulse > 0.02) {
      ctx.globalAlpha = vaultPulse * 0.4; ctx.fillStyle = MINT;
      roundRect(x - 8, y - 8, w + 16, hh + 16, 18); ctx.fill(); ctx.globalAlpha = 1;
    }
    ctx.fillStyle = 'rgba(0,0,0,0.35)'; roundRect(x + 2, y + 4, w, hh, 14); ctx.fill();
    const g = ctx.createLinearGradient(0, y, 0, y + hh);
    g.addColorStop(0, '#1e2b28'); g.addColorStop(1, '#141d1a');
    roundRect(x, y, w, hh, 14); ctx.fillStyle = g; ctx.fill();
    ctx.strokeStyle = 'rgba(53,224,161,0.6)'; ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = 'rgba(0,0,0,0.55)'; roundRect(m.W / 2 - 30, y + 8, 60, 5, 3); ctx.fill();
    drawIcon('vault', MINT, m.W / 2, y + hh / 2 + 6, 26);
    vaultPulse *= 0.86;
  }

  function drawCoins() {
    const coins = getCoins();
    const R = GAME.physics.coinR;
    for (const c of coins) {
      const t = GAME.coinTiers[Math.min(c.tier, GAME.coinTiers.length - 1)];
      const s = Math.abs(Math.cos(c.rot));
      const w = Math.max(0.16, s) * R;
      ctx.save();
      ctx.translate(c.x, c.y);
      // sombra suave
      ctx.fillStyle = 'rgba(0,0,0,0.22)';
      ctx.beginPath(); ctx.ellipse(0, R * 0.95, w * 0.85, R * 0.22, 0, 0, Math.PI * 2); ctx.fill();
      // canto (grosor 3D)
      ctx.fillStyle = shade(t.color);
      ctx.beginPath(); ctx.ellipse(0, R * 0.16, w, R, 0, 0, Math.PI * 2); ctx.fill();
      // cara
      const g = ctx.createLinearGradient(-w, -R, w, R);
      g.addColorStop(0, t.glow); g.addColorStop(1, t.color);
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.ellipse(0, 0, w, R, 0, 0, Math.PI * 2); ctx.fill();
      ctx.lineWidth = 1.5; ctx.strokeStyle = 'rgba(0,0,0,0.3)'; ctx.stroke();
      // valor en la cara
      if (s > 0.5) {
        const label = formatNumber(c.value);
        ctx.save(); ctx.scale(w / R, 1);
        ctx.font = '800 ' + (label.length > 4 ? 8 : 10) + 'px Sora, Inter, sans-serif';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.globalAlpha = (s - 0.5) / 0.5;
        ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(255,255,255,0.6)'; ctx.strokeText(label, 0, 0);
        ctx.fillStyle = '#2a1c05'; ctx.fillText(label, 0, 0);
        ctx.globalAlpha = 1; ctx.restore();
      }
      ctx.restore();
    }
  }

  function drawFx() {
    for (let i = rings.length - 1; i >= 0; i--) {
      const r = rings[i]; r.r += 3; r.life -= 0.05;
      ctx.globalAlpha = Math.max(0, r.life); ctx.strokeStyle = MINT; ctx.lineWidth = 2;
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

  // helpers
  function line(x1, y1, x2, y2) { ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); }
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
    const r = (((n >> 16) & 255) * 0.55) | 0, g = (((n >> 8) & 255) * 0.55) | 0, b = ((n & 255) * 0.55) | 0;
    return 'rgb(' + r + ',' + g + ',' + b + ')';
  }

  return { init, resize, draw, size };
})();
