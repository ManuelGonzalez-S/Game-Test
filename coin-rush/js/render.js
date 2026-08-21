// render.js — coin pusher: plataformas horizontales con máquinas de movimiento
// (cinta / ventilador / empujador), monedas 3D que giran, y cofre con pila.

const Render = (() => {
  let canvas, ctx, W = 0, H = 0, dpr = 1, tick = 0;
  const floats = [], rings = [], parts = [];
  let vaultPulse = 0, pile = 0;
  // Paleta "casino real": oro cálido, latón, madera, fieltro.
  const GOLD = '#e6c877', GOLD_HI = '#f6e6ac', BRASS = '#b98b3e', BRASS_DK = '#6e4f22';
  const WOOD = '#4a3320', WOOD_DK = '#2c1d10', FELT = '#0c2417', FELT_HI = '#134a2c';
  const STEEL = '#9fb2cc';

  function init(cv) {
    canvas = cv;
    ctx = canvas.getContext('2d');
    Icons.image('vault', GOLD, 2.2);
    for (const k in GAME.stations) { const s = GAME.stations[k]; Icons.image(s.ico, GOLD_HI, 2.4); }
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
      floats.push({ x: e.x, y: e.y, text: '+' + formatNumber(e.value), color: GOLD_HI, life: 1 });
      rings.push({ x: e.x, y: e.y, r: 8, life: 1 });
      vaultPulse = 1; pile = Math.min(1, pile + 0.12);
      // chispas doradas
      for (let i = 0; i < 4; i++) parts.push({
        x: e.x, y: e.y, vx: (Math.random() - 0.5) * 90, vy: -40 - Math.random() * 80,
        life: 1, decay: 0.03 + Math.random() * 0.02, size: 2 + Math.random() * 2,
        color: GAME.coinTiers[Math.min(e.tier, GAME.coinTiers.length - 1)].glow,
      });
      if (typeof Sound !== 'undefined') Sound.coin();
    }
    pile *= 0.985;
    while (typeof moverEvents !== 'undefined' && moverEvents.length) {
      const e = moverEvents.shift();
      if (typeof Sound !== 'undefined') Sound.sweep();
      for (let i = 0; i < 5; i++) parts.push({
        x: e.x + e.dir * 10, y: e.y - 8 - Math.random() * 8, vx: e.dir * (30 + Math.random() * 60), vy: -Math.random() * 40,
        life: 1, decay: 0.04 + Math.random() * 0.03, size: 1.5 + Math.random() * 1.5, color: 'rgba(180,190,210,0.9)',
      });
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
    for (const sh of m.shelves) drawShelf(m, sh);
    for (const st of m.stations) drawStation(st);
    drawDispenser(m);
    drawCoins();
    for (const sh of m.shelves) drawShelfTag(sh);
    drawFx();
  }

  // Etiqueta de mejora de cada plataforma ($precio · Nv), tipo máquina de arcade.
  function drawShelfTag(sh) {
    const lvl = shelfLevel(sh.index);
    const cost = shelfUpCost(sh.index);
    const afford = canBuyShelf(sh.index);
    const label = '$' + formatNumber(cost);
    ctx.font = '800 12px Sora, Inter, sans-serif';
    const tw = ctx.measureText(label).width;
    const padX = 8, h = 22, w = tw + padX * 2;
    const cx = sh.tag.x, cy = sh.tag.y;
    let x = cx - w / 2;
    x = Math.max(sh.x1, Math.min(sh.x2 - w, x)); // dentro de la plataforma
    const y = cy - h / 2;
    sh._tagRect = { x, y, w, h };                 // para el hit-test del tap
    // placa: latón encendido si es asequible, bronce apagado si no
    ctx.fillStyle = 'rgba(0,0,0,0.4)'; roundRect(x + 1.5, y + 2.5, w, h, 7); ctx.fill();
    const g = ctx.createLinearGradient(0, y, 0, y + h);
    if (afford) { g.addColorStop(0, GOLD_HI); g.addColorStop(0.5, GOLD); g.addColorStop(1, BRASS); }
    else { g.addColorStop(0, '#4a3a24'); g.addColorStop(1, '#2c2114'); }
    roundRect(x, y, w, h, 7); ctx.fillStyle = g; ctx.fill();
    ctx.strokeStyle = afford ? 'rgba(255,255,255,0.35)' : 'rgba(185,139,62,0.35)';
    ctx.lineWidth = 1.1; ctx.stroke();
    // precio grabado
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = afford ? '#3a2606' : '#8a7c62';
    ctx.fillText(label, x + w / 2, y + h / 2 + 0.5);
    // nivel (sello encima a la derecha)
    if (lvl > 0) {
      const lt = 'Nv.' + lvl;
      ctx.font = '800 9px Sora, Inter, sans-serif';
      const ltw = ctx.measureText(lt).width + 8;
      const lx = x + w - ltw / 2, ly = y - 5;
      ctx.fillStyle = WOOD; roundRect(lx - ltw / 2, ly - 8, ltw, 13, 6); ctx.fill();
      ctx.strokeStyle = BRASS; ctx.lineWidth = 1; roundRect(lx - ltw / 2, ly - 8, ltw, 13, 6); ctx.stroke();
      ctx.fillStyle = GOLD_HI; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(lt, lx, ly - 1.5);
    }
  }

  function drawShaft(m) {
    // Tapete de fieltro con luz cenital suave y viñeta.
    const g = ctx.createRadialGradient(W / 2, H * 0.28, 40, W / 2, H * 0.5, H * 0.85);
    g.addColorStop(0, FELT_HI); g.addColorStop(0.55, FELT); g.addColorStop(1, '#071a11');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    // Trama de fieltro (puntitos tenues).
    ctx.fillStyle = 'rgba(255,255,255,0.014)';
    for (let y = m.top - 20; y < m.bankY + 30; y += 9) {
      const off = (y / 9) % 2 ? 4.5 : 0;
      for (let x = m.wallL + off; x < m.wallR; x += 9) {
        ctx.beginPath(); ctx.arc(x, y, 0.7, 0, Math.PI * 2); ctx.fill();
      }
    }
    // Rieles laterales de madera con filo de latón.
    woodRail(m.wallL - 9, m.top - 24, 9, m.bankY - m.top + 50);
    woodRail(m.wallR, m.top - 24, 9, m.bankY - m.top + 50);
  }
  function woodRail(x, y, w, h) {
    const g = ctx.createLinearGradient(x, 0, x + w, 0);
    g.addColorStop(0, WOOD_DK); g.addColorStop(0.5, WOOD); g.addColorStop(1, WOOD_DK);
    roundRect(x, y, w, h, 4); ctx.fillStyle = g; ctx.fill();
    ctx.fillStyle = 'rgba(214,178,94,0.22)';
    roundRect(x + (w > 6 ? 1 : 0), y, 1.6, h, 1); ctx.fill();
  }

  function drawShelf(m, sh) {
    const th = 12, x = sh.x1, w = sh.x2 - sh.x1, y = sh.y;
    // sombra proyectada suave sobre el tapete
    ctx.fillStyle = 'rgba(0,0,0,0.28)'; roundRect(x + 3, y - th / 2 + 6, w, th, 5); ctx.fill();
    // cuerpo de acero cepillado
    const g = ctx.createLinearGradient(0, y - th / 2, 0, y + th / 2);
    g.addColorStop(0, '#5b6675'); g.addColorStop(0.5, '#39424e'); g.addColorStop(1, '#20262e');
    roundRect(x, y - th / 2, w, th, 5); ctx.fillStyle = g; ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.35)'; ctx.lineWidth = 1; ctx.stroke();
    // reflejo cepillado
    ctx.strokeStyle = 'rgba(255,255,255,0.14)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(x + 3, y - th / 2 + 2); ctx.lineTo(x + w - 3, y - th / 2 + 2); ctx.stroke();
    // tornillos en los extremos
    screw(x + 6, y); screw(x + w - 6, y);
    // reborde de latón en el extremo abierto (por donde caen)
    const lipX = sh.dir > 0 ? sh.x2 : sh.x1;
    const lg = ctx.createLinearGradient(0, y - th / 2 - 6, 0, y + 2);
    lg.addColorStop(0, GOLD); lg.addColorStop(1, BRASS_DK);
    ctx.fillStyle = lg; roundRect(lipX - 3, y - th / 2 - 6, 6, 9, 2); ctx.fill();
    drawMover(sh, x, y, w, th);
  }
  function screw(cx, cy) {
    ctx.fillStyle = 'rgba(0,0,0,0.4)'; ctx.beginPath(); ctx.arc(cx, cy, 2.1, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.18)'; ctx.lineWidth = 0.8;
    ctx.beginPath(); ctx.moveTo(cx - 1.4, cy); ctx.lineTo(cx + 1.4, cy); ctx.stroke();
  }

  function drawMover(sh, x, y, w, th) {
    const dir = sh.dir;
    if (sh.mover === 'belt') {
      // banda de goma oscura con nervaduras en movimiento
      ctx.save();
      roundRect(x, y - th / 2, w, th, 5); ctx.clip();
      const bg = ctx.createLinearGradient(0, y - th / 2, 0, y + th / 2);
      bg.addColorStop(0, '#2b2b30'); bg.addColorStop(0.5, '#161619'); bg.addColorStop(1, '#0c0c0e');
      ctx.fillStyle = bg; ctx.fillRect(x, y - th / 2, w, th);
      ctx.strokeStyle = 'rgba(0,0,0,0.55)'; ctx.lineWidth = 2;
      const off = (tick * dir * 1.4) % 14;
      for (let sx = x - 14 + off; sx < x + w + 14; sx += 14) {
        ctx.beginPath(); ctx.moveTo(sx, y - th / 2); ctx.lineTo(sx - 4 * dir, y + th / 2); ctx.stroke();
      }
      ctx.strokeStyle = 'rgba(230,200,119,0.10)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(x, y - th / 2 + 1.5); ctx.lineTo(x + w, y - th / 2 + 1.5); ctx.stroke();
      ctx.restore();
      roller(x, y); roller(x + w, y);
    } else if (sh.mover === 'fan') {
      const cx = dir > 0 ? x + 17 : x + w - 17;
      const cy = y - 17;
      // caja de latón
      const bg = ctx.createLinearGradient(0, cy - 13, 0, cy + 13);
      bg.addColorStop(0, BRASS); bg.addColorStop(1, BRASS_DK);
      ctx.fillStyle = bg; roundRect(cx - 13, cy - 13, 26, 26, 6); ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,0.4)'; ctx.lineWidth = 1.4; ctx.stroke();
      // aspas girando (metal claro)
      ctx.save(); ctx.translate(cx, cy); ctx.rotate(tick * 0.32 * dir);
      ctx.fillStyle = '#d7dbe2';
      for (let a = 0; a < 4; a++) {
        ctx.rotate(Math.PI / 2);
        ctx.beginPath(); ctx.ellipse(4, 0, 7, 3, 0, 0, Math.PI * 2); ctx.fill();
      }
      ctx.restore();
      ctx.fillStyle = GOLD; ctx.beginPath(); ctx.arc(cx, cy, 2.4, 0, Math.PI * 2); ctx.fill();
    } else if (sh.mover === 'pusher') {
      // Barra física con pistón: misma posición que el motor de físicas.
      const bar = pusherBar(sh);
      const barH = th + 24;
      const yTop = y - th / 2 - 18;
      const backX = bar.base, frontX = bar.frontX;
      const bx = Math.min(backX, frontX), bw = Math.abs(frontX - backX);
      // vástago (pistón metálico)
      const sg = ctx.createLinearGradient(0, y - th / 2 - 4, 0, y + 4);
      sg.addColorStop(0, '#8a8f98'); sg.addColorStop(1, '#3a3e45');
      ctx.fillStyle = sg; roundRect(bx, y - th / 2 - 4, bw, th + 4, 3); ctx.fill();
      // cabeza que empuja (acero con canto de latón)
      const hx = frontX - (dir > 0 ? 0 : 10);
      const hg = ctx.createLinearGradient(hx, 0, hx + 10, 0);
      hg.addColorStop(0, '#c6ccd6'); hg.addColorStop(1, '#6c727b');
      ctx.fillStyle = hg; roundRect(hx, yTop, 10, barH, 3); ctx.fill();
      ctx.fillStyle = bar.pushing ? GOLD : BRASS_DK;
      roundRect(dir > 0 ? hx + 8 : hx, yTop, 2, barH, 1); ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,0.35)'; ctx.lineWidth = 1; roundRect(hx, yTop, 10, barH, 3); ctx.stroke();
    }
    // placa con el tipo de máquina (grabada, bajo el extremo cerrado)
    const names = { belt: 'CINTA', fan: 'VENTILADOR', pusher: 'EMPUJADOR' };
    ctx.font = '700 8px Inter, sans-serif';
    ctx.textAlign = dir > 0 ? 'left' : 'right';
    ctx.textBaseline = 'top';
    ctx.fillStyle = 'rgba(230,200,119,0.42)';
    ctx.fillText(names[sh.mover] || '', dir > 0 ? x + 4 : x + w - 4, y + 9);
  }
  function roller(cx, cy) {
    const g = ctx.createRadialGradient(cx - 2, cy - 2, 1, cx, cy, 7.5);
    g.addColorStop(0, GOLD_HI); g.addColorStop(0.5, BRASS); g.addColorStop(1, BRASS_DK);
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, 7.5, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.4)'; ctx.lineWidth = 1; ctx.stroke();
    ctx.fillStyle = 'rgba(0,0,0,0.45)'; ctx.beginPath(); ctx.arc(cx, cy, 2.2, 0, Math.PI * 2); ctx.fill();
  }

  function drawStation(st) {
    const pulse = st.pulse || 0;
    const x = st.pos.x, y = st.pos.y;
    if (pulse > 0.02) {
      ctx.globalAlpha = pulse * 0.45; ctx.fillStyle = GOLD;
      ctx.beginPath(); ctx.arc(x, y, 24, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1;
    }
    const s = 34 + pulse * 6;
    ctx.fillStyle = 'rgba(0,0,0,0.35)'; roundRect(x - s / 2 + 2, y - s / 2 + 3, s, s, 10); ctx.fill();
    // ficha de cuero/madera oscura con bisel de latón
    const g = ctx.createLinearGradient(0, y - s / 2, 0, y + s / 2);
    g.addColorStop(0, '#2a2016'); g.addColorStop(1, '#160f09');
    roundRect(x - s / 2, y - s / 2, s, s, 10); ctx.fillStyle = g; ctx.fill();
    ctx.strokeStyle = BRASS; ctx.lineWidth = 1.6; ctx.stroke();
    ctx.strokeStyle = 'rgba(246,230,172,0.25)'; ctx.lineWidth = 1;
    roundRect(x - s / 2 + 2.5, y - s / 2 + 2.5, s - 5, s - 5, 8); ctx.stroke();
    drawIcon(GAME.stations[st.type].ico, GOLD_HI, x, y, 20);
    st.pulse = pulse * 0.86;
  }

  function drawDispenser(m) {
    const x = m.spawn.x, y = m.spawn.y, w = 48, hh = 30;
    ctx.fillStyle = 'rgba(0,0,0,0.35)'; roundRect(x - w / 2 + 2, y - hh + 5, w, hh, 8); ctx.fill();
    // tolva de latón
    const g = ctx.createLinearGradient(0, y - hh, 0, y);
    g.addColorStop(0, BRASS); g.addColorStop(0.6, '#8f6a2e'); g.addColorStop(1, BRASS_DK);
    roundRect(x - w / 2, y - hh, w, hh, 8); ctx.fillStyle = g; ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.4)'; ctx.lineWidth = 1.4; ctx.stroke();
    ctx.strokeStyle = 'rgba(246,230,172,0.3)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(x - w / 2 + 4, y - hh + 3); ctx.lineTo(x + w / 2 - 4, y - hh + 3); ctx.stroke();
    // boca de salida
    ctx.fillStyle = '#120c06';
    ctx.beginPath(); ctx.moveTo(x - 11, y); ctx.lineTo(x + 11, y);
    ctx.lineTo(x + 6, y + 9); ctx.lineTo(x - 6, y + 9); ctx.closePath(); ctx.fill();
    // moneditas decorativas dentro
    ctx.fillStyle = GAME.coinTiers[2].color;
    for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.arc(x - 8 + i * 8, y - hh / 2, 4, 0, Math.PI * 2); ctx.fill(); }
  }

  function drawVault(m) {
    const w = Math.min(200, m.W * 0.68), hh = 54 + vaultPulse * 5;
    const x = m.W / 2 - w / 2, y = m.bankY - 10;
    if (vaultPulse > 0.02) {
      ctx.globalAlpha = vaultPulse * 0.35; ctx.fillStyle = GOLD;
      roundRect(x - 8, y - 8, w + 16, hh + 16, 16); ctx.fill(); ctx.globalAlpha = 1;
    }
    // cofre de madera
    ctx.fillStyle = 'rgba(0,0,0,0.4)'; roundRect(x + 3, y + 5, w, hh, 12); ctx.fill();
    const g = ctx.createLinearGradient(0, y, 0, y + hh);
    g.addColorStop(0, WOOD); g.addColorStop(1, WOOD_DK);
    roundRect(x, y, w, hh, 12); ctx.fillStyle = g; ctx.fill();
    // herrajes de latón (bandas verticales + marco)
    ctx.strokeStyle = BRASS; ctx.lineWidth = 2; roundRect(x, y, w, hh, 12); ctx.stroke();
    ctx.fillStyle = 'rgba(185,139,62,0.55)';
    for (const bx of [x + w * 0.2, x + w * 0.8 - 4]) roundRect(bx, y + 2, 4, hh - 4, 2), ctx.fill();
    // pila de monedas creciente (oro/plata)
    const heap = 4 + Math.round(pile * 10);
    for (let i = 0; i < heap; i++) {
      const rx = m.W / 2 + (Math.sin(i * 2.3) * w * 0.34);
      const ry = y + hh - 9 - (i % 4) * 5;
      const t = i % 3 ? GAME.coinTiers[2] : GAME.coinTiers[1];
      ctx.fillStyle = t.color;
      ctx.beginPath(); ctx.ellipse(rx, ry, 6.5, 4, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.25)';
      ctx.beginPath(); ctx.ellipse(rx - 1.5, ry - 1, 2.4, 1.2, 0, 0, Math.PI * 2); ctx.fill();
    }
    // placa de latón con el icono del cofre
    drawIcon('vault', GOLD_HI, m.W / 2, y + 15, 22);
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
      // sombra de contacto suave, desplazada
      ctx.fillStyle = 'rgba(0,0,0,0.28)';
      ctx.beginPath(); ctx.ellipse(2, R * 1.02, R * 0.82, R * 0.2, 0, 0, Math.PI * 2); ctx.fill();
      // canto (grosor 3D con estrías y sombreado)
      if (off > 0.6) {
        const eg = ctx.createLinearGradient(-R, 0, R, 0);
        eg.addColorStop(0, shade(t.color, 0.35)); eg.addColorStop(0.5, shade(t.color, 0.62)); eg.addColorStop(1, shade(t.color, 0.32));
        ctx.fillStyle = eg;
        ctx.beginPath(); ctx.rect(-R, 0, 2 * R, off); ctx.fill();
        ctx.beginPath(); ctx.ellipse(0, off, R, ry, 0, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = 'rgba(0,0,0,0.28)'; ctx.lineWidth = 1;
        for (let x = -R + 3; x < R - 1; x += 4) { ctx.beginPath(); ctx.moveTo(x, 1); ctx.lineTo(x, off - 1); ctx.stroke(); }
      }
      // cara — metálico radial con luz cenital
      const g = ctx.createRadialGradient(-R * 0.32, -ry * 0.42, R * 0.12, 0, 0, R * 1.15);
      g.addColorStop(0, t.glow); g.addColorStop(0.42, t.color);
      g.addColorStop(0.82, shade(t.color, 0.78)); g.addColorStop(1, shade(t.color, 0.55));
      ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(0, 0, R, ry, 0, 0, Math.PI * 2); ctx.fill();
      // bisel exterior (aro grabado)
      ctx.lineWidth = 1.6; ctx.strokeStyle = shade(t.color, 0.42); ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,255,0.28)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.ellipse(0, 0, R * 0.82, ry * 0.82, 0, 0, Math.PI * 2); ctx.stroke();
      ctx.strokeStyle = 'rgba(0,0,0,0.14)';
      ctx.beginPath(); ctx.ellipse(0, 0, R * 0.66, ry * 0.66, 0, 0, Math.PI * 2); ctx.stroke();
      // brillo especular
      ctx.fillStyle = 'rgba(255,255,255,0.5)';
      ctx.beginPath(); ctx.ellipse(-R * 0.34, -ry * 0.42, R * 0.24, ry * 0.26, -0.5, 0, Math.PI * 2); ctx.fill();
      // valor acuñado (relieve)
      if (Math.abs(cosr) > 0.55) {
        const label = formatNumber(c.value);
        ctx.save(); ctx.scale(1, Math.abs(cosr));
        ctx.font = '800 ' + (label.length > 4 ? 8 : 10) + 'px Sora, Inter, sans-serif';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.globalAlpha = (Math.abs(cosr) - 0.55) / 0.45;
        ctx.fillStyle = 'rgba(255,255,255,0.4)'; ctx.fillText(label, 0, -0.8); // realce superior
        ctx.fillStyle = shade(t.color, 0.4); ctx.fillText(label, 0, 0);       // relieve grabado
        ctx.globalAlpha = 1; ctx.restore();
      }
      ctx.restore();
    }
  }

  function drawFx() {
    for (let i = parts.length - 1; i >= 0; i--) {
      const p = parts[i];
      p.vy += 240 * 0.016; p.x += p.vx * 0.016; p.y += p.vy * 0.016; p.life -= p.decay;
      ctx.globalAlpha = Math.max(0, p.life);
      ctx.fillStyle = p.color;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fill();
      if (p.life <= 0) parts.splice(i, 1);
    }
    ctx.globalAlpha = 1;
    for (let i = rings.length - 1; i >= 0; i--) {
      const r = rings[i]; r.r += 3; r.life -= 0.05;
      ctx.globalAlpha = Math.max(0, r.life); ctx.strokeStyle = GOLD; ctx.lineWidth = 2;
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
