// ui.js — HUD, interacción con el canvas y modales.

const UI = (() => {
  const el = {};
  let _skillNodes = {};

  function cache() {
    el.money = document.getElementById('money');
    el.rate = document.getElementById('rate');
    el.tierLabel = document.getElementById('tier-label');
    el.diamonds = document.getElementById('diamonds');
    el.board = document.getElementById('board');
    el.tierFill = document.getElementById('tier-fill');
    el.tierText = document.getElementById('tier-text');
    el.btnAscend = document.getElementById('btn-ascend');
    el.ascendInfo = document.getElementById('ascend-info');
    el.btnSkills = document.getElementById('btn-skills');
    el.btnBackup = document.getElementById('btn-backup');
    el.btnReset = document.getElementById('btn-reset');
    el.btnSound = document.getElementById('btn-sound');
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

  // ---- Tap en el canvas -> mejora de la plataforma (etiqueta $precio) ----
  function onBoardTap(e) {
    const geo = Route.get();
    if (!geo) return;
    const r = el.board.getBoundingClientRect();
    const x = (e.touches ? e.touches[0].clientX : e.clientX) - r.left;
    const y = (e.touches ? e.touches[0].clientY : e.clientY) - r.top;
    // Busca la etiqueta de mejora tocada (rect calculado por el render).
    let hit = -1;
    for (const sh of geo.shelves) {
      const t = sh._tagRect;
      if (!t) continue;
      const pad = 8; // zona de toque algo más amplia que el cartel
      if (x >= t.x - pad && x <= t.x + t.w + pad && y >= t.y - pad && y <= t.y + t.h + pad) {
        hit = sh.index; break;
      }
    }
    if (hit < 0) return;
    if (buyShelfUpgrade(hit)) {
      if (typeof Sound !== 'undefined') Sound.buy();
      renderHud(); saveGame();
    } else {
      toast('Necesitas ' + formatNumber(shelfUpCost(hit)) + ' 💰');
    }
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
      if (typeof Sound !== 'undefined') Sound.ascend();
      renderHud(); saveGame();
      toast('✨ ¡Tier ' + state.tier + '! +' + gain + ' 💎 · nuevo recorrido');
    }
  }

  function toggleSound() {
    state.soundEnabled = !state.soundEnabled;
    Sound.setEnabled(state.soundEnabled);
    updateSoundBtn();
    saveGame();
  }
  function updateSoundBtn() {
    el.btnSound.innerHTML = Icons.markup(state.soundEnabled ? 'volume-2' : 'volume-x', { size: 18 });
    el.btnSound.classList.toggle('on', state.soundEnabled);
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
    el.btnSound.addEventListener('click', toggleSound);
    el.btnSkills.addEventListener('click', openSkills);
    el.skillsClose.addEventListener('click', closeSkills);
    el.skillsModal.addEventListener('click', e => { if (e.target === el.skillsModal) closeSkills(); });
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
    buildSkills();
    bind();
    if (typeof Sound !== 'undefined') Sound.setEnabled(state.soundEnabled);
    updateSoundBtn();
    renderHud();
  }

  return { init, renderHud, toast, boardEl: () => el.board };
})();
