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

// ---- Valores derivados ----
function baseCoinValue() {
  return GAME.baseCoinValue * skillProduct('baseValueMult') * (1 + 0.2 * state.boardLevel);
}
function spawnIntervalMs() {
  return GAME.baseSpawnMs / (skillProduct('spawnMult') * (1 + 0.03 * state.boardLevel));
}
function coinSpeed() { return GAME.coinSpeed * skillProduct('speedMult'); }
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

function spawnCoin(geo) {
  const tier = Math.max(0, Math.min(GAME.coinTiers.length - 1, spawnTier()));
  coins.push({
    id: _coinId++, s: 0, tier,
    value: baseCoinValue() * coinTierValue(tier),
    applied: new Array(geo.stations.length).fill(false),
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
        id: _coinId++, s: coin.s, tier: coin.tier,
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
  const geo = Route.get();
  bankEvents.push({ x: geo.vault.x, y: geo.vault.y, value: c.value, tier: c.tier });
}

function step(dt) {
  const geo = Route.get();
  if (!geo) return;

  // Spawns
  _spawnAcc += dt * 1000;
  const interval = spawnIntervalMs();
  let guard = 0;
  while (_spawnAcc >= interval && guard < 20) { _spawnAcc -= interval; spawnCoin(geo); guard++; }
  if (_spawnAcc > interval * 3) _spawnAcc = 0;

  // Avance de monedas
  const speed = coinSpeed();
  for (let i = coins.length - 1; i >= 0; i--) {
    const c = coins[i];
    c.s += speed * dt;
    for (const st of geo.stations) {
      if (!c.applied[st.index] && c.s >= st.s) {
        c.applied[st.index] = true;
        applyStation(c, st);
      }
    }
    if (c.dead) { coins.splice(i, 1); continue; }
    if (c.s >= geo.total) { bankCoin(c); coins.splice(i, 1); }
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

// ---- Nivel de tablero ----
function boardCost() { return boardLevelCost(state.boardLevel); }
function canBuyBoard() { return state.money >= boardCost(); }
function buyBoardLevel() {
  const cost = boardCost();
  if (state.money < cost) return false;
  state.money -= cost; state.boardLevel++;
  return true;
}

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
