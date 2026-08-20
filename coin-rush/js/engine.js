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
function gravityNow() {
  return GAME.physics.gravity * skillProduct('speedMult') * trackFactor('speed');
}
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

function spawnCoin(m) {
  const tier = Math.max(0, Math.min(GAME.coinTiers.length - 1, spawnTier()));
  coins.push({
    id: _coinId++, x: m.spawn.x + (Math.random() - 0.5) * 10, y: m.spawn.y,
    vx: (Math.random() - 0.2) * 40, vy: 30, tier,
    rot: Math.random() * Math.PI, vrot: (Math.random() - 0.5) * 6,
    value: baseCoinValue() * coinTierValue(tier),
    applied: new Array(m.stations.length).fill(false),
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
      coin.value *= splitFactor();
      coins.push({
        id: _coinId++, x: coin.x, y: coin.y - 4,
        vx: (Math.random() - 0.5) * 220, vy: -160, tier: coin.tier,
        rot: coin.rot, vrot: (Math.random() - 0.5) * 10,
        value: coin.value, applied: coin.applied.slice(),
      });
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

// Colisión de una moneda (círculo) contra una rampa (segmento). Resuelve
// rebote + rodadura y devuelve true si hubo contacto.
function collideSeg(c, seg, R) {
  const dx = seg.bx - seg.ax, dy = seg.by - seg.ay;
  const len2 = dx * dx + dy * dy || 1;
  let t = ((c.x - seg.ax) * dx + (c.y - seg.ay) * dy) / len2;
  if (t < 0) t = 0; else if (t > 1) t = 1;
  const px = seg.ax + dx * t, py = seg.ay + dy * t;
  let nx = c.x - px, ny = c.y - py;
  let dist = Math.hypot(nx, ny);
  if (dist >= R) return false;
  if (dist < 0.0001) { nx = 0; ny = -1; dist = 0.0001; }
  const ux = nx / dist, uy = ny / dist;      // normal rampa -> moneda
  c.x += ux * (R - dist);                     // separa
  c.y += uy * (R - dist);
  // Tangente CUESTA ABAJO (componente +y): garantiza que la moneda siempre baja.
  let tx = dx / Math.sqrt(len2), ty = dy / Math.sqrt(len2);
  if (ty < 0) { tx = -tx; ty = -ty; }
  let along = c.vx * tx + c.vy * ty;          // velocidad a lo largo de la pendiente
  if (along < 70) along = 70;                 // mínimo (nunca se queda quieta)
  if (along > 560) along = 560;               // tope
  const vn = c.vx * ux + c.vy * uy;
  const bounce = vn < 0 ? -vn * 0.24 : 0;     // rebote pequeño
  c.vx = tx * along + ux * bounce;
  c.vy = ty * along + uy * bounce;
  c.vrot = (tx >= 0 ? 1 : -1) * (along / R);  // giro acorde a la rodadura
  return true;
}

function step(dt) {
  const m = Route.get();
  if (!m) return;
  const R = GAME.physics.coinR;
  const G = gravityNow();
  const MAXV = 780; // límite de caída (evita atravesar rampas)

  // Spawns
  _spawnAcc += dt * 1000;
  const interval = spawnIntervalMs();
  let guard = 0;
  while (_spawnAcc >= interval && guard < 20) { _spawnAcc -= interval; spawnCoin(m); guard++; }
  if (_spawnAcc > interval * 3) _spawnAcc = 0;

  for (let i = coins.length - 1; i >= 0; i--) {
    const c = coins[i];
    // Integración
    c.vy += G * dt;
    if (c.vy > MAXV) c.vy = MAXV;
    c.x += c.vx * dt;
    c.y += c.vy * dt;
    c.rot += c.vrot * dt;
    c.vrot *= 0.99;

    // Paredes
    if (c.x < m.wallL + R) { c.x = m.wallL + R; c.vx = Math.abs(c.vx) * 0.4; c.vrot += 2; }
    if (c.x > m.wallR - R) { c.x = m.wallR - R; c.vx = -Math.abs(c.vx) * 0.4; c.vrot -= 2; }

    // Rampas (rebote + rodadura). La estación se activa al primer contacto.
    for (const ramp of m.ramps) {
      if (collideSeg(c, ramp, R)) {
        if (!c.applied[ramp.index]) { c.applied[ramp.index] = true; applyStation(c, m.stations[ramp.index]); }
      }
    }

    if (c.dead) { coins.splice(i, 1); continue; }
    if (c.y >= m.bottomY) { bankCoin(c); coins.splice(i, 1); continue; }
    if (c.y > m.H + 120) { coins.splice(i, 1); } // seguridad
  }

  // Tasa (para offline) — EMA cada segundo
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
