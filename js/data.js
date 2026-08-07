// data.js — definición de contenido del juego (Fase 1 / MVP).
// Los generadores se afinarán en la fase de balanceo.

const GAME_DATA = {
  // Esporas ganadas por toque (base, antes de multiplicadores).
  clickBase: 1,

  // Cada compra de un generador sube su coste por este factor.
  costGrowth: 1.15,

  // Tope de producción offline (en segundos). 8 horas por defecto.
  offlineCapSeconds: 8 * 3600,
  // Fracción de la producción que se gana estando offline (0..1).
  offlineRate: 0.5,

  // Formas de Vida (generadores). baseProd = esporas/seg de UNA unidad.
  generators: [
    { id: 'musgo',    name: 'Musgo',    emoji: '🦠', baseCost: 15,     baseProd: 0.1,
      desc: 'La primera vida que se aferra a la roca.' },
    { id: 'liquenes', name: 'Líquenes', emoji: '🌾', baseCost: 100,    baseProd: 1,
      desc: 'Tapizan el suelo y preparan la tierra.' },
    { id: 'hongos',   name: 'Hongos',   emoji: '🍄', baseCost: 1100,   baseProd: 8,
      desc: 'Reciclan nutrientes bajo la superficie.' },
    { id: 'helechos', name: 'Helechos', emoji: '🌿', baseCost: 12000,  baseProd: 47,
      desc: 'Los primeros brotes verdes de verdad.' },
    { id: 'arboles',  name: 'Árboles',  emoji: '🌳', baseCost: 130000, baseProd: 260,
      desc: 'Bosques que llenan el aire de oxígeno.' },
    { id: 'insectos', name: 'Insectos', emoji: '🐛', baseCost: 1.4e6, baseProd: 1400,
      desc: 'Diminutos ingenieros del ecosistema.' },
    { id: 'polinizadores', name: 'Polinizadores', emoji: '🦋', baseCost: 2e7, baseProd: 7800,
      desc: 'Llevan la vida de flor en flor.' },
    { id: 'aves',     name: 'Aves',     emoji: '🐦', baseCost: 3.3e8, baseProd: 44000,
      desc: 'El cielo se llena de cantos.' },
    { id: 'fauna',    name: 'Fauna',    emoji: '🦌', baseCost: 5.1e9, baseProd: 260000,
      desc: 'Grandes criaturas recorren el mundo.' },
    { id: 'consciencia', name: 'Consciencia', emoji: '🧬', baseCost: 7.5e10, baseProd: 1.6e6,
      desc: 'El planeta despierta y piensa.' },
  ],

  // Umbrales de milestone: al alcanzar N ejemplares, ese generador dobla su producción.
  milestones: [10, 25, 50, 100, 200, 350, 500, 750, 1000],

  // Mejoras comprables (una sola vez). Se desbloquean por condiciones.
  //  - clickMult: multiplica las esporas por toque.
  //  - cpsPct:    cada toque gana ese % de tu producción/seg.
  //  - globalMult: multiplica TODA la producción pasiva.
  // unlock: { clicks, total, gen:{id,n} } — condición para que aparezca.
  upgrades: [
    // Toque
    { id: 'click1', name: 'Dedos fértiles', emoji: '👆', cost: 100,
      unlock: { clicks: 20 }, clickMult: 2, desc: 'Duplica las esporas por toque.' },
    { id: 'click2', name: 'Palma de Gaia', emoji: '✋', cost: 6000,
      unlock: { clicks: 120 }, clickMult: 2, desc: 'Duplica de nuevo las esporas por toque.' },
    { id: 'click3', name: 'Caricia primordial', emoji: '🌿', cost: 500000,
      unlock: { clicks: 400 }, clickMult: 2, desc: 'Vuelve a duplicar las esporas por toque.' },
    // Sinergia toque <- producción
    { id: 'syn1', name: 'Tacto simbiótico', emoji: '🌀', cost: 120000,
      unlock: { gen: { id: 'helechos', n: 10 } }, cpsPct: 0.01,
      desc: 'Cada toque gana +1% de tu producción por segundo.' },
    { id: 'syn2', name: 'Mente enraizada', emoji: '🧠', cost: 5e7,
      unlock: { gen: { id: 'aves', n: 10 } }, cpsPct: 0.02,
      desc: 'Los toques ganan +2% adicional de tu producción/seg.' },
    // Globales
    { id: 'glob1', name: 'Fotosíntesis', emoji: '🌞', cost: 100000,
      unlock: { total: 100000 }, globalMult: 1.5, desc: 'x1.5 a toda la producción pasiva.' },
    { id: 'glob2', name: 'Ciclo del agua', emoji: '🌧️', cost: 5e6,
      unlock: { total: 5e6 }, globalMult: 1.5, desc: 'x1.5 a toda la producción pasiva.' },
    { id: 'glob3', name: 'Biosfera', emoji: '🌐', cost: 5e8,
      unlock: { total: 5e8 }, globalMult: 2, desc: 'x2 a toda la producción pasiva.' },
    { id: 'glob4', name: 'Simbiosis planetaria', emoji: '🪐', cost: 5e10,
      unlock: { total: 5e10 }, globalMult: 2, desc: 'x2 a toda la producción pasiva.' },
  ],

  // Eras del planeta: se desbloquean por esporas TOTALES producidas.
  // Cada una cambia el aspecto del planeta y dispara una celebración.
  stages: [
    { name: 'Roca muerta',     emoji: '🪨', at: 0 },
    { name: 'Primeros musgos', emoji: '🦠', at: 50 },
    { name: 'Verdor',          emoji: '🌾', at: 1200 },
    { name: 'Océanos',         emoji: '💧', at: 30000 },
    { name: 'Bosques',         emoji: '🌳', at: 600000 },
    { name: 'Mundo vivo',      emoji: '🦌', at: 12000000 },
    { name: 'Paraíso',         emoji: '🌍', at: 150000000 },
  ],

  // Grupos de generadores (para las sinergias del árbol).
  groups: {
    base: ['musgo', 'liquenes', 'hongos', 'helechos'],
    mid:  ['arboles', 'insectos', 'polinizadores'],
    adv:  ['aves', 'fauna', 'consciencia'],
  },

  // Prestigio ("Florecer"): reinicia el planeta a cambio de Semillas Estelares (✨),
  // que se GASTAN en el Árbol de Semillas (nodos permanentes entre floradas).
  prestige: {
    seedScale: 1000,       // divisor de esporas totales (curva afinada)
    seedExponent: 1 / 3,   // raíz cúbica -> crecimiento suave
    minToFlorecer: 3,      // semillas mínimas para el 1er Florecer (que valga la pena)
  },

  // Árbol de Semillas: cada nodo cuesta ✨ y es permanente. `req` = nodo previo.
  // Efectos posibles: prodMult, clickMult, clickCps, group{base|mid|adv|all, mult},
  //   offlineRate, offlineCap (seg), startGen{group,n}, seedGainMult, startUpgrades[].
  tree: [
    // 🌿 Fertilidad — producción global (multiplicativo, rompe el muro)
    { id: 'fert1', branch: 'Fertilidad', emoji: '🌿', name: 'Suelo fértil',  cost: 1,  req: null,    prodMult: 1.5, desc: '×1.5 a toda la producción.' },
    { id: 'fert2', branch: 'Fertilidad', emoji: '🌿', name: 'Humus rico',    cost: 3,  req: 'fert1', prodMult: 2,   desc: '×2 a toda la producción.' },
    { id: 'fert3', branch: 'Fertilidad', emoji: '🌿', name: 'Micorrizas',    cost: 8,  req: 'fert2', prodMult: 3,   desc: '×3 a toda la producción.' },
    { id: 'fert4', branch: 'Fertilidad', emoji: '🌿', name: 'Gaia despierta',cost: 20, req: 'fert3', prodMult: 5,   desc: '×5 a toda la producción.' },
    { id: 'fert5', branch: 'Fertilidad', emoji: '🌿', name: 'Génesis',       cost: 50, req: 'fert4', prodMult: 10,  desc: '×10 a toda la producción.' },
    // 👆 Vitalidad — toque
    { id: 'vit1', branch: 'Vitalidad', emoji: '👆', name: 'Toque potente', cost: 2,  req: null,   clickMult: 5,  desc: 'Esporas por toque ×5.' },
    { id: 'vit2', branch: 'Vitalidad', emoji: '💧', name: 'Savia viva',    cost: 5,  req: 'vit1', clickCps: 0.10, desc: 'Cada toque gana +10% de tu producción/seg.' },
    { id: 'vit3', branch: 'Vitalidad', emoji: '⚡', name: 'Toque cósmico', cost: 15, req: 'vit2', clickMult: 10, desc: 'Esporas por toque ×10 adicional.' },
    { id: 'vit4', branch: 'Vitalidad', emoji: '🌟', name: 'Comunión total',cost: 30, req: 'vit3', clickCps: 0.25, desc: 'Los toques ganan +25% adicional de producción/seg.' },
    // 🌙 Letargo — offline / idle
    { id: 'let1', branch: 'Letargo', emoji: '🌙', name: 'Sueño ligero',  cost: 2,  req: null,   offlineRate: 0.75, desc: 'Ganas el 75% de tu producción estando fuera.' },
    { id: 'let2', branch: 'Letargo', emoji: '🌙', name: 'Sueño profundo',cost: 6,  req: 'let1', offlineRate: 1.0,  desc: 'Ganas el 100% de tu producción estando fuera.' },
    { id: 'let3', branch: 'Letargo', emoji: '🛌', name: 'Hibernación',   cost: 4,  req: null,   offlineCap: 86400, desc: 'El progreso offline acumula hasta 24 horas.' },
    { id: 'let4', branch: 'Letargo', emoji: '❄️', name: 'Estasis',       cost: 12, req: 'let3', offlineCap: 259200,desc: 'El progreso offline acumula hasta 3 días.' },
    // 🧬 Sinergia — grupos de generadores
    { id: 'syn1', branch: 'Sinergia', emoji: '🦠', name: 'Raíces comunes', cost: 4,  req: null,   group: { g: 'base', mult: 3 }, desc: 'Productores base (Musgo→Helechos) ×3.' },
    { id: 'syn2', branch: 'Sinergia', emoji: '🌳', name: 'Red vital',      cost: 10, req: 'syn1', group: { g: 'mid',  mult: 3 }, desc: 'Productores medios (Árboles→Polinizadores) ×3.' },
    { id: 'syn3', branch: 'Sinergia', emoji: '🦌', name: 'Gran fauna',     cost: 25, req: 'syn2', group: { g: 'adv',  mult: 3 }, desc: 'Productores avanzados (Aves→Consciencia) ×3.' },
    { id: 'syn4', branch: 'Sinergia', emoji: '🎼', name: 'Sinfonía viva',  cost: 60, req: 'syn3', group: { g: 'all',  mult: 2 }, desc: '×2 adicional a TODOS los generadores.' },
    // ✨ Cosecha — meta-prestigio (acelera cada bucle)
    { id: 'cos1', branch: 'Cosecha', emoji: '🧬', name: 'Memoria genética', cost: 4,  req: null,   startGen: { group: 'base', n: 10 }, desc: 'Empiezas cada mundo con 10 de cada productor base.' },
    { id: 'cos2', branch: 'Cosecha', emoji: '✨', name: 'Cosecha rica',     cost: 6,  req: null,   seedGainMult: 1.25, desc: '+25% de Semillas Estelares al florecer.' },
    { id: 'cos3', branch: 'Cosecha', emoji: '🌱', name: 'Semillero',        cost: 15, req: 'cos1', startGen: { group: 'mid', n: 5, alsoBase: 25 }, desc: 'Empiezas con 25 base y 5 de cada productor medio.' },
    { id: 'cos4', branch: 'Cosecha', emoji: '💫', name: 'Cosecha estelar',  cost: 20, req: 'cos2', seedGainMult: 1.5, desc: '+50% adicional de Semillas al florecer.' },
    { id: 'cos5', branch: 'Cosecha', emoji: '📖', name: 'Sabiduría',        cost: 12, req: null,   startUpgrades: ['click1', 'click2', 'click3'], desc: 'Empiezas cada mundo con las mejoras de Toque ya compradas.' },
  ],

  // Logros: se comprueban con `check(state)`. Una vez desbloqueados, permanentes.
  achievements: [
    { id: 'firstTap',  emoji: '👆', name: 'Primer aliento',   desc: 'Toca el planeta por primera vez.',        check: s => s.totalClicks >= 1 },
    { id: 'clicks100', emoji: '✋', name: 'Manos verdes',      desc: 'Toca el planeta 100 veces.',              check: s => s.totalClicks >= 100 },
    { id: 'clicks1k',  emoji: '🙌', name: 'Jardinero incansable', desc: 'Toca el planeta 1.000 veces.',        check: s => s.totalClicks >= 1000 },
    { id: 'firstGen',  emoji: '🦠', name: 'Chispa de vida',    desc: 'Compra tu primera forma de vida.',        check: s => anyGenerator(s) },
    { id: 'spores1k',  emoji: '🌱', name: 'Brotes',            desc: 'Acumula 1.000 esporas en total.',         check: s => s.totalSpores >= 1000 },
    { id: 'oceans',    emoji: '💧', name: 'Océanos',           desc: 'Alcanza la era de los Océanos.',          check: s => s.totalSpores >= 30000 },
    { id: 'forests',   emoji: '🌳', name: 'Bosques',           desc: 'Alcanza la era de los Bosques.',          check: s => s.totalSpores >= 600000 },
    { id: 'living',    emoji: '🦌', name: 'Mundo vivo',        desc: 'Alcanza la era del Mundo vivo.',          check: s => s.totalSpores >= 12000000 },
    { id: 'paradise',  emoji: '🌍', name: 'Paraíso',           desc: 'Alcanza la era del Paraíso.',             check: s => s.totalSpores >= 150000000 },
    { id: 'allGens',   emoji: '🧬', name: 'Biodiversidad',     desc: 'Ten al menos una de cada forma de vida.', check: s => allGenerators(s) },
    { id: 'gen50',     emoji: '⭐', name: 'Colonia',           desc: 'Ten 50 de una misma forma de vida.',      check: s => maxGeneratorCount(s) >= 50 },
    { id: 'firstFlor', emoji: '🌸', name: 'Renacer',           desc: 'Florece tu planeta por primera vez.',     check: s => (s.floradas || 0) >= 1 },
    { id: 'seeds10',   emoji: '✨', name: 'Sembradora estelar', desc: 'Gana 10 Semillas Estelares en total.',   check: s => (s.totalSeeds || 0) >= 10 },
    { id: 'tree5',     emoji: '🌳', name: 'Jardinero cósmico', desc: 'Compra 5 nodos del Árbol de Semillas.',   check: s => treeNodeCount(s) >= 5 },
  ],
};

// Helpers para condiciones de logros.
function anyGenerator(s) {
  for (const g of GAME_DATA.generators) if ((s.generators[g.id] || 0) > 0) return true;
  return false;
}
function allGenerators(s) {
  for (const g of GAME_DATA.generators) if ((s.generators[g.id] || 0) < 1) return false;
  return true;
}
function maxGeneratorCount(s) {
  let m = 0;
  for (const g of GAME_DATA.generators) m = Math.max(m, s.generators[g.id] || 0);
  return m;
}
function treeNodeCount(s) {
  let n = 0;
  for (const t of GAME_DATA.tree) if (s.tree && s.tree[t.id]) n++;
  return n;
}
// Grupo al que pertenece un generador (base / mid / adv), o null.
function generatorGroup(id) {
  for (const k in GAME_DATA.groups) if (GAME_DATA.groups[k].includes(id)) return k;
  return null;
}

// Coste del siguiente ejemplar de un generador según cuántos ya tienes.
function generatorCost(gen, owned) {
  return Math.ceil(gen.baseCost * Math.pow(GAME_DATA.costGrowth, owned));
}
