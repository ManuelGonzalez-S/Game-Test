// ui.js — render del estado en el DOM, eventos y feedback visual.

const UI = (() => {
  const el = {};
  let _generatorNodes = {}; // id -> { row, cost, count, affordable }
  let _lastPerSec = -1;
  let _combo = 0;
  let _lastTapTime = 0;

  function cache() {
    el.spores = document.getElementById('spores');
    el.perSec = document.getElementById('per-sec');
    el.planet = document.getElementById('planet');
    el.tapHint = document.getElementById('tap-hint');
    el.generators = document.getElementById('generators');
    el.fx = document.getElementById('fx');
    el.btnSave = document.getElementById('btn-save');
    el.btnReset = document.getElementById('btn-reset');
    el.btnSound = document.getElementById('btn-sound');
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
      if (typeof Sound !== 'undefined') Sound.buy();
    } else {
      // Feedback de "no puedes permitírtelo"
      const node = _generatorNodes[genId];
      node.row.classList.remove('shake');
      void node.row.offsetWidth; // reflow para reiniciar animación
      node.row.classList.add('shake');
    }
  }

  // Número flotante al tocar el planeta.
  function floatText(x, y, text, combo = 0) {
    const span = document.createElement('span');
    span.className = 'float-num';
    if (combo > 6) span.classList.add('hot');
    // Pequeño desvío horizontal para que no se solapen en toques rápidos.
    const jitter = (Math.random() - 0.5) * 40;
    span.textContent = '+' + text;
    span.style.left = (x + jitter) + 'px';
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

    // Racha de toques: sube el "combo" si tocas rápido, si no se reinicia.
    const now = performance.now();
    if (now - _lastTapTime < 600) _combo = Math.min(_combo + 1, 20);
    else _combo = 0;
    _lastTapTime = now;

    // Posición del toque para el número flotante.
    let x, y;
    if (evt.clientX !== undefined && evt.clientX !== 0) {
      x = evt.clientX; y = evt.clientY;
    } else {
      const r = el.planet.getBoundingClientRect();
      x = r.left + r.width / 2; y = r.top + r.height / 2;
    }
    floatText(x, y, formatNumber(value), _combo);

    // Partículas + sonido (tono más agudo cuanto mayor el combo).
    if (typeof Particles !== 'undefined') Particles.burstTap(x, y);
    if (typeof Sound !== 'undefined') Sound.tap(_combo);

    // Feedback: pulso + vibración opcional.
    el.planet.classList.remove('tapped');
    void el.planet.offsetWidth;
    el.planet.classList.add('tapped');
    if (navigator.vibrate) navigator.vibrate(8);

    if (el.tapHint) el.tapHint.style.opacity = '0';
    render();
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

    Bloom.update();
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

    el.btnSound.addEventListener('click', () => {
      state.soundEnabled = !state.soundEnabled;
      Sound.setEnabled(state.soundEnabled);
      updateSoundBtn();
      saveGame();
    });
  }

  function updateSoundBtn() {
    el.btnSound.textContent = state.soundEnabled ? '🔊' : '🔇';
    el.btnSound.classList.toggle('muted', !state.soundEnabled);
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
    Particles.init();
    Bloom.init(onStageUp);
    Sound.setEnabled(state.soundEnabled);
    buildShop();
    bindEvents();
    updateSoundBtn();
    render();
  }

  // Callback cuando el planeta sube de era.
  function onStageUp(stage) {
    toast('✨ ¡Nueva era! ' + stage.emoji + ' ' + stage.name);
    if (navigator.vibrate) navigator.vibrate([12, 40, 20]);
  }

  return { init, render, toast, floatText };
})();
