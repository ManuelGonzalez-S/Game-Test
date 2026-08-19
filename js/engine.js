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
function beltSpeedNow() {
  return GAME.physics.beltSpeed * skillProduct('speedMult') * trackFactor('speed');
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
    id: _coinId++, x: m.hopper.x + (Math.random() - 0.5) * 6, y: m.hopper.y,
    vx: 0, vy: 40, tier, belt: null,
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
        vx: -coin.__dir * 60, vy: -120, tier: coin.tier, belt: null,
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

function step(dt) {
  const m = Route.get();
  if (!m) return;
  const R = GAME.physics.coinR;
  const G = GAME.physics.gravity;
  const belt = beltSpeedNow();

  // Spawns
  _spawnAcc += dt * 1000;
  const interval = spawnIntervalMs();
  let guard = 0;
  while (_spawnAcc >= interval && guard < 20) { _spawnAcc -= interval; spawnCoin(m); guard++; }
  if (_spawnAcc > interval * 3) _spawnAcc = 0;

  for (let i = coins.length - 1; i >= 0; i--) {
    const c = coins[i];

    if (c.belt !== null) {
      // Sobre una cinta: arrastrada a velocidad constante.
      const b = m.belts[c.belt];
      c.__dir = b.dir;
      c.y = b.y - R;
      c.x += b.dir * belt * dt;
      // Estación de esta cinta.
      for (const st of m.stations) {
        if (st.belt === c.belt && !c.applied[st.index]) {
          if ((b.dir > 0 && c.x >= st.x) || (b.dir < 0 && c.x <= st.x)) {
            c.applied[st.index] = true;
            applyStation(c, st);
          }
        }
      }
      // ¿Se cae por el extremo? Baja recto para aterrizar en la cinta de abajo.
      if ((b.dir > 0 && c.x > b.x2) || (b.dir < 0 && c.x < b.x1)) {
        c.belt = null; c.vy = 20; c.vx = 0;
      }
    } else {
      // En el aire: gravedad.
      const prevY = c.y;
      c.vy += G * dt;
      c.y += c.vy * dt;
      c.x += c.vx * dt;
      c.vx *= 0.985;
      // Aterrizaje sobre la primera cinta que cruza cayendo.
      if (c.vy > 0) {
        for (let bi = 0; bi < m.belts.length; bi++) {
          const b = m.belts[bi];
          const surf = b.y - R;
          // Estricto (<): no re-aterriza en la cinta que acaba de abandonar.
          if (prevY < surf && c.y >= surf && c.x >= b.x1 - 4 && c.x <= b.x2 + 4) {
            c.belt = bi; c.y = surf; c.vy = 0; c.vx = 0;
            break;
          }
        }
      }
    }

    if (c.dead) { coins.splice(i, 1); continue; }
    if (c.y >= m.vaultY) { bankCoin(c); coins.splice(i, 1); continue; }
    if (c.x < -40 || c.x > m.W + 40) { coins.splice(i, 1); } // seguridad
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
