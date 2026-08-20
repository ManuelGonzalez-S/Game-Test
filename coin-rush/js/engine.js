// engine.js — lógica: habilidades, monedas, estaciones, banca, progresión.

// ---- Habilidades (agregación de efectos) ----
function hasSkill(id) { return !!state.skills[id]; }
function skillProduct(field) {
  let m = 1;
  for (const s of GAME.skills) if (hasSkill(s.id) && s[field]) m *= s[field];
  return m;
}
function skillAdd(field) {
  let a = 0;
  for (const s of GAME.skills) if (hasSkill(s.id) && s[field]) a += s[field];
  return a;
}

// ---- Mejoras por partes (tracks) ----
function trackLevel(id) { return (state.tracks && state.tracks[id]) || 0; }
function trackFactor(id) { return 1 + trackDef(id).per * trackLevel(id); }
function trackCost(id) {
  const t = trackDef(id);
  return Math.ceil(t.base * Math.pow(t.growth, trackLevel(id)));
}
function canBuyTrack(id) { return state.money >= trackCost(id); }
function buyTrack(id) {
  const c = trackCost(id);
  if (state.money < c) return false;
  state.money -= c;
  state.tracks[id] = trackLevel(id) + 1;
  return true;
}

// ---- Valores derivados ----
function baseCoinValue() {
  return GAME.baseCoinValue * skillProduct('baseValueMult') * trackFactor('value');
}
function spawnIntervalMs() {
  return GAME.baseSpawnMs / (skillProduct('spawnMult') * trackFactor('cadence'));
}
// La mejora "Velocidad" (y la habilidad) potencia las máquinas de movimiento.
function moverPower() { return skillProduct('speedMult') * trackFactor('speed'); }
function spawnTier() { return GAME.spawnTierForTier(state.tier) + skillAdd('startTier'); }
function multPower() { return GAME.power.mult + skillAdd('multBonus'); }
function forgeChance() { return GAME.power.forgeChance + skillAdd('forgeBonus'); }
function casinoWinChance() { return GAME.power.casinoWin + skillAdd('casinoWinBonus'); }
function splitFactor() { return GAME.power.splitFactor + skillAdd('splitBonus'); }
function maxSwaps() { return GAME.baseSwaps + skillAdd('swaps'); }

// ---- Monedas ----
let coins = [];
let _coinId = 0;
let _spawnAcc = 0;
let _rateAcc = 0, _rateTime = 0;
const bankEvents = []; // {x,y,value,tier} consumidos por el render

let _time = 0;

function spawnCoin(m) {
  const tier = Math.max(0, Math.min(GAME.coinTiers.length - 1, spawnTier()));
  coins.push({
    id: _coinId++, x: m.spawn.x + (Math.random() - 0.5) * 12, y: m.spawn.y,
    vx: (Math.random() - 0.5) * 20, vy: 20, tier,
    rot: Math.random() * Math.PI, vrot: (Math.random() - 0.5) * 7,
    value: baseCoinValue() * coinTierValue(tier),
    applied: new Array(m.shelves.length).fill(false),
  });
}

function applyStation(coin, st) {
  st.pulse = 1;
  switch (st.type) {
    case 'mult':
      coin.value *= multPower();
      break;
    case 'forge':
      if (Math.random() < forgeChance() && coin.tier < GAME.coinTiers.length - 1) {
        coin.tier++;
        coin.value *= GAME.coinTierRatio;
      }
      break;
    case 'casino':
      if (Math.random() < casinoWinChance()) coin.value *= GAME.power.casinoMult;
      else coin.dead = true;
      break;
    case 'split': {
      if (coins.length < GAME.physics.maxCoins) {
        coin.value *= splitFactor();
        coins.push({
          id: _coinId++, x: coin.x + (Math.random() - 0.5) * 10, y: coin.y - 6,
          vx: (Math.random() - 0.5) * 120, vy: -80, tier: coin.tier,
          rot: coin.rot, vrot: (Math.random() - 0.5) * 10,
          value: coin.value, applied: coin.applied.slice(),
        });
      }
      break;
    }
  }
}

