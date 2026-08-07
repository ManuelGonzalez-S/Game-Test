// main.js — arranque del juego.

(function start() {
  // 1. Cargar partida (o empezar nueva).
  loadGame();

  // 2. Progreso offline antes de inicializar UI.
  const offline = applyOfflineProgress();

  // 3. Inicializar interfaz.
  UI.init();

  // 4. Mensaje de bienvenida si hubo progreso offline relevante.
  if (offline.gained > 1) {
    setTimeout(() => {
      UI.toast('🌙 Ausente ' + formatDuration(offline.seconds) +
        ': +' + formatNumber(offline.gained) + ' esporas');
    }, 400);
  }

  // 5. Autoguardado periódico (frecuente para no perder progreso en móvil).
  setInterval(saveGame, 5000);

  // 6. Guardar al ocultar/cerrar la pestaña (clave en móvil).
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) saveGame();
  });
  window.addEventListener('beforeunload', saveGame);
  window.addEventListener('pagehide', saveGame);

  // 7. Arrancar el game loop.
  requestAnimationFrame(gameLoop);
})();
