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
    { name: 'Paraíso',         emoji: '🌍', at: 300000000 },
  ],
};

// Coste del siguiente ejemplar de un generador según cuántos ya tienes.
function generatorCost(gen, owned) {
  return Math.ceil(gen.baseCost * Math.pow(GAME_DATA.costGrowth, owned));
}
