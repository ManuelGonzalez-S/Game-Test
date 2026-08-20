// audio.js — efectos de sonido sintetizados (WebAudio, sin archivos). Muteable.

const Sound = (() => {
  let ctx = null, master = null, enabled = true, lastCoin = 0, lastSweep = 0;

  function ensure() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = 0.32;
      master.connect(ctx.destination);
    }
    if (ctx.state === 'suspended') ctx.resume();
    return true;
  }

  function tone(freq, dur, type, gain, delay) {
    const t0 = ctx.currentTime + (delay || 0);
    const osc = ctx.createOscillator(), g = ctx.createGain();
    osc.type = type || 'sine';
    osc.frequency.setValueAtTime(freq, t0);
    g.gain.setValueAtTime(0, t0);
    g.gain.linearRampToValueAtTime(gain, t0 + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g); g.connect(master);
    osc.start(t0); osc.stop(t0 + dur + 0.02);
  }

  // Ráfaga de ruido (para el barrido del empujador).
  function noise(dur, gain, freq) {
    const t0 = ctx.currentTime;
    const n = Math.floor(ctx.sampleRate * dur);
    const buf = ctx.createBuffer(1, n, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
    const src = ctx.createBufferSource(); src.buffer = buf;
    const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = freq; bp.Q.value = 0.8;
    const g = ctx.createGain(); g.gain.setValueAtTime(gain, t0); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(bp); bp.connect(g); g.connect(master);
    src.start(t0);
  }

  // Tintineo metálico al banquear (con paso variable; limitado para no saturar).
  function coin() {
    if (!enabled || !ensure()) return;
    const now = ctx.currentTime;
    if (now - lastCoin < 0.045) return;
    lastCoin = now;
    const f = 1500 + Math.random() * 600;
    tone(f, 0.07, 'triangle', 0.22);
    tone(f * 1.5, 0.05, 'sine', 0.1, 0.004);
  }
  function buy() {
    if (!enabled || !ensure()) return;
    tone(523.25, 0.1, 'triangle', 0.32);
    tone(659.25, 0.13, 'triangle', 0.32, 0.05);
  }
  function ascend() {
    if (!enabled || !ensure()) return;
    [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => tone(f, 0.5, 'triangle', 0.4, i * 0.08));
    tone(261.63, 0.7, 'sine', 0.28);
  }
  function sweep() {
    if (!enabled || !ensure()) return;
    const now = ctx.currentTime;
    if (now - lastSweep < 0.12) return;
    lastSweep = now;
    noise(0.16, 0.10, 850);
  }

  function setEnabled(v) { enabled = !!v; if (enabled) ensure(); }
  function isEnabled() { return enabled; }

  return { coin, buy, ascend, sweep, setEnabled, isEnabled };
})();
