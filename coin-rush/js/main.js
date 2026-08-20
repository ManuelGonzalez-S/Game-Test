// main.js — arranque, bucle de juego y guardado.
(function start() {
  loadGame();

  UI.init();                 // inicializa canvas + Route + HUD

  const offline = applyOfflineProgress();
  if (offline.gained > 1) {
    setTimeout(() => UI.toast('🌙 Ausente ' + formatDuration(offline.seconds) +
      ': +' + formatNumber(offline.gained) + ' 💰'), 400);
  }
  UI.renderHud();

  // Bucle
  let last = null;
  function loop(ts) {
    if (last === null) last = ts;
    let dt = (ts - last) / 1000;
    last = ts;
    if (dt > 0.25) dt = 0.25; // evita saltos tras segundo plano
    step(dt);
    Render.draw();
    UI.renderHud();
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);

  // Resize -> recalcular geometría del recorrido
  let rt;
  window.addEventListener('resize', () => {
    clearTimeout(rt);
    rt = setTimeout(() => Render.resize(), 150);
  });

  // Guardado
  setInterval(saveGame, 5000);
  document.addEventListener('visibilitychange', () => { if (document.hidden) saveGame(); });
  window.addEventListener('beforeunload', saveGame);
  window.addEventListener('pagehide', saveGame);
})();