function bankCoin(c) {
  state.money += c.value;
  state.bankedThisTier += c.value;
  state.totalBanked += c.value;
  _rateAcc += c.value;
  bankEvents.push({ x: c.x, y: c.y, value: c.value, tier: c.tier });
}

// Máquina de movimiento (empuja las monedas apoyadas hacia el borde abierto):
//  - belt: arrastre CONTINUO -> las monedas van en fila.
//  - fan/pusher: SUELO normal; las monedas se AMONTONAN y la máquina las barre
//    en pulsos (montañas que caen en tandas).
function applyMover(c, sh, sdt) {
  const dir = sh.dir, pow = moverPower();
  if (sh.mover === 'belt') {
    const target = dir * GAME.movers.belt.beltV * pow;
    c.vx += (target - c.vx) * 0.16;
  } else if (sh.mover === 'fan') {
    // Ráfagas: empuja toda la plataforma a intervalos; entre medias se apila.
    const gust = Math.sin(_time * 3.4 + sh.index * 1.3);
    if (gust > 0.15) c.vx += dir * GAME.movers.fan.accel * pow * gust * sdt;
  } else if (sh.mover === 'pusher') {
    // Barrido periódico de toda la plataforma (empujón en tandas).
    const P = GAME.movers.pusher;
    const phase = ((_time + sh.index * 0.4) % P.period) / P.period;
    if (phase < 0.4) {
      const target = dir * P.impulse * pow;
      c.vx += (target - c.vx) * 0.22;
    }
  }
}

// Un paso físico (gravedad, paredes, plataformas+movers, y colisión moneda-moneda).
function physicsStep(m, sdt, R, G, MAXV) {
  const n = coins.length;
  for (let i = 0; i < n; i++) {
    const c = coins[i];
    c.vy += G * sdt;
    if (c.vy > MAXV) c.vy = MAXV;
    c.x += c.vx * sdt;
    c.y += c.vy * sdt;
    c.vx *= 0.994;
    if (c.vx > 420) c.vx = 420; else if (c.vx < -420) c.vx = -420;
    // Paredes del conducto
    if (c.x < m.wallL + R) { c.x = m.wallL + R; if (c.vx < 0) c.vx = -c.vx * 0.3; }
    if (c.x > m.wallR - R) { c.x = m.wallR - R; if (c.vx > 0) c.vx = -c.vx * 0.3; }
    // Plataformas (superficie superior) + máquina de movimiento
    for (const sh of m.shelves) {
      const surf = sh.y - R;
      if (c.x >= sh.x1 && c.x <= sh.x2 && c.y > surf && c.y < sh.y + R) {
        c.y = surf;
        if (c.vy > 0) c.vy = -c.vy * 0.12; else if (c.vy > -6) c.vy = 0;
        c.vx *= 0.86; // fricción
        applyMover(c, sh, sdt);
      }
    }
  }
  // Colisión moneda-moneda (apilado). 2 iteraciones.
  const min = 2 * R, min2 = min * min;
  for (let it = 0; it < 2; it++) {
    for (let a = 0; a < n; a++) {
      const A = coins[a];
      for (let b = a + 1; b < n; b++) {
        const B = coins[b];
        const dx = B.x - A.x, dy = B.y - A.y;
        const d2 = dx * dx + dy * dy;
        if (d2 > 0.0001 && d2 < min2) {
          const d = Math.sqrt(d2);
          const nx = dx / d, ny = dy / d;
          const push = (min - d) * 0.4;
          A.x -= nx * push; A.y -= ny * push;
          B.x += nx * push; B.y += ny * push;
          const vn = (B.vx - A.vx) * nx + (B.vy - A.vy) * ny;
          if (vn < 0) {
            const j = -(1.08) * vn * 0.5;
            A.vx -= j * nx; A.vy -= j * ny;
            B.vx += j * nx; B.vy += j * ny;
          }
        }
      }
    }
  }
}

