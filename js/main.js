// main.js — arranque del juego.

(function start() {
  // 1. Cargar partida (o empezar nueva).
  loadGame();

  // 2. Progreso offline antes de inicializar UI.
  const offlineGain = applyOfflineProgress();

  // 3. Inicializar interfaz.
  UI.init();

  // 4. Mensaje de bienvenida si hubo progreso offline relevante.
  if (offlineGain > 1) {
    setTimeout(() => {
      UI.toast('🌙 Mientras no estabas: +' + formatNumber(offlineGain) + ' esporas');
    }, 400);
  }

  // 5. Autoguardado periódico.
  setInterval(saveGame, 15000);

  // 6. Guardar al ocultar/cerrar la pestaña (clave en móvil).
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) saveGame();
  });
  window.addEventListener('beforeunload', saveGame);
  window.addEventListener('pagehide', saveGame);

  // 7. Arrancar el game loop.
  requestAnimationFrame(gameLoop);
})();
