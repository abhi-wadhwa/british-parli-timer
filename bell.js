// Service-bell synthesizer.
//
// A real counter service bell has a bright metallic "ping!" with a sharp
// attack and a ~1s exponential tail. Characteristics we model:
//   * Fundamental near ~2.2 kHz
//   * Strong bell-ratio partials (1.0, 2.4, 3.5, 4.2, 5.4) — inharmonic,
//     which is what gives it the metallic shimmer (pure harmonic stacks
//     just sound like an organ).
//   * Very short attack (~3 ms), exponential decay (~1.1 s).
//   * A faint high-frequency noise burst at onset for the physical "strike".

const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

// Resume the context after any user gesture in case it starts suspended.
// In this hidden window there's no gesture, but Electron usually allows
// autoplay. If suspended, resume() is a no-op in most Electron builds.
function ensureRunning() {
  if (audioCtx.state === 'suspended') audioCtx.resume().catch(() => {});
}

const FUNDAMENTAL = 2200; // Hz — bright service-bell tone
const PARTIALS = [
  { ratio: 1.00, gain: 1.00, decay: 1.10 },
  { ratio: 2.40, gain: 0.55, decay: 0.75 },
  { ratio: 3.50, gain: 0.35, decay: 0.55 },
  { ratio: 4.20, gain: 0.22, decay: 0.45 },
  { ratio: 5.43, gain: 0.15, decay: 0.35 },
];

function playBellOnce(startTime) {
  ensureRunning();
  const t0 = startTime ?? audioCtx.currentTime;

  // Master gain + gentle compression so multiple dings don't clip.
  const master = audioCtx.createGain();
  master.gain.setValueAtTime(0.38, t0);
  master.connect(audioCtx.destination);

  // A subtle bandpass adds "body" to the bell by emphasizing mid-high band.
  const bp = audioCtx.createBiquadFilter();
  bp.type = 'bandpass';
  bp.frequency.value = 3200;
  bp.Q.value = 0.9;
  bp.connect(master);

  // Partials
  for (const p of PARTIALS) {
    const osc = audioCtx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(FUNDAMENTAL * p.ratio, t0);

    const g = audioCtx.createGain();
    // Fast attack (3 ms), exponential ring-out
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(p.gain, t0 + 0.003);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + p.decay);

    osc.connect(g);
    g.connect(bp);

    osc.start(t0);
    osc.stop(t0 + p.decay + 0.05);
  }

  // Strike noise — a 20 ms burst of filtered white noise to simulate
  // the physical clapper hitting the bell dome.
  const noiseDur = 0.022;
  const noiseBuffer = audioCtx.createBuffer(1, Math.ceil(audioCtx.sampleRate * noiseDur), audioCtx.sampleRate);
  const data = noiseBuffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) {
    data[i] = (Math.random() * 2 - 1);
  }
  const noise = audioCtx.createBufferSource();
  noise.buffer = noiseBuffer;

  const noiseHP = audioCtx.createBiquadFilter();
  noiseHP.type = 'highpass';
  noiseHP.frequency.value = 4000;

  const noiseGain = audioCtx.createGain();
  noiseGain.gain.setValueAtTime(0.0001, t0);
  noiseGain.gain.exponentialRampToValueAtTime(0.55, t0 + 0.002);
  noiseGain.gain.exponentialRampToValueAtTime(0.0001, t0 + noiseDur);

  noise.connect(noiseHP);
  noiseHP.connect(noiseGain);
  noiseGain.connect(master);

  noise.start(t0);
  noise.stop(t0 + noiseDur + 0.01);
}

// Play `count` dings, spaced so each is audible as a separate strike.
function playBell(count) {
  const spacing = 0.34; // seconds between strikes
  const now = audioCtx.currentTime;
  for (let i = 0; i < count; i++) {
    playBellOnce(now + i * spacing);
  }
}

window.bp.onBell((count) => playBell(count));
