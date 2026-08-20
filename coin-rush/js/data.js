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
  baseSpawnMs: 900,      // intervalo base entre monedas (mejora con nivel/habilidades)
  baseCoinValue: 1,      // valor base de una moneda bronce (× multiplicadores)

  // Física (coin pusher)
  physics: {
    gravity: 1300,       // px/seg² de caída
    coinR: 12,           // radio de la moneda
    coinThick: 6,        // grosor 3D visual
    maxCoins: 110,       // tope de monedas simultáneas (rendimiento/estabilidad)
  },

  // Máquinas de movimiento (en el extremo cerrado de cada plataforma).
  // La fuerza escala con la mejora "Velocidad" y habilidades.
  movers: {
    belt:   { name: 'Cinta',      beltV: 46 },   // arrastre constante hacia el hueco
    fan:    { name: 'Ventilador', accel: 640 },  // ráfaga (acel. horizontal, pulsada)
    pusher: { name: 'Empujador',  impulse: 120, period: 1.5 }, // empujón periódico
  },
  moverPool: (t) => (t >= 3 ? ['pusher', 'belt', 'fan'] : t >= 2 ? ['belt', 'pusher', 'fan'] : ['belt', 'pusher']),

  // Mejoras por partes (se compran con dinero, por niveles independientes)
  tracks: [
    { id: 'value',   ico: 'coins', name: 'Valor',     color: '#ffc64b', base: 60,  growth: 1.22, per: 0.22,
      desc: '+22% al valor base de las monedas por nivel.' },
    { id: 'cadence', ico: 'zap',   name: 'Cadencia',  color: '#5cc8ff', base: 110, growth: 1.23, per: 0.06,
      desc: 'El generador suelta monedas más a menudo.' },
    { id: 'speed',   ico: 'wind',  name: 'Velocidad', color: '#35e0a1', base: 80,  growth: 1.24, per: 0.09,
      desc: 'Las cintas transportan más rápido.' },
  ],

  // Tiers de tablero
  slotsForTier: (t) => Math.min(3 + t, 5),          // nº de rampas/estaciones (tope 5)
  tierGoal: (t) => Math.ceil(1300 * Math.pow(7, t - 1)), // dinero a banquear para ascender
  diamondReward: (t) => Math.max(1, Math.floor(2 * Math.sqrt(t))),
  spawnTierForTier: (t) => Math.floor((t - 1) / 3),  // tier base de moneda según tier tablero
  baseSwaps: 2,          // cambios de estación por tier (base)

  // Estaciones
  stations: {
    mult:   { id: 'mult',   ico: 'chevrons-up', name: 'Multiplicador', color: '#ffc64b' },
    forge:  { id: 'forge',  ico: 'hammer',      name: 'Forja',         color: '#ff8a4c' },
    casino: { id: 'casino', ico: 'dices',       name: 'Casino',        color: '#ff5c8a' },
    split:  { id: 'split',  ico: 'split',       name: 'Bifurcación',   color: '#5cc8ff' },
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
    { id: 'val1', branch: 'Producción', ico: 'circle-dollar-sign', name: 'Acuñación I',  cost: 1,  req: null,   baseValueMult: 2,  desc: '×2 al valor base de las monedas.' },
    { id: 'val2', branch: 'Producción', ico: 'circle-dollar-sign', name: 'Acuñación II', cost: 4,  req: 'val1', baseValueMult: 3,  desc: '×3 al valor base de las monedas.' },
    { id: 'spd1', branch: 'Producción', ico: 'zap', name: 'Cadencia I',  cost: 2, req: null,  spawnMult: 1.4, desc: 'El generador suelta monedas un 40% más rápido.' },
    { id: 'spd2', branch: 'Producción', ico: 'zap', name: 'Cadencia II', cost: 6, req: 'spd1', spawnMult: 1.5, desc: 'Otro 50% más rápido.' },
    { id: 'flow', branch: 'Producción', ico: 'wind', name: 'Cinta veloz', cost: 5, req: null, speedMult: 1.6, desc: 'Las cintas van un 60% más rápido.' },
    // Estaciones
    { id: 'pmul', branch: 'Estaciones', ico: 'chevrons-up', name: 'Prensa pesada', cost: 3, req: null,  multBonus: 1,   desc: 'Multiplicador: +1 al factor (×2 → ×3).' },
    { id: 'pfor', branch: 'Estaciones', ico: 'hammer', name: 'Fuelle',        cost: 4, req: null,  forgeBonus: 0.15, desc: 'Forja: +15% de probabilidad de subir tier.' },
    { id: 'pcas', branch: 'Estaciones', ico: 'dices', name: 'Dados cargados',cost: 6, req: null,  casinoWinBonus: 0.15, desc: 'Casino: +15% de probabilidad de ganar.' },
    { id: 'pspl', branch: 'Estaciones', ico: 'split', name: 'Doble molde',   cost: 6, req: null,  splitBonus: 0.15, desc: 'Bifurcación: cada mitad vale +15%.' },
    // Meta
    { id: 'swap1', branch: 'Meta', ico: 'wrench', name: 'Ingeniero',     cost: 5,  req: null,   swaps: 1, desc: '+1 cambio de estación por tier.' },
    { id: 'swap2', branch: 'Meta', ico: 'wrench', name: 'Jefe de obra',  cost: 12, req: 'swap1', swaps: 1, desc: '+1 cambio de estación por tier.' },
    { id: 'mint',  branch: 'Meta', ico: 'coins', name: 'Lingotes',      cost: 8,  req: null,   startTier: 1, desc: 'Las monedas nacen un tier por encima.' },
    { id: 'gem',   branch: 'Meta', ico: 'gem', name: 'Filón',         cost: 10, req: null,   diamondMult: 1.5, desc: '+50% de diamantes al ascender.' },
    { id: 'off',   branch: 'Meta', ico: 'moon', name: 'Turno de noche', cost: 6, req: null,   offline: true, desc: 'Ganas dinero mientras estás fuera (offline).' },
  ],
};

function coinTierValue(tier) {
  return Math.pow(GAME.coinTierRatio, tier);
}
function trackDef(id) { return GAME.tracks.find(t => t.id === id); }
