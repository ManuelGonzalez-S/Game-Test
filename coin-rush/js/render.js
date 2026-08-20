// render.js — coin pusher: plataformas horizontales con máquinas de movimiento
// (cinta / ventilador / empujador), monedas 3D que giran, y cofre con pila.

const Render = (() => {
  let canvas, ctx, W = 0, H = 0, dpr = 1, tick = 0;
  const floats = [], rings = [];
  let vaultPulse = 0, pile = 0;
  const MINT = '#35e0a1', STEEL = '#9fb2cc';

  function init(cv) {
    canvas = cv;
    ctx = canvas.getContext('2d');
    Icons.image('vault', MINT, 2.2);
    for (const k in GAME.stations) { const s = GAME.stations[k]; Icons.image(s.ico, s.color, 2.4); }
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
      vaultPulse = 1; pile = Math.min(1, pile + 0.12);
    }
    pile *= 0.985;
  }

  function draw() {
    const m = Route.get();
    if (!m) return;
    tick++;
    consumeBankEvents();
    ctx.clearRect(0, 0, W, H);
    drawShaft(m);
    drawVault(m);
    for (const sh of m.shelves) drawShelf(m, sh);
    for (const st of m.stations) drawStation(st);
    drawDispenser(m);
    drawCoins();
    drawFx();
  }

  function drawShaft(m) {
    ctx.fillStyle = 'rgba(255,255,255,0.05)';
    roundRect(m.wallL - 6, m.top - 22, 6, m.bankY - m.top + 46, 3); ctx.fill();
    roundRect(m.wallR, m.top - 22, 6, m.bankY - m.top + 46, 3); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.022)';
    for (let y = m.top; y < m.bankY; y += 26) for (let x = m.wallL + 14; x < m.wallR; x += 26) {
      ctx.beginPath(); ctx.arc(x, y, 0.8, 0, Math.PI * 2); ctx.fill();
    }
  }

  function drawShelf(m, sh) {
    const th = 11, x = sh.x1, w = sh.x2 - sh.x1, y = sh.y;
    // sombra
    ctx.fillStyle = 'rgba(0,0,0,0.3)'; roundRect(x + 2, y - th / 2 + 4, w, th, 5); ctx.fill();
    // cuerpo
    const g = ctx.createLinearGradient(0, y - th / 2, 0, y + th / 2);
    g.addColorStop(0, '#3a4658'); g.addColorStop(0.5, '#28323f'); g.addColorStop(1, '#19212b');
    roundRect(x, y - th / 2, w, th, 5); ctx.fillStyle = g; ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.10)'; ctx.lineWidth = 1; ctx.stroke();
    // lip en el borde abierto
    const lipX = sh.dir > 0 ? sh.x2 : sh.x1;
    ctx.fillStyle = '#4a586b';
    roundRect(lipX - 3, y - th / 2 - 5, 6, 7, 2); ctx.fill();
    drawMover(sh, x, y, w, th);
  }

  function drawMover(sh, x, y, w, th) {
    const dir = sh.dir;
    if (sh.mover === 'belt') {
      // tread en movimiento sobre la superficie
      ctx.save();
      roundRect(x, y - th / 2, w, th, 5); ctx.clip();
      ctx.strokeStyle = 'rgba(159,178,204,0.5)'; ctx.lineWidth = 2.5;
      const off = (tick * dir * 1.6) % 16;
      for (let sx = x - 16 + off; sx < x + w + 16; sx += 16) {
        ctx.beginPath(); ctx.moveTo(sx, y - th / 2 + 2); ctx.lineTo(sx - 5 * dir, y + th / 2 - 2); ctx.stroke();
      }
      ctx.restore();
      roller(x, y); roller(x + w, y);
    } else if (sh.mover === 'fan') {
      const cx = dir > 0 ? x + 16 : x + w - 16;
      const cy = y - 16;
      // caja
      ctx.fillStyle = '#20293a'; roundRect(cx - 13, cy - 13, 26, 26, 6); ctx.fill();
      ctx.strokeStyle = 'rgba(53,224,161,0.5)'; ctx.lineWidth = 1.5; ctx.stroke();
      // aspas girando
      ctx.save(); ctx.translate(cx, cy); ctx.rotate(tick * 0.35 * dir);
      ctx.fillStyle = '#8fe3c8';
      for (let a = 0; a < 4; a++) {
        ctx.rotate(Math.PI / 2);
        ctx.beginPath(); ctx.ellipse(4, 0, 7, 3, 0, 0, Math.PI * 2); ctx.fill();
      }
      ctx.restore();
      ctx.fillStyle = '#1a2230'; ctx.beginPath(); ctx.arc(cx, cy, 2.5, 0, Math.PI * 2); ctx.fill();
    } else if (sh.mover === 'pusher') {
      const P = GAME.movers.pusher;
      const phase = (tick * 0.016 % P.period) / P.period;
      const ext = phase < 0.45 ? (phase / 0.45) : (1 - (phase - 0.45) / 0.55);
      const baseX = dir > 0 ? x : x + w;
      const bx = baseX + dir * (6 + ext * 26);
      ctx.fillStyle = '#c26b4a';
      roundRect(dir > 0 ? baseX - 4 : bx, y - th / 2 - 12, Math.abs(bx - baseX) + 8, th + 12, 3); ctx.fill();
      ctx.fillStyle = '#e08a5c'; roundRect(bx - (dir > 0 ? 0 : 8), y - th / 2 - 14, 8, th + 16, 3); ctx.fill();
    }
  }
  function roller(cx, cy) {
    const g = ctx.createRadialGradient(cx - 2, cy - 2, 1, cx, cy, 7);
    g.addColorStop(0, '#c7d3e4'); g.addColorStop(1, '#556274');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, 7, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(0,0,0,0.4)'; ctx.beginPath(); ctx.arc(cx, cy, 2.2, 0, Math.PI * 2); ctx.fill();
  }

  function drawStation(st) {
    const def = GAME.stations[st.type];
    const pulse = st.pulse || 0;
    const x = st.pos.x, y = st.pos.y;
    if (pulse > 0.02) {
      ctx.globalAlpha = pulse * 0.5; ctx.fillStyle = def.color;
      ctx.beginPath(); ctx.arc(x, y, 24, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1;
    }
    const s = 34 + pulse * 6;
    ctx.fillStyle = 'rgba(0,0,0,0.3)'; roundRect(x - s / 2 + 2, y - s / 2 + 3, s, s, 10); ctx.fill();
    const g = ctx.createLinearGradient(0, y - s / 2, 0, y + s / 2);
    g.addColorStop(0, '#222c3a'); g.addColorStop(1, '#161d27');
    roundRect(x - s / 2, y - s / 2, s, s, 10); ctx.fillStyle = g; ctx.fill();
    ctx.strokeStyle = def.color; ctx.lineWidth = 2; ctx.globalAlpha = 0.85; ctx.stroke(); ctx.globalAlpha = 1;
    drawIcon(def.ico, def.color, x, y, 20);
    st.pulse = pulse * 0.86;
  }

  function drawDispenser(m) {
    const x = m.spawn.x, y = m.spawn.y, w = 46, hh = 30;
    ctx.fillStyle = 'rgba(0,0,0,0.3)'; roundRect(x - w / 2 + 2, y - hh + 5, w, hh, 8); ctx.fill();
    const g = ctx.createLinearGradient(0, y - hh, 0, y);
    g.addColorStop(0, '#3a3f2a'); g.addColorStop(1, '#242a18');
    roundRect(x - w / 2, y - hh, w, hh, 8); ctx.fillStyle = g; ctx.fill();
    ctx.strokeStyle = 'rgba(255,198,75,0.5)'; ctx.lineWidth = 1.4; ctx.stroke();
    ctx.fillStyle = '#0e141b';
    ctx.beginPath(); ctx.moveTo(x - 10, y); ctx.lineTo(x + 10, y);
    ctx.lineTo(x + 6, y + 9); ctx.lineTo(x - 6, y + 9); ctx.closePath(); ctx.fill();
    // moneditas decorativas dentro
    ctx.fillStyle = GAME.coinTiers[0].color;
    for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.arc(x - 8 + i * 8, y - hh / 2, 4, 0, Math.PI * 2); ctx.fill(); }
  }

  function drawVault(m) {
    const w = Math.min(190, m.W * 0.66), hh = 52 + vaultPulse * 6;
    const x = m.W / 2 - w / 2, y = m.bankY - 8;
    if (vaultPulse > 0.02) {
      ctx.globalAlpha = vaultPulse * 0.4; ctx.fillStyle = MINT;
      roundRect(x - 8, y - 8, w + 16, hh + 16, 18); ctx.fill(); ctx.globalAlpha = 1;
    }
    ctx.fillStyle = 'rgba(0,0,0,0.35)'; roundRect(x + 2, y + 4, w, hh, 14); ctx.fill();
    const g = ctx.createLinearGradient(0, y, 0, y + hh);
    g.addColorStop(0, '#1e2b28'); g.addColorStop(1, '#141d1a');
    roundRect(x, y, w, hh, 14); ctx.fillStyle = g; ctx.fill();
    ctx.strokeStyle = 'rgba(53,224,161,0.6)'; ctx.lineWidth = 2; ctx.stroke();
    // pila de monedas creciente
    const heap = 3 + Math.round(pile * 9);
    for (let i = 0; i < heap; i++) {
      const rx = m.W / 2 + (Math.sin(i * 2.3) * w * 0.32);
      const ry = y + hh - 8 - (i % 4) * 5;
      ctx.fillStyle = i % 3 ? GAME.coinTiers[0].color : GAME.coinTiers[2].color;
      ctx.beginPath(); ctx.ellipse(rx, ry, 6, 4, 0, 0, Math.PI * 2); ctx.fill();
    }
    drawIcon('vault', MINT, m.W / 2, y + 16, 22);
    vaultPulse *= 0.86;
  }

  function drawCoins() {
    const coins = getCoins();
    const R = GAME.physics.coinR, T = GAME.physics.coinThick;
    for (const c of coins) {
      const t = GAME.coinTiers[Math.min(c.tier, GAME.coinTiers.length - 1)];
      const cosr = Math.cos(c.rot), sinr = Math.sin(c.rot);
      const ry = Math.max(1.2, R * Math.abs(cosr));
      const off = T * Math.abs(sinr) * 1.5;
      ctx.save(); ctx.translate(c.x, c.y);
      // sombra
      ctx.fillStyle = 'rgba(0,0,0,0.2)';
      ctx.beginPath(); ctx.ellipse(0, R * 0.98, R * 0.78, R * 0.18, 0, 0, Math.PI * 2); ctx.fill();
      // canto (3D)
      if (off > 0.6) {
        ctx.fillStyle = shade(t.color, 0.5);
        ctx.beginPath(); ctx.rect(-R, 0, 2 * R, off); ctx.fill();
        ctx.beginPath(); ctx.ellipse(0, off, R, ry, 0, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = 'rgba(0,0,0,0.25)'; ctx.lineWidth = 1;
        for (let x = -R + 3; x < R - 1; x += 5) { ctx.beginPath(); ctx.moveTo(x, 1); ctx.lineTo(x, off - 1); ctx.stroke(); }
      }
      // cara
      const g = ctx.createLinearGradient(-R, -ry, R, ry);
      g.addColorStop(0, t.glow); g.addColorStop(0.5, t.color); g.addColorStop(1, shade(t.color, 0.8));
      ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(0, 0, R, ry, 0, 0, Math.PI * 2); ctx.fill();
      ctx.lineWidth = 1.5; ctx.strokeStyle = 'rgba(0,0,0,0.28)'; ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,255,0.22)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.ellipse(0, 0, R * 0.68, ry * 0.68, 0, 0, Math.PI * 2); ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.4)';
      ctx.beginPath(); ctx.ellipse(-R * 0.3, -ry * 0.4, R * 0.26, ry * 0.3, -0.5, 0, Math.PI * 2); ctx.fill();
      // valor
      if (Math.abs(cosr) > 0.55) {
        const label = formatNumber(c.value);
        ctx.save(); ctx.scale(1, Math.abs(cosr));
        ctx.font = '800 ' + (label.length > 4 ? 8 : 10) + 'px Sora, Inter, sans-serif';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.globalAlpha = (Math.abs(cosr) - 0.55) / 0.45;
        ctx.lineWidth = 2.5; ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.strokeText(label, 0, 0);
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
  function drawIcon(name, color, cx, cy, s) {
    const img = Icons.image(name, color, 2.4);
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
  function shade(hex, f) {
    f = f == null ? 0.55 : f;
    const n = parseInt(hex.slice(1), 16);
    const r = (((n >> 16) & 255) * f) | 0, g = (((n >> 8) & 255) * f) | 0, b = ((n & 255) * f) | 0;
    return 'rgb(' + r + ',' + g + ',' + b + ')';
  }

  return { init, resize, draw, size };
})();
