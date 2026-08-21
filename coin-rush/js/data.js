// data.js — contenido y configuración de Coin Rush.

const GAME = {
  coinTiers: [
    { name: 'Bronce',   color: '#cd7f32', glow: '#e0a15e' },
    { name: 'Plata',    color: '#cfd6e0', glow: '#ffffff' },
    { name: 'Oro',      color: '#ffd54a', glow: '#fff0a0' },
    { name: 'Platino',  color: '#8fe3d4', glow: '#d6fff7' },
    { name: 'Diamante', color: '#8ad0ff', glow: '#d8f0ff' },
    { name: 'Rubí',     color: '#ff6b8a', glow: '#ffc0cf' },
    { name: 'Esmeralda',color: '#6bffb0', glow: '#c6ffe2' },
    { name: 'Cósmica',  color: '#c9a0ff', glow: '#ecdcff' },
  ],
  coinTierRatio: 10,

  // Generador — monedas una a una, pausado
  baseSpawnMs: 2000,
  baseCoinValue: 1,

  // Física (coin pusher) — viaje lento y contemplativo
  physics: {
    gravity: 720,        // caída suave y flotante
    coinR: 16,           // monedas grandes (escenario cercano)
    coinThick: 8,
    maxCoins: 110,
  },

  // Máquinas de movimiento (extremo cerrado de cada plataforma). Escalan con el
  // nivel de la plataforma y la habilidad de velocidad.
  movers: {
    belt:   { name: 'Cinta',      beltV: 48 },              // arrastre continuo, calmado
    fan:    { name: 'Ventilador', accel: 440 },             // ráfagas
    pusher: { name: 'Empujador',  period: 3.6, strokeFrac: 0.72, pushFrac: 0.62 }, // barra física, lenta
  },
  moverPool: (t) => (t >= 3 ? ['pusher', 'belt', 'fan'] : t >= 2 ? ['belt', 'pusher', 'fan'] : ['belt', 'pusher']),

  // Mejora POR PLATAFORMA (se compra con dinero, propia de cada nivel/tier).
  //  - valuePer: +valor de las monedas que pasan por esa plataforma, por nivel.
  //  - speedPer: +velocidad de su máquina de movimiento, por nivel.
  shelfUp: { base: 25, growth: 1.4, tierMult: 6, valuePer: 0.6, speedPer: 0.12 },

  // Tiers de tablero
  slotsForTier: (t) => Math.min(2 + t, 5),
  tierGoal: (t) => Math.ceil(1300 * Math.pow(7, t - 1)),
  diamondReward: (t) => Math.max(1, Math.floor(2 * Math.sqrt(t))),
  spawnTierForTier: (t) => Math.floor((t - 1) / 3),

  // Estaciones (tipo de máquina de valor de cada plataforma)
  stations: {
    mult:   { id: 'mult',   ico: 'chevrons-up', name: 'Multiplicador', color: '#ffc64b' },
    forge:  { id: 'forge',  ico: 'hammer',      name: 'Forja',         color: '#ff8a4c' },
    casino: { id: 'casino', ico: 'dices',       name: 'Casino',        color: '#ff5c8a' },
    split:  { id: 'split',  ico: 'split',       name: 'Bifurcación',   color: '#5cc8ff' },
  },
  power: {
    mult: 2, forgeChance: 0.25, casinoWin: 0.5, casinoMult: 4, splitFactor: 0.6,
  },
  stationPool: (t) => {
    const pool = ['mult', 'mult', 'forge'];
    if (t >= 2) pool.push('split');
    if (t >= 3) pool.push('casino', 'forge');
    if (t >= 4) pool.push('mult', 'split', 'casino');
    return pool;
  },

  // Árbol de habilidades (💎)
  skills: [
    { id: 'val1', branch: 'Producción', ico: 'circle-dollar-sign', name: 'Acuñación I',  cost: 1,  req: null,   baseValueMult: 2,  desc: '×2 al valor base de las monedas.' },
    { id: 'val2', branch: 'Producción', ico: 'circle-dollar-sign', name: 'Acuñación II', cost: 4,  req: 'val1', baseValueMult: 3,  desc: '×3 al valor base de las monedas.' },
    { id: 'val3', branch: 'Producción', ico: 'circle-dollar-sign', name: 'Acuñación III',cost: 16, req: 'val2', baseValueMult: 4,  desc: '×4 al valor base de las monedas.' },
    { id: 'spd1', branch: 'Producción', ico: 'zap', name: 'Cadencia I',  cost: 2, req: null,  spawnMult: 1.4, desc: 'El generador suelta monedas un 40% más rápido.' },
    { id: 'spd2', branch: 'Producción', ico: 'zap', name: 'Cadencia II', cost: 6, req: 'spd1', spawnMult: 1.5, desc: 'Otro 50% más rápido.' },
    { id: 'flow', branch: 'Máquinas',   ico: 'wind', name: 'Máquinas veloces', cost: 5, req: null, speedMult: 1.5, desc: 'Todas las máquinas empujan un 50% más rápido.' },
    { id: 'pmul', branch: 'Máquinas', ico: 'chevrons-up', name: 'Prensa pesada', cost: 3, req: null,  multBonus: 1,   desc: 'Multiplicador: +1 al factor (×2 → ×3).' },
    { id: 'pfor', branch: 'Máquinas', ico: 'hammer', name: 'Fuelle',        cost: 4, req: null,  forgeBonus: 0.15, desc: 'Forja: +15% de probabilidad de subir tier.' },
    { id: 'pcas', branch: 'Máquinas', ico: 'dices', name: 'Dados cargados',cost: 6, req: null,  casinoWinBonus: 0.15, desc: 'Casino: +15% de probabilidad de ganar.' },
    { id: 'pspl', branch: 'Máquinas', ico: 'split', name: 'Doble molde',   cost: 6, req: null,  splitBonus: 0.15, desc: 'Bifurcación: cada mitad vale +15%.' },
    { id: 'mint',  branch: 'Meta', ico: 'coins', name: 'Lingotes',      cost: 8,  req: null,   startTier: 1, desc: 'Las monedas nacen un tier por encima.' },
    { id: 'gem',   branch: 'Meta', ico: 'gem', name: 'Filón',         cost: 10, req: null,   diamondMult: 1.5, desc: '+50% de diamantes al ascender.' },
    { id: 'off',   branch: 'Meta', ico: 'moon', name: 'Turno de noche', cost: 6, req: null,   offline: true, desc: 'Ganas dinero mientras estás fuera (offline).' },
  ],
};

function coinTierValue(tier) { return Math.pow(GAME.coinTierRatio, tier); }
