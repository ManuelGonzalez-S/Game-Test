// particles.js — sistema de partículas en canvas para el feedback jugoso.
// Ráfaga al tocar, anillo de onda, motas ambientales según la vida del planeta
// y explosión de celebración al subir de era. Con tope y auto-parada.

const Particles = (() => {
  let canvas, ctx;
  let w = 0, h = 0, dpr = 1;
  let parts = [];
  let running = false;
  let life = 0;
  let reduced = false;

  const MAX = 160;
  const PALETTE = ['#58e08a', '#7cf0c0', '#a8e063', '#4fd1c5', '#c6f68d'];
  const GOLD = ['#ffd66b', '#ffe9a8', '#fff3c4'];

  function init() {
    canvas = document.getElementById('particles');
    ctx = canvas.getContext('2d');
    reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    resize();
    window.addEventListener('resize', resize);
  }

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = window.innerWidth;
    h = window.innerHeight;
    canvas.width = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function setLife(v) {
    life = Math.max(0, Math.min(1, v));
    if (life > 0.3) start();
  }

  function push(p) {
    if (parts.length < MAX) parts.push(p);
  }

  function rand(a, b) { return a + Math.random() * (b - a); }
  function pick(arr) { return arr[(Math.random() * arr.length) | 0]; }

  // Partícula genérica.
  function make(x, y, vx, vy, opts = {}) {
    return {
      x, y, vx, vy,
      g: opts.g ?? 0.05,          // gravedad
      drag: opts.drag ?? 0.985,
      size: opts.size ?? rand(2.5, 5),
      color: opts.color ?? pick(PALETTE),
      life: 1,
      decay: opts.decay ?? rand(0.012, 0.02),
      kind: opts.kind ?? 'dot',
      rot: rand(0, Math.PI * 2),
      vr: rand(-0.15, 0.15),
      r: opts.r ?? 0,             // para anillos
      vrr: opts.vrr ?? 0,         // crecimiento del anillo
    };
  }

  // Centro del planeta en coordenadas de pantalla.
  function planetCenter() {
    const el = document.getElementById('planet');
    if (!el) return { cx: w / 2, cy: h / 2, r: 100 };
    const b = el.getBoundingClientRect();
    return { cx: b.left + b.width / 2, cy: b.top + b.height / 2, r: b.width / 2 };
  }

  // Ráfaga al tocar el planeta.
  function burstTap(x, y) {
    if (reduced) return;
    const n = 6;
    for (let i = 0; i < n; i++) {
      const a = -Math.PI / 2 + rand(-0.9, 0.9);
      const sp = rand(1.6, 3.4);
      push(make(x, y, Math.cos(a) * sp, Math.sin(a) * sp - 1.2, {
        size: rand(3, 6), decay: rand(0.02, 0.032),
      }));
    }
    // Anillo de onda expansiva.
    push(make(x, y, 0, 0, {
      kind: 'ring', r: 6, vrr: 2.6, decay: 0.05,
      color: 'rgba(124,240,192,0.9)', g: 0, drag: 1,
    }));
    start();
  }

  // Mota ambiental que sube desde el planeta (vida alta).
  function spawnAmbient() {
    const { cx, cy, r } = planetCenter();
    const a = rand(0, Math.PI * 2);
    const rad = r * rand(0.2, 0.95);
    const x = cx + Math.cos(a) * rad;
    const y = cy + Math.sin(a) * rad * 0.9;
    push(make(x, y, rand(-0.3, 0.3), rand(-1.2, -0.5), {
      g: -0.008, drag: 0.99, size: rand(2, 4),
      decay: rand(0.006, 0.012), color: pick(PALETTE),
    }));
  }

  // Explosión de celebración al subir de era.
  function celebrate() {
    const { cx, cy } = planetCenter();
    const n = reduced ? 12 : 40;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + rand(-0.1, 0.1);
      const sp = rand(2.5, 6);
      const gold = Math.random() < 0.4;
      push(make(cx, cy, Math.cos(a) * sp, Math.sin(a) * sp, {
        size: rand(3, 7), g: 0.03, decay: rand(0.01, 0.018),
        color: gold ? pick(GOLD) : pick(PALETTE),
      }));
    }
    push(make(cx, cy, 0, 0, {
      kind: 'ring', r: 10, vrr: 5, decay: 0.03,
      color: 'rgba(255,214,107,0.9)', g: 0, drag: 1,
    }));
    start();
  }

  function start() {
    if (!running) { running = true; requestAnimationFrame(frame); }
  }

  let _ambientAcc = 0;
  function frame() {
    ctx.clearRect(0, 0, w, h);

    // Genera motas ambientales de forma continua según la vida.
    if (!reduced && life > 0.3) {
      _ambientAcc += life * 0.5;
      while (_ambientAcc >= 1) { spawnAmbient(); _ambientAcc -= 1; }
    }

    for (let i = parts.length - 1; i >= 0; i--) {
      const p = parts[i];
      if (p.kind === 'ring') {
        p.r += p.vrr;
        p.life -= p.decay;
        ctx.globalAlpha = Math.max(0, p.life);
        ctx.strokeStyle = p.color;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.stroke();
      } else {
        p.vx *= p.drag;
        p.vy = p.vy * p.drag + p.g;
        p.x += p.vx;
        p.y += p.vy;
        p.rot += p.vr;
        p.life -= p.decay;
        ctx.globalAlpha = Math.max(0, p.life);
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * (0.4 + 0.6 * p.life), 0, Math.PI * 2);
        ctx.fill();
      }
      if (p.life <= 0) parts.splice(i, 1);
    }
    ctx.globalAlpha = 1;

    if (parts.length > 0 || (!reduced && life > 0.3)) {
      requestAnimationFrame(frame);
    } else {
      running = false;
      ctx.clearRect(0, 0, w, h);
    }
  }

  return { init, setLife, burstTap, celebrate };
})();
