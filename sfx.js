// LONEWOLF OS sound engine: every sound is synthesized live with the Web Audio API (no audio files).
{
let ctx = null, master = null;
const cfg = () => { try { return JSON.parse(localStorage.getItem('lw-sfx') || '{}'); } catch (e) { return {}; } };
const enabled = () => cfg().on !== false;
const volume = () => (cfg().vol ?? 0.6);

function ac() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain(); master.gain.value = volume(); master.connect(ctx.destination);
  }
  if (ctx.state === 'suspended') ctx.resume().catch(() => {});
  return ctx;
}
// first tap anywhere unlocks audio (browser rule)
['pointerdown', 'keydown'].forEach(ev => addEventListener(ev, () => ac(), { once: false, passive: true }));

// ---------- building blocks ----------
function tone({ f = 440, f2 = null, t = 0, d = 0.12, type = 'sine', g = 0.25, a = 0.004 }) {
  const c = ac(); if (!c) return;
  const o = c.createOscillator(), v = c.createGain(), s = c.currentTime + t;
  o.type = type; o.frequency.setValueAtTime(f, s);
  if (f2) o.frequency.exponentialRampToValueAtTime(f2, s + d);
  v.gain.setValueAtTime(0, s); v.gain.linearRampToValueAtTime(g, s + a); v.gain.exponentialRampToValueAtTime(0.0001, s + d);
  o.connect(v); v.connect(master); o.start(s); o.stop(s + d + 0.02);
}
let noiseBuf = null;
function noise({ t = 0, d = 0.1, g = 0.2, f = 2000, q = 1, type = 'bandpass', f2 = null }) {
  const c = ac(); if (!c) return;
  if (!noiseBuf) { noiseBuf = c.createBuffer(1, c.sampleRate, c.sampleRate); const ch = noiseBuf.getChannelData(0); for (let i = 0; i < ch.length; i++) ch[i] = Math.random() * 2 - 1; }
  const src = c.createBufferSource(), flt = c.createBiquadFilter(), v = c.createGain(), s = c.currentTime + t;
  src.buffer = noiseBuf; flt.type = type; flt.frequency.setValueAtTime(f, s); flt.Q.value = q;
  if (f2) flt.frequency.exponentialRampToValueAtTime(f2, s + d);
  v.gain.setValueAtTime(g, s); v.gain.exponentialRampToValueAtTime(0.0001, s + d);
  src.connect(flt); flt.connect(v); v.connect(master); src.start(s, Math.random() * 0.5); src.stop(s + d + 0.02);
}
// digital "bit crunch": rapid random square blips
function crunch(t, d, g = 0.08, lo = 200, hi = 3000) {
  for (let x = 0; x < d; x += 0.012) tone({ f: lo + Math.random() * (hi - lo), t: t + x, d: 0.01, type: 'square', g });
}

// ---------- the sound set ----------
const S = {
  tick() { tone({ f: 1800, d: 0.025, type: 'square', g: 0.05 }); },
  nav() { tone({ f: 900, f2: 1400, d: 0.05, type: 'triangle', g: 0.08 }); noise({ d: 0.04, g: 0.04, f: 6000 }); },
  glitch() { crunch(0, 0.12, 0.05, 80, 1800); noise({ d: 0.12, g: 0.08, f: 1200, q: 8, f2: 300 }); },
  flip() { noise({ d: 0.18, g: 0.12, f: 400, f2: 3000, q: 2 }); },
  type() { tone({ f: 2200 + Math.random() * 600, d: 0.012, type: 'square', g: 0.025 }); },
  granted() { // access granted: rising triad + digital sparkle
    [523, 659, 784, 1047].forEach((f, i) => tone({ f, t: i * 0.07, d: 0.16, type: 'triangle', g: 0.16 }));
    crunch(0.28, 0.08, 0.03, 2000, 5000);
  },
  denied() { // trace detected: low warning buzz
    tone({ f: 220, f2: 110, d: 0.32, type: 'sawtooth', g: 0.12 });
    tone({ f: 233, f2: 116, d: 0.32, type: 'square', g: 0.05, t: 0.02 });
  },
  breach() { // mission cleared: data burst then lock-on
    crunch(0, 0.25, 0.05, 300, 4000);
    noise({ t: 0, d: 0.3, g: 0.1, f: 500, f2: 5000, q: 3 });
    [784, 988, 1319].forEach((f, i) => tone({ f, t: 0.3 + i * 0.08, d: 0.22, type: 'sine', g: 0.2 }));
  },
  rankup() {
    [523, 659, 784, 1047, 1319].forEach((f, i) => tone({ f, t: i * 0.09, d: 0.35, type: 'triangle', g: 0.18 }));
    noise({ t: 0.45, d: 0.6, g: 0.06, f: 8000, type: 'highpass' });
  },
  deploy() { // upload: sweep up + confirm
    tone({ f: 200, f2: 1600, d: 0.45, type: 'sawtooth', g: 0.06 });
    crunch(0.1, 0.3, 0.03, 600, 3000);
    tone({ f: 1568, t: 0.5, d: 0.2, type: 'sine', g: 0.2 }); tone({ f: 2093, t: 0.6, d: 0.25, type: 'sine', g: 0.18 });
  },
  sync() { tone({ f: 1320, d: 0.07, type: 'sine', g: 0.1 }); tone({ f: 1760, t: 0.08, d: 0.1, type: 'sine', g: 0.1 }); },
  run() { crunch(0, 0.15, 0.03, 800, 3000); },
  uplink() { // satellite connection: carrier, handshake chirps, static, lock
    tone({ f: 60, f2: 90, d: 2.2, type: 'sine', g: 0.12, a: 0.3 });                       // carrier hum
    noise({ d: 2.0, g: 0.05, f: 1500, q: 0.7 });                                          // static bed
    [0.25, 0.55, 0.85].forEach((t, i) => tone({ f: 900 + i * 300, f2: 2400 + i * 400, t, d: 0.18, type: 'sine', g: 0.12 })); // sweep pings
    for (let i = 0; i < 10; i++) tone({ f: i % 2 ? 1200 : 2100, t: 1.05 + i * 0.045, d: 0.04, type: 'square', g: 0.05 }); // modem handshake
    crunch(1.5, 0.25, 0.04, 400, 5000);                                                    // data burst
    tone({ f: 1760, t: 1.85, d: 0.12, type: 'sine', g: 0.2 }); tone({ f: 2637, t: 1.97, d: 0.3, type: 'sine', g: 0.18 }); // lock-on
  }
};

window.SFX = {
  play(name) { if (!enabled() || !S[name]) return; try { if (master) master.gain.value = volume(); S[name](); } catch (e) {} },
  get on() { return enabled(); },
  set(opts) { const c = Object.assign(cfg(), opts); try { localStorage.setItem('lw-sfx', JSON.stringify(c)); } catch (e) {} if (master) master.gain.value = volume(); },
  volume, unlocked: () => !!ctx && ctx.state === 'running', ac
};
}
