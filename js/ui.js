// ui.js — render del estado en el DOM, eventos y feedback visual.

const UI = (() => {
  const el = {};
  let _generatorNodes = {}; // id -> { row, cost, count, affordable }
  let _lastPerSec = -1;

  function cache() {
    el.spores = document.getElementById('spores');
    el.perSec = document.getElementById('per-sec');
    el.planet = document.getElementById('planet');
    el.planetBody = document.getElementById('planet-body');
    el.tapHint = document.getElementById('tap-hint');
    el.generators = document.getElementById('generators');
    el.fx = document.getElementById('fx');
    el.btnSave = document.getElementById('btn-save');
    el.btnReset = document.getElementById('btn-reset');
  }

  // Construye las filas de la tienda una sola vez.
  function buildShop() {
    el.generators.innerHTML = '';
    _generatorNodes = {};
    for (const gen of GAME_DATA.generators) {
      const row = document.createElement('button');
      row.className = 'gen-row';
      row.setAttribute('data-id', gen.id);
      row.innerHTML = `
        <span class="gen-emoji">${gen.emoji}</span>
        <span class="gen-info">
          <span class="gen-name">${gen.name}</span>
          <span class="gen-desc">${gen.desc}</span>
        </span>
        <span class="gen-buy">
          <span class="gen-cost">0</span>
          <span class="gen-count">0</span>
        </span>`;
      row.addEventListener('click', () => onBuy(gen.id));
      el.generators.appendChild(row);
      _generatorNodes[gen.id] = {
        row,
        cost: row.querySelector('.gen-cost'),
        count: row.querySelector('.gen-count'),
      };
    }
  }

  function onBuy(genId) {
    if (buyGenerator(genId)) {
      render();
      pulse(_generatorNodes[genId].row);
    } else {
      // Feedback de "no puedes permitírtelo"
      const node = _generatorNodes[genId];
      node.row.classList.remove('shake');
      void node.row.offsetWidth; // reflow para reiniciar animación
      node.row.classList.add('shake');
    }
  }

  // Número flotante al tocar el planeta.
  function floatText(x, y, text) {
    const span = document.createElement('span');
    span.className = 'float-num';
    span.textContent = '+' + text;
    span.style.left = x + 'px';
    span.style.top = y + 'px';
    el.fx.appendChild(span);
    span.addEventListener('animationend', () => span.remove());
  }

  function pulse(node) {
    node.classList.remove('pulse');
    void node.offsetWidth;
    node.classList.add('pulse');
  }

  function onPlanetTap(evt) {
    const value = doClick();

    // Posición del toque para el número flotante.
    let x, y;
    if (evt.touches && evt.touches[0]) {
      x = evt.touches[0].clientX; y = evt.touches[0].clientY;
    } else if (evt.clientX !== undefined) {
      x = evt.clientX; y = evt.clientY;
    } else {
      const r = el.planet.getBoundingClientRect();
      x = r.left + r.width / 2; y = r.top + r.height / 2;
    }
    floatText(x, y, formatNumber(value));

    // Feedback: pulso + vibración opcional.
    el.planet.classList.remove('tapped');
    void el.planet.offsetWidth;
    el.planet.classList.add('tapped');
    if (navigator.vibrate) navigator.vibrate(8);

    if (el.tapHint) el.tapHint.style.opacity = '0';
    render();
  }

  // Actualiza el aspecto del planeta según el total de esporas (bloom básico).
  function updatePlanet() {
    const t = state.totalSpores;
    // 0..1 en escala logarítmica hasta ~1e7.
    const life = Math.max(0, Math.min(1, Math.log10(t + 1) / 7));
    el.planetBody.style.setProperty('--life', life.toFixed(3));
  }

  function render() {
    el.spores.textContent = formatNumber(state.spores);

    const perSec = passiveProduction();
    if (perSec !== _lastPerSec) {
      el.perSec.textContent = formatRate(perSec);
      _lastPerSec = perSec;
    }

    for (const gen of GAME_DATA.generators) {
      const node = _generatorNodes[gen.id];
      const owned = state.generators[gen.id] || 0;
      const cost = generatorCost(gen, owned);
      node.cost.textContent = formatNumber(cost) + ' 🌱';
      node.count.textContent = owned;
      const affordable = state.spores >= cost;
      node.row.classList.toggle('affordable', affordable);
      node.row.classList.toggle('locked', !affordable);
    }

    updatePlanet();
  }

  function bindEvents() {
    // Usamos pointerdown para respuesta inmediata en móvil.
    el.planet.addEventListener('pointerdown', onPlanetTap);
    // Evita el menú contextual de mantener pulsado en móvil.
    el.planet.addEventListener('contextmenu', e => e.preventDefault());

    el.btnSave.addEventListener('click', () => {
      if (saveGame()) toast('Partida guardada 💾');
    });
    el.btnReset.addEventListener('click', () => {
      if (confirm('¿Seguro que quieres reiniciar? Perderás todo el progreso.')) {
        resetGame();
        render();
        toast('Jardín reiniciado ♻️');
      }
    });
  }

  // Aviso breve tipo "toast".
  function toast(msg) {
    const t = document.createElement('div');
    t.className = 'toast';
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(() => t.classList.add('show'), 10);
    setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 300); }, 2200);
  }

  function init() {
    cache();
    buildShop();
    bindEvents();
    render();
  }

  return { init, render, toast, floatText };
})();
