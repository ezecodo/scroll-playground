// =============================================================
// AUDIO — synthesized ambient system, fully Web Audio API.
// No samples, no <audio> tags. AudioContext is created on the
// first toggle click (autoplay-policy compliant).
//
// Public API: window.__audio = { beep, pop, swell }
// The AudioContext and individual nodes are never exposed.
// =============================================================

// ---- Module-level state (private — not exposed) ----
let ctx = null;            // AudioContext, created lazily
let drone = null;          // continuous bed: { master, sum, lowpass, oscA, oscB, lfo, lfoGain }
let enabled = false;
let bootTonePlayed = false;

// ---- Lazy boot the AudioContext on first user gesture ----
function ensureContext() {
  if (ctx) return ctx;
  const Ctor = window.AudioContext || window.webkitAudioContext;
  if (!Ctor) return null;
  ctx = new Ctor();
  return ctx;
}

// =============================================================
// DRONE — continuous bed while audio is ON
// Two slightly detuned sines (50Hz + 50.7Hz) beat at 0.7Hz —
// that beat IS the "breath". A slow LFO modulates the sum gain
// for an additional, larger-scale breath.
// =============================================================
function buildDrone() {
  const now = ctx.currentTime;

  const oscA = ctx.createOscillator();
  oscA.type = 'sine';
  oscA.frequency.value = 50;

  const oscB = ctx.createOscillator();
  oscB.type = 'sine';
  oscB.frequency.value = 50.7;

  // Sum the two oscillators
  const sum = ctx.createGain();
  sum.gain.value = 0.5;
  oscA.connect(sum);
  oscB.connect(sum);

  // Lowpass @ 120Hz, Q 0.7 — guarantees real sub-bass, blocks any aliasing
  const lowpass = ctx.createBiquadFilter();
  lowpass.type = 'lowpass';
  lowpass.frequency.value = 120;
  lowpass.Q.value = 0.7;
  sum.connect(lowpass);

  // Master gain — what we ramp on enable/disable
  const master = ctx.createGain();
  master.gain.value = 0;
  lowpass.connect(master);
  master.connect(ctx.destination);

  // LFO @ 0.12Hz (one cycle every ~8.3s), amp 0.06 — additive modulation
  // of sum.gain so its base value 0.5 oscillates between 0.44 and 0.56.
  const lfo = ctx.createOscillator();
  lfo.type = 'sine';
  lfo.frequency.value = 0.12;

  const lfoGain = ctx.createGain();
  lfoGain.gain.value = 0.06;
  lfo.connect(lfoGain);
  lfoGain.connect(sum.gain);

  oscA.start(now);
  oscB.start(now);
  lfo.start(now);

  return { oscA, oscB, sum, lowpass, master, lfo, lfoGain };
}

// =============================================================
// BEEP — section transitions
// Sine 1200 → 880Hz over 80ms, attack 5ms → peak 0.06, exp decay.
// Highpass @ 400Hz strips any sub content for crispness.
// Parameterized internally so the boot tone can reuse it.
// =============================================================
function beep(fromFreq = 1200, toFreq = 880, durMs = 80, peak = 0.06) {
  if (!ctx || !enabled) return;
  const now = ctx.currentTime;
  const dur = durMs / 1000;

  const osc = ctx.createOscillator();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(fromFreq, now);
  osc.frequency.exponentialRampToValueAtTime(toFreq, now + dur);

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(peak, now + 0.005);           // 5ms attack
  gain.gain.exponentialRampToValueAtTime(0.0001, now + dur);      // exp decay

  const highpass = ctx.createBiquadFilter();
  highpass.type = 'highpass';
  highpass.frequency.value = 400;

  osc.connect(gain);
  gain.connect(highpass);
  highpass.connect(ctx.destination);

  osc.start(now);
  osc.stop(now + dur + 0.05);                                     // 50ms tail
}

// =============================================================
// POP — glitch / flash sync
// 40ms white noise with cubic-decreasing envelope BAKED INTO
// the buffer. Bandpass @ 2kHz / Q 8 turns the noise tonal —
// the high Q is what stops it sounding like static.
// =============================================================
function pop() {
  if (!ctx || !enabled) return;
  const now = ctx.currentTime;
  const sampleRate = ctx.sampleRate;
  const len = Math.floor(sampleRate * 0.04);                      // 40ms

  const buffer = ctx.createBuffer(1, len, sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < len; i++) {
    const env = Math.pow(1 - i / len, 3);                         // cubic decay
    data[i] = (Math.random() * 2 - 1) * env;
  }

  const source = ctx.createBufferSource();
  source.buffer = buffer;

  const bandpass = ctx.createBiquadFilter();
  bandpass.type = 'bandpass';
  bandpass.frequency.value = 2000;
  bandpass.Q.value = 8;

  const gain = ctx.createGain();
  gain.gain.value = 0.05;

  source.connect(gain);
  gain.connect(bandpass);
  bandpass.connect(ctx.destination);

  source.start(now);
}

// =============================================================
// SWELL — single dramatic moment (curtain reveal)
// Sine 220 → 55Hz exp over 1.6s, attack 50ms → peak 0.07,
// exp decay across the rest.
// =============================================================
function swell() {
  if (!ctx || !enabled) return;
  const now = ctx.currentTime;
  const dur = 1.6;

  const osc = ctx.createOscillator();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(220, now);
  osc.frequency.exponentialRampToValueAtTime(55, now + dur);

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(0.07, now + 0.05);            // 50ms attack
  gain.gain.exponentialRampToValueAtTime(0.0001, now + dur);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(now);
  osc.stop(now + dur + 0.1);
}

// =============================================================
// ENABLE / DISABLE
// =============================================================
function enable() {
  if (!ensureContext()) return;
  if (ctx.state === 'suspended') ctx.resume();

  if (!drone) drone = buildDrone();

  const now = ctx.currentTime;
  drone.master.gain.cancelScheduledValues(now);
  drone.master.gain.setValueAtTime(drone.master.gain.value, now);
  drone.master.gain.linearRampToValueAtTime(0.08, now + 0.6);

  enabled = true;

  // Boot tone — only the first time audio is ever turned on.
  // Two short ascending beeps. Uses the same beep() with custom params.
  if (!bootTonePlayed) {
    bootTonePlayed = true;
    setTimeout(() => beep(700, 880, 70, 0.05), 60);
    setTimeout(() => beep(880, 1320, 90, 0.05), 180);
  }
}

function disable() {
  enabled = false;
  if (!ctx || !drone) return;
  const now = ctx.currentTime;
  drone.master.gain.cancelScheduledValues(now);
  drone.master.gain.setValueAtTime(drone.master.gain.value, now);
  drone.master.gain.linearRampToValueAtTime(0, now + 0.3);
}

// =============================================================
// TOGGLE UI WIRE-UP
// =============================================================
const btn = document.querySelector('[data-audio-toggle]');
if (btn) {
  const labelEl = btn.querySelector('[data-label]');
  btn.addEventListener('click', () => {
    if (enabled) {
      disable();
      btn.setAttribute('aria-pressed', 'false');
      btn.classList.remove('is-on');
      if (labelEl) labelEl.textContent = 'AUDIO OFF';
    } else {
      enable();
      btn.setAttribute('aria-pressed', 'true');
      btn.classList.add('is-on');
      if (labelEl) labelEl.textContent = 'AUDIO ON';
    }
  });
}

// =============================================================
// PUBLIC API — minimal, intentional. Consumers can call these
// even before audio is enabled; they no-op gracefully.
// =============================================================
window.__audio = { beep, pop, swell };
