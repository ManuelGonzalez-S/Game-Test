// data.js — contenido y configuración de Coin Rush.

const GAME = {
  // Tiers de moneda (color + valor base ×10 por escalón).
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
  coinTierRatio: 10,     // valor ×10 por cada tier de moneda

  // Generador
  baseSpawnMs: 1050,     // intervalo base entre monedas (mejora con nivel/habilidades)
  baseCoinValue: 1,      // valor base de una moneda bronce (× multiplicadores)

  // Física (vista lateral)
  physics: {
    gravity: 1600,       // px/seg² de caída
    beltSpeed: 170,      // px/seg que arrastra la cinta
    coinR: 15,           // radio de la moneda
  },

  // Nivel de tablero
  boardLevelBaseCost: 25,
  boardLevelCostGrowth: 1.18,

  // Tiers de tablero
  slotsForTier: (t) => Math.min(3 + t, 9),          // nº de estaciones por recorrido
  tierGoal: (t) => Math.ceil(200 * Math.pow(6, t - 1)), // dinero a banquear para ascender
  diamondReward: (t) => Math.max(1, Math.floor(2 * Math.sqrt(t))),
  spawnTierForTier: (t) => Math.floor((t - 1) / 3),  // tier base de moneda según tier tablero
  baseSwaps: 2,          // cambios de estación por tier (base)

  // Estaciones
  stations: {
    mult:   { id: 'mult',   emoji: '💰', name: 'Multiplicador', color: '#ffd54a' },
    forge:  { id: 'forge',  emoji: '⚒️', name: 'Forja',         color: '#ff9d5c' },
    casino: { id: 'casino', emoji: '🎰', name: 'Casino',        color: '#ff6b8a' },
    split:  { id: 'split',  emoji: '🔀', name: 'Bifurcación',   color: '#7cc4ff' },
  },
  // Poderes base (modificados por habilidades)
  power: {
    mult: 2,            // ×2 valor
    forgeChance: 0.25,  // 25% subir tier
    casinoWin: 0.5,     // 50% ganar
    casinoMult: 4,      // ×4 si gana
    splitFactor: 0.6,   // cada mitad vale 0.6× (total 1.2×)
  },

  // Bolsa de estaciones por tier (qué puede colocar/ofrecer el juego)
  stationPool: (t) => {
    const pool = ['mult', 'mult', 'forge'];
    if (t >= 2) pool.push('split');
    if (t >= 3) pool.push('casino', 'forge');
    if (t >= 4) pool.push('mult', 'split', 'casino');
    return pool;
  },

  // Árbol de habilidades (se paga con 💎). req = nodo previo.
  skills: [
    // Producción
    { id: 'val1', branch: 'Producción', emoji: '💵', name: 'Acuñación I',  cost: 1,  req: null,   baseValueMult: 2,  desc: '×2 al valor base de las monedas.' },
    { id: 'val2', branch: 'Producción', emoji: '💵', name: 'Acuñación II', cost: 4,  req: 'val1', baseValueMult: 3,  desc: '×3 al valor base de las monedas.' },
    { id: 'spd1', branch: 'Producción', emoji: '⏩', name: 'Cinta rápida I', cost: 2, req: null,  spawnMult: 1.4, desc: 'El generador suelta monedas un 40% más rápido.' },
    { id: 'spd2', branch: 'Producción', emoji: '⏩', name: 'Cinta rápida II', cost: 6, req: 'spd1', spawnMult: 1.5, desc: 'Otro 50% más rápido.' },
    { id: 'flow', branch: 'Producción', emoji: '💨', name: 'Flujo veloz',  cost: 5,  req: null,   speedMult: 1.6, desc: 'Las monedas viajan un 60% más rápido.' },
    // Estaciones
    { id: 'pmul', branch: 'Estaciones', emoji: '💰', name: 'Prensa pesada', cost: 3, req: null,  multBonus: 1,   desc: 'Multiplicador: +1 al factor (×2 → ×3).' },
    { id: 'pfor', branch: 'Estaciones', emoji: '⚒️', name: 'Fuelle',        cost: 4, req: null,  forgeBonus: 0.15, desc: 'Forja: +15% de probabilidad de subir tier.' },
    { id: 'pcas', branch: 'Estaciones', emoji: '🎰', name: 'Dados cargados',cost: 6, req: null,  casinoWinBonus: 0.15, desc: 'Casino: +15% de probabilidad de ganar.' },
    { id: 'pspl', branch: 'Estaciones', emoji: '🔀', name: 'Doble molde',   cost: 6, req: null,  splitBonus: 0.15, desc: 'Bifurcación: cada mitad vale +15%.' },
    // Meta
    { id: 'swap1', branch: 'Meta', emoji: '🔧', name: 'Ingeniero',     cost: 5,  req: null,   swaps: 1, desc: '+1 cambio de estación por tier.' },
    { id: 'swap2', branch: 'Meta', emoji: '🔧', name: 'Jefe de obra',  cost: 12, req: 'swap1', swaps: 1, desc: '+1 cambio de estación por tier.' },
    { id: 'mint',  branch: 'Meta', emoji: '⭐', name: 'Lingotes',      cost: 8,  req: null,   startTier: 1, desc: 'Las monedas nacen un tier por encima.' },
    { id: 'gem',   branch: 'Meta', emoji: '💎', name: 'Filón',         cost: 10, req: null,   diamondMult: 1.5, desc: '+50% de diamantes al ascender.' },
    { id: 'off',   branch: 'Meta', emoji: '🌙', name: 'Turno de noche', cost: 6, req: null,   offline: true, desc: 'Ganas dinero mientras estás fuera (offline).' },
  ],
};

function coinTierValue(tier) {
  return Math.pow(GAME.coinTierRatio, tier);
}
function boardLevelCost(level) {
  return Math.ceil(GAME.boardLevelBaseCost * Math.pow(GAME.boardLevelCostGrowth, level));
}
