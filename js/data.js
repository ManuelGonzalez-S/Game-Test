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
  ],
};

// Coste del siguiente ejemplar de un generador según cuántos ya tienes.
function generatorCost(gen, owned) {
  return Math.ceil(gen.baseCost * Math.pow(GAME_DATA.costGrowth, owned));
}
