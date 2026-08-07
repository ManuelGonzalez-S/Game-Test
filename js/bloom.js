// bloom.js — evolución visual del planeta y sistema de eras.
// Calcula la "vida" (0..1) y la era actual a partir de las esporas totales,
// puebla continentes/vegetación en el SVG y dispara celebraciones al subir de era.

const Bloom = (() => {
  let svg, landG, vegG, eraLabel, eraFill, flash;
  let currentStage = 0;
  let lastLife = -1;
  let onStageUp = null;

  // Continentes: blobs orgánicos fijos dentro de la esfera (viewBox 0..200).
  const CONTINENTS = [
    'M52,64 q22,-20 46,-8 q24,12 14,36 q-12,28 -42,22 q-28,-6 -30,-30 q-2,-14 12,-20 z',
    'M120,58 q20,-8 30,10 q8,18 -8,28 q-20,12 -34,-2 q-10,-16 0,-28 q4,-12 12,-16 z',
    'M78,128 q18,-14 40,-4 q18,10 10,30 q-12,22 -38,16 q-22,-6 -24,-24 q-1,-12 12,-18 z',
  ];
  // Motas de vegetación (posiciones fijas sobre los continentes).
  const VEG = [
    [60, 72], [72, 66], [84, 80], [70, 90], [92, 74], [58, 84],
    [128, 66], [138, 74], [126, 82], [146, 66],
    [92, 132], [104, 124], [116, 138], [98, 146], [86, 128], [110, 150],
  ];

  function init(stageUpCallback) {
    onStageUp = stageUpCallback;
    svg = document.getElementById('planet-svg');
    landG = svg.querySelector('.p-land');
    vegG = svg.querySelector('.p-veg');
    eraLabel = document.getElementById('era-label');
    eraFill = document.getElementById('era-fill');
    flash = document.getElementById('flash');

    // Poblar continentes.
    for (const d of CONTINENTS) {
      const p = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      p.setAttribute('d', d);
      landG.appendChild(p);
    }
    // Poblar vegetación.
    for (const [x, y] of VEG) {
      const c = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      c.setAttribute('cx', x);
      c.setAttribute('cy', y);
      c.setAttribute('r', 3.2);
      vegG.appendChild(c);
    }

    currentStage = stageIndex(state.totalSpores);
    update(true); // pinta el estado inicial sin celebrar
  }

  // Vida continua 0..1 en escala logarítmica (≈1 en la última era).
  function lifeValue(total) {
    const last = GAME_DATA.stages[GAME_DATA.stages.length - 1].at;
    const maxLog = Math.log10(last + 1);
    return Math.max(0, Math.min(1, Math.log10(total + 1) / maxLog));
  }

  // Índice de la era actual (la más alta cuyo umbral ya se alcanzó).
  function stageIndex(total) {
    const s = GAME_DATA.stages;
    let idx = 0;
    for (let i = 0; i < s.length; i++) if (total >= s[i].at) idx = i;
    return idx;
  }

  function update(silent = false) {
    const total = state.totalSpores;
    const life = lifeValue(total);

    // Solo tocamos el DOM cuando la vida cambia de forma apreciable.
    if (Math.abs(life - lastLife) >= 0.004) {
      svg.style.setProperty('--life', life.toFixed(3));
      Particles.setLife(life);
      lastLife = life;
    }

    const idx = stageIndex(total);
    const stages = GAME_DATA.stages;
    const stage = stages[idx];
    const next = stages[idx + 1];

    eraLabel.textContent = stage.emoji + ' ' + stage.name;

    // Progreso hacia la siguiente era (escala log entre umbrales).
    let pct = 1;
    if (next) {
      const lo = Math.log10(stage.at + 1);
      const hi = Math.log10(next.at + 1);
      const cur = Math.log10(total + 1);
      pct = Math.max(0, Math.min(1, (cur - lo) / (hi - lo)));
    }
    eraFill.style.width = (pct * 100).toFixed(1) + '%';

    // ¿Subida de era?
    if (idx > currentStage) {
      const jumped = idx;
      currentStage = idx;
      if (!silent) celebrate(stages[jumped]);
    }
  }

  // Reinicia el seguimiento de eras (tras florecer: el planeta vuelve a nacer).
  function reset() {
    currentStage = stageIndex(state.totalSpores);
    lastLife = -1;
    update(true);
  }

  function celebrate(stage) {
    Particles.celebrate();
    if (flash) {
      flash.classList.remove('show');
      void flash.offsetWidth;
      flash.classList.add('show');
    }
    if (typeof Sound !== 'undefined') Sound.stageUp();
    if (onStageUp) onStageUp(stage);
  }

  return { init, update, reset };
})();
