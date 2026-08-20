// ui.js — HUD, interacción con el canvas y modales.

const UI = (() => {
  const el = {};
  let _swapIndex = -1;
  let _skillNodes = {};
  let _trackNodes = {};
  const BRANCH_EMOJI = { 'Producción': '🏭', 'Estaciones': '⚙️', 'Meta': '💎' };

  function cache() {
    el.money = document.getElementById('money');
    el.rate = document.getElementById('rate');
    el.tierLabel = document.getElementById('tier-label');
    el.diamonds = document.getElementById('diamonds');
    el.board = document.getElementById('board');
    el.tierFill = document.getElementById('tier-fill');
    el.tierText = document.getElementById('tier-text');
    el.tracks = document.getElementById('tracks');
    el.btnAscend = document.getElementById('btn-ascend');
    el.ascendInfo = document.getElementById('ascend-info');
    el.btnSkills = document.getElementById('btn-skills');
    el.btnBackup = document.getElementById('btn-backup');
    el.btnReset = document.getElementById('btn-reset');
    // swap modal
    el.swapModal = document.getElementById('swap-modal');
    el.swapClose = document.getElementById('swap-close');
    el.swapInfo = document.getElementById('swap-info');
    el.swapList = document.getElementById('swap-list');
    // skills modal
    el.skillsModal = document.getElementById('skills-modal');
    el.skillsClose = document.getElementById('skills-close');
    el.skillsList = document.getElementById('skills-list');
    el.skillsDiamonds = document.getElementById('skills-diamonds');
    // backup modal
    el.saveModal = document.getElementById('save-modal');
    el.saveClose = document.getElementById('save-close');
    el.saveCode = document.getElementById('save-code');
    el.saveCopy = document.getElementById('save-copy');
    el.saveImport = document.getElementById('save-import');
    el.saveImportBtn = document.getElementById('save-import-btn');
  }

  // ---- HUD ----
  function renderHud() {
    el.money.textContent = formatNumber(state.money);
    el.rate.textContent = formatNumber(state.rate) + '/s';
    el.tierLabel.textContent = 'Tier ' + state.tier;
    el.diamonds.textContent = formatNumber(state.diamonds);

    const goal = tierGoal();
    el.tierFill.style.width = (tierProgress() * 100).toFixed(1) + '%';
    el.tierText.textContent = formatNumber(state.bankedThisTier) + ' / ' + formatNumber(goal);

    renderTracks();

    const can = canAscend();
    el.btnAscend.disabled = !can;
    el.btnAscend.classList.toggle('ready', can);
    if (can) {
      const g = Math.max(1, Math.floor(GAME.diamondReward(state.tier) * skillProduct('diamondMult')));
      el.ascendInfo.textContent = '+' + g + ' 💎 · nuevo recorrido';
    } else {
      el.ascendInfo.textContent = 'Llena la meta del tier';
    }
  }

  // ---- Mejoras por partes ----
  function buildTracks() {
    el.tracks.innerHTML = '';
    _trackNodes = {};
    for (const t of GAME.tracks) {
      const b = document.createElement('button');
      b.className = 'track';
      b.innerHTML = `
        <span class="track-ico" style="color:${t.color}">${Icons.markup(t.ico, { size: 20, stroke: t.color })}</span>
        <span class="track-name">${t.name}</span>
        <span class="track-lvl"></span>
        <span class="track-cost"></span>`;
      b.addEventListener('click', () => {
        if (buyTrack(t.id)) { if (typeof Sound !== 'undefined') Sound.buy(); renderHud(); saveGame(); }
        else { b.classList.remove('shake'); void b.offsetWidth; b.classList.add('shake'); }
      });
      el.tracks.appendChild(b);
      _trackNodes[t.id] = b;
    }
  }
  function renderTracks() {
    for (const t of GAME.tracks) {
      const b = _trackNodes[t.id];
      if (!b) continue;
      b.querySelector('.track-lvl').textContent = 'Nv.' + trackLevel(t.id);
      b.querySelector('.track-cost').textContent = formatNumber(trackCost(t.id));
      b.classList.toggle('affordable', canBuyTrack(t.id));
    }
  }

  // ---- Tap en el canvas -> estación ----
  function onBoardTap(e) {
    const geo = Route.get();
    if (!geo) return;
    const r = el.board.getBoundingClientRect();
    const x = (e.touches ? e.touches[0].clientX : e.clientX) - r.left;
    const y = (e.touches ? e.touches[0].clientY : e.clientY) - r.top;
    let best = -1, bestD = 32;
    for (const st of geo.stations) {
      const d = Math.hypot(st.pos.x - x, st.pos.y - y);
      if (d < bestD) { bestD = d; best = st.index; }
    }
    if (best >= 0) openSwap(best);
  }

  // ---- Modal: cambiar estación ----
  function openSwap(index) {
    _swapIndex = index;
    const left = maxSwaps() - state.swapsUsed;
    const cost = swapCost();
    el.swapInfo.innerHTML = 'Cambios restantes este tier: <strong>' + left + '</strong>' +
      ' · Coste: <strong>' + formatNumber(cost) + ' 💰</strong>';
    el.swapList.innerHTML = '';
    const current = state.route.slots[index];
    for (const key of ['mult', 'forge', 'casino', 'split']) {
      const def = GAME.stations[key];
      const opt = document.createElement('button');
      opt.className = 'opt' + (key === current ? ' current' : '');
      opt.innerHTML = `
        <span class="opt-badge" style="color:${def.color}">${Icons.markup(def.ico, { size: 22, stroke: def.color })}</span>
        <span class="opt-info">
          <span class="opt-name">${def.name}${key === current ? ' · actual' : ''}</span>
          <span class="opt-desc">${stationDesc(key)}</span>
        </span>`;
      const affordable = left > 0 && state.money >= cost && key !== current;
      opt.disabled = !affordable;
      opt.addEventListener('click', () => {
        if (doSwap(index, key)) {
          if (typeof Sound !== 'undefined') Sound.buy();
          closeSwap(); renderHud(); saveGame();
          toast('🔧 Estación cambiada a ' + def.name);
        }
      });
      el.swapList.appendChild(opt);
    }
    el.swapModal.hidden = false;
  }
  function closeSwap() { el.swapModal.hidden = true; }
  function stationDesc(key) {
    switch (key) {
      case 'mult': return 'Multiplica el valor de la moneda (×' + multPower() + ').';
      case 'forge': return 'Sube el tier de la moneda (' + Math.round(forgeChance() * 100) + '%).';
      case 'casino': return 'Apuesta: ×' + GAME.power.casinoMult + ' (' + Math.round(casinoWinChance() * 100) + '%) o la pierde.';
      case 'split': return 'Divide la moneda en 2 (cada una ×' + splitFactor().toFixed(2) + ').';
    }
    return '';
  }

  // ---- Modal: árbol de habilidades ----
  function buildSkills() {
    el.skillsList.innerHTML = '';
    _skillNodes = {};
    const order = [], byBranch = {};
    for (const n of GAME.skills) {
      if (!byBranch[n.branch]) { byBranch[n.branch] = []; order.push(n.branch); }
      byBranch[n.branch].push(n);
    }
    for (const b of order) {
      const h = document.createElement('div');
      h.className = 'tree-branch';
      h.textContent = b;
      el.skillsList.appendChild(h);
      for (const n of byBranch[b]) {
        const card = document.createElement('button');
        card.className = 'node';
        card.innerHTML = `
          <span class="node-badge">${Icons.markup(n.ico, { size: 20 })}</span>
          <span class="node-info"><span class="node-name">${n.name}</span>
            <span class="node-desc">${n.desc}</span></span>
          <span class="node-cost"></span>`;
        card.addEventListener('click', () => {
          if (buySkill(n.id)) {
            if (typeof Sound !== 'undefined') Sound.buy();
            renderSkills(); renderHud(); saveGame();
            toast('💎 ' + n.name);
          }
        });
        el.skillsList.appendChild(card);
        _skillNodes[n.id] = card;
      }
    }
  }
  function renderSkills() {
    el.skillsDiamonds.innerHTML = Icons.markup('gem', { size: 14, stroke: '#5cc8ff' }) +
      ' ' + formatNumber(state.diamonds);
    for (const n of GAME.skills) {
      const card = _skillNodes[n.id];
      if (!card) continue;
      const st = skillState(n);
      card.classList.toggle('owned', st === 'owned');
      card.classList.toggle('available', st === 'available');
      card.classList.toggle('locked', st === 'locked');
      card.classList.toggle('expensive', st === 'expensive');
      const costEl = card.querySelector('.node-cost');
      if (st === 'owned') costEl.textContent = '✓';
      else if (st === 'locked') costEl.textContent = '';
      else costEl.innerHTML = n.cost + ' ' + Icons.markup('gem', { size: 13, stroke: '#5cc8ff' });
      card.disabled = st !== 'available';
    }
  }
  function openSkills() { renderSkills(); el.skillsModal.hidden = false; }
  function closeSkills() { el.skillsModal.hidden = true; }

  // ---- Backup ----
  function openBackup() { el.saveCode.value = exportSave(); el.saveImport.value = ''; el.saveModal.hidden = false; }
  function closeBackup() { el.saveModal.hidden = true; }
  function copyBackup() {
    const code = el.saveCode.value;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(code).then(() => toast('📋 Copiado')).catch(sel);
    } else sel();
    function sel() { el.saveCode.select(); try { document.execCommand('copy'); toast('📋 Copiado'); } catch (e) {} }
  }
  function doImport() {
    if (!el.saveImport.value.trim()) { toast('Pega un código'); return; }
    if (importSave(el.saveImport.value)) {
      closeBackup(); Route.rebuild(); clearCoins(); renderHud();
      if (_skillNodes && Object.keys(_skillNodes).length) renderSkills();
      toast('✅ Partida restaurada');
    } else toast('❌ Código no válido');
  }

  // ---- Acciones ----
  function onAscend() {
    if (!canAscend()) return;
    const gain = ascend();
    if (gain > 0) {
      renderHud(); saveGame();
      toast('✨ ¡Tier ' + state.tier + '! +' + gain + ' 💎 · nuevo recorrido');
    }
  }
  function onReset() {
    if (confirm('¿Reiniciar TODO el progreso? No se puede deshacer.')) {
      resetGame(); Route.newForTier(1); Route.rebuild(); clearCoins(); renderHud();
      toast('♻️ Reiniciado');
    }
  }

  function toast(msg) {
    const t = document.createElement('div');
    t.className = 'toast'; t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(() => t.classList.add('show'), 10);
    setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 300); }, 2200);
  }

  function bind() {
    el.board.addEventListener('pointerdown', onBoardTap);
    el.board.addEventListener('contextmenu', e => e.preventDefault());
    el.btnAscend.addEventListener('click', onAscend);
    el.btnReset.addEventListener('click', onReset);
    el.btnSkills.addEventListener('click', openSkills);
    el.skillsClose.addEventListener('click', closeSkills);
    el.skillsModal.addEventListener('click', e => { if (e.target === el.skillsModal) closeSkills(); });
    el.swapClose.addEventListener('click', closeSwap);
    el.swapModal.addEventListener('click', e => { if (e.target === el.swapModal) closeSwap(); });
    el.btnBackup.addEventListener('click', openBackup);
    el.saveClose.addEventListener('click', closeBackup);
    el.saveCopy.addEventListener('click', copyBackup);
    el.saveImportBtn.addEventListener('click', doImport);
    el.saveModal.addEventListener('click', e => { if (e.target === el.saveModal) closeBackup(); });
  }

  function init() {
    cache();
    Icons.inject();          // rellena los <i data-ico> estáticos
    Render.init(el.board);
    buildTracks();
    buildSkills();
    bind();
    renderHud();
  }

  return { init, renderHud, toast, boardEl: () => el.board };
})();