function step(dt) {
  const m = Route.get();
  if (!m) return;
  _time += dt;
  const R = GAME.physics.coinR, G = GAME.physics.gravity, MAXV = 760;

  // Spawns (respetando el tope de monedas)
  _spawnAcc += dt * 1000;
  const interval = spawnIntervalMs();
  let guard = 0;
  while (_spawnAcc >= interval && guard < 8) {
    _spawnAcc -= interval;
    if (coins.length < GAME.physics.maxCoins) spawnCoin(m);
    guard++;
  }
  if (_spawnAcc > interval * 3) _spawnAcc = 0;

  // Substeps para estabilidad del apilado.
  const nSub = dt > 0.02 ? 2 : 1;
  const sdt = dt / nSub;
  for (let s = 0; s < nSub; s++) physicsStep(m, sdt, R, G, MAXV);

  // Rotación, estación al superar una plataforma, y banca.
  for (let i = coins.length - 1; i >= 0; i--) {
    const c = coins[i];
    c.rot += c.vrot * dt; c.vrot *= 0.985;
    for (const sh of m.shelves) {
      if (!c.applied[sh.index] && c.y > sh.y + R + 2) {
        c.applied[sh.index] = true;
        applyStation(c, m.stations[sh.index]);
      }
    }
    if (c.dead) { coins.splice(i, 1); continue; }
    if (c.y > m.bankY) { bankCoin(c); coins.splice(i, 1); continue; }
    if (c.y > m.H + 160 || c.x < -80 || c.x > m.W + 80) coins.splice(i, 1);
  }

  // Tasa (offline) — EMA cada segundo
  _rateTime += dt;
  if (_rateTime >= 1) {
    const inst = _rateAcc / _rateTime;
    state.rate = state.rate ? state.rate * 0.7 + inst * 0.3 : inst;
    _rateAcc = 0; _rateTime = 0;
  }
}

function getCoins() { return coins; }
function clearCoins() { coins = []; _spawnAcc = 0; }

// ---- Ascender de tier ----
function tierGoal() { return GAME.tierGoal(state.tier); }
function tierProgress() { return Math.min(1, state.bankedThisTier / tierGoal()); }
function canAscend() { return state.bankedThisTier >= tierGoal(); }
function ascend() {
  if (!canAscend()) return 0;
  const gain = Math.max(1, Math.floor(GAME.diamondReward(state.tier) * skillProduct('diamondMult')));
  state.diamonds += gain;
  state.tier++;
  state.bankedThisTier = 0;
  state.swapsUsed = 0;
  Route.newForTier(state.tier);
  Route.rebuild();
  clearCoins();
  return gain;
}

// ---- Cambio de estaciones ----
function swapCost() {
  return Math.ceil(60 * Math.pow(4, state.swapsUsed) * Math.pow(5, state.tier - 1));
}
function canSwap() { return state.swapsUsed < maxSwaps() && state.money >= swapCost(); }
function doSwap(slotIndex, newType) {
  if (state.swapsUsed >= maxSwaps()) return false;
  const cost = swapCost();
  if (state.money < cost) return false;
  state.money -= cost;
  state.route.slots[slotIndex] = newType;
  state.swapsUsed++;
  Route.rebuild();
  return true;
}

// ---- Habilidades (compra) ----
function skillNode(id) { return GAME.skills.find(s => s.id === id); }
function skillState(node) {
  if (hasSkill(node.id)) return 'owned';
  if (node.req && !hasSkill(node.req)) return 'locked';
  if (state.diamonds < node.cost) return 'expensive';
  return 'available';
}
function buySkill(id) {
  const n = skillNode(id);
  if (!n || skillState(n) !== 'available') return false;
  state.diamonds -= n.cost;
  state.skills[id] = true;
  return true;
}
