// audio.js — efectos de sonido sintetizados con WebAudio (sin archivos).
// Todo se genera al vuelo: toque, compra y subida de era. Muteable.

const Sound = (() => {
  let ctx = null;
  let master = null;
  let enabled = true;

  function ensure() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = 0.35; // volumen general, suave
      master.connect(ctx.destination);
    }
    // Los navegadores exigen reanudar tras un gesto del usuario.
    if (ctx.state === 'suspended') ctx.resume();
    return true;
  }

  // Un tono con envolvente suave (ataque + caída exponencial).
  function tone(freq, dur, type = 'sine', gain = 0.6, delay = 0) {
    if (!ctx) return;
    const t0 = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    g.gain.setValueAtTime(0, t0);
    g.gain.linearRampToValueAtTime(gain, t0 + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g);
    g.connect(master);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }

  // Toque en el planeta: "bloop" corto con tono variable (más agudo en racha).
  function tap(pitch = 0) {
    if (!enabled || !ensure()) return;
    const base = 420 + pitch * 12;
    tone(base, 0.12, 'sine', 0.5);
    tone(base * 1.5, 0.08, 'triangle', 0.18);
  }

  // Compra de generador: dos notas ascendentes agradables.
  function buy() {
    if (!enabled || !ensure()) return;
    tone(523.25, 0.12, 'triangle', 0.4);          // C5
    tone(659.25, 0.16, 'triangle', 0.4, 0.06);    // E5
  }

  // Subida de era: arpegio brillante (celebración).
  function stageUp() {
    if (!enabled || !ensure()) return;
    const notes = [523.25, 659.25, 783.99, 1046.5]; // C5 E5 G5 C6
    notes.forEach((f, i) => tone(f, 0.5, 'triangle', 0.45, i * 0.09));
    tone(261.63, 0.7, 'sine', 0.3); // fundamental grave
  }

  function setEnabled(v) {
    enabled = !!v;
    if (enabled) ensure();
  }
  function isEnabled() { return enabled; }

  return { tap, buy, stageUp, setEnabled, isEnabled };
})();
