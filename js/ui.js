// ui.js — render del estado en el DOM, eventos y feedback visual.

const UI = (() => {
  const el = {};
  let _generatorNodes = {}; // id -> { row, cost, count, desc }
  let _upgradeNodes = {};   // id -> card
  let _upgSignature = '';
  let _activeTab = 'gen';
  let _lastPerSec = -1;
  let _lastTap = -1;
  let _combo = 0;
  let _lastTapTime = 0;

  function cache() {
    el.spores = document.getElementById('spores');
    el.perSec = document.getElementById('per-sec');
    el.perTap = document.getElementById('per-tap');
    el.planet = document.getElementById('planet');
    el.tapHint = document.getElementById('tap-hint');
    el.generators = document.getElementById('generators');
    el.upgrades = document.getElementById('upgrades');
    el.tabGen = document.getElementById('tab-gen');
    el.tabUpg = document.getElementById('tab-upg');
    el.upgBadge = document.getElementById('upg-badge');
    el.fx = document.getElementById('fx');
    el.btnSave = document.getElementById('btn-save');
    el.btnReset = document.getElementById('btn-reset');
    el.btnSound = document.getElementById('btn-sound');
  }

  // Construye las filas de generadores una sola vez.
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
        desc: row.querySelector('.gen-desc'),
      };
    }
  }

  function onBuy(genId) {
    const before = state.generators[genId] || 0;
    if (buyGenerator(genId)) {
      const after = state.generators[genId];
      render();
      pulse(_generatorNodes[genId].row);
      if (typeof Sound !== 'undefined') Sound.buy();
      // ¿Se ha alcanzado un milestone? (x2 producción del generador)
      if (GAME_DATA.milestones.includes(after)) {
        const gen = GAME_DATA.generators.find(g => g.id === genId);
        toast('⭐ ' + gen.name + ' ×2 producción');
        const row = _generatorNodes[genId].row;
        row.classList.remove('milestone');
        void row.offsetWidth;
        row.classList.add('milestone');
        if (typeof Sound !== 'undefined') Sound.stageUp();
      }
    } else {
      // Feedback de "no puedes permitírtelo"
      const node = _generatorNodes[genId];
      node.row.classList.remove('shake');
      void node.row.offsetWidth; // reflow para reiniciar animación
      node.row.classList.add('shake');
    }
  }

  function onBuyUpgrade(id) {
    if (buyUpgrade(id)) {
      if (typeof Sound !== 'undefined') Sound.buy();
      toast('⚡ Mejora: ' + upgradeById(id).name);
      render();
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
    const perTap = clickValue();
    if (perTap !== _lastTap) {
      el.perTap.textContent = '👆 +' + formatNumber(perTap);
      _lastTap = perTap;
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

      // Info de milestone (o descripción si aún no se ha comprado ninguno).
      if (owned > 0) {
        const mult = milestoneMultiplier(owned);
        const nx = nextMilestone(owned);
        node.desc.textContent = '×' + mult + ' producción' +
          (nx ? ' · próx. ×2 a los ' + nx : ' · ¡al máximo!');
        node.desc.classList.add('is-meta');
      } else {
        node.desc.textContent = gen.desc;
        node.desc.classList.remove('is-meta');
      }
    }

    renderUpgrades();
    Bloom.update();
  }

  // Renderiza las mejoras disponibles (desbloqueadas y no compradas).
  function renderUpgrades() {
    const visible = GAME_DATA.upgrades.filter(
      u => !isPurchased(u.id) && upgradeUnlocked(u)
    );
    const sig = visible.map(u => u.id).join(',');

    // Reconstruye la lista solo si cambia el conjunto visible.
    if (sig !== _upgSignature) {
      _upgSignature = sig;
      el.upgrades.innerHTML = '';
      _upgradeNodes = {};
      if (visible.length === 0) {
        const empty = document.createElement('div');
        empty.className = 'upg-empty';
        empty.textContent = 'Aún no hay mejoras. ¡Sigue creciendo! 🌱';
        el.upgrades.appendChild(empty);
      }
      for (const u of visible) {
        const card = document.createElement('button');
        card.className = 'gen-row upg-row';
        card.setAttribute('data-id', u.id);
        card.innerHTML = `
          <span class="gen-emoji">${u.emoji}</span>
          <span class="gen-info">
            <span class="gen-name">${u.name}</span>
            <span class="gen-desc">${u.desc}</span>
          </span>
          <span class="gen-buy">
            <span class="gen-cost">${formatNumber(u.cost)} 🌱</span>
          </span>`;
        card.addEventListener('click', () => onBuyUpgrade(u.id));
        el.upgrades.appendChild(card);
        _upgradeNodes[u.id] = card;
      }
    }

    // Actualiza asequibilidad y el contador de la pestaña.
    let affordCount = 0;
    for (const u of visible) {
      const node = _upgradeNodes[u.id];
      if (!node) continue;
      const aff = state.spores >= u.cost;
      node.classList.toggle('affordable', aff);
      node.classList.toggle('locked', !aff);
      if (aff) affordCount++;
    }
    if (affordCount > 0) {
      el.upgBadge.hidden = false;
      el.upgBadge.textContent = affordCount;
    } else {
      el.upgBadge.hidden = true;
    }
  }

  function setTab(tab) {
    _activeTab = tab;
    el.tabGen.classList.toggle('active', tab === 'gen');
    el.tabUpg.classList.toggle('active', tab === 'upg');
    el.generators.hidden = tab !== 'gen';
    el.upgrades.hidden = tab !== 'upg';
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

    el.tabGen.addEventListener('click', () => setTab('gen'));
    el.tabUpg.addEventListener('click', () => setTab('upg'));
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
