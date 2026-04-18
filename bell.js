// Bell player — loads the trimmed service-bell WAV sample and plays it
// on demand via IPC. The sample is 1 second long with a 200ms fade-out,
// sourced from freesound.org (community ding).

const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
let bellBuffer = null;

// Load the WAV file into an AudioBuffer at startup.
fetch('./assets/ding.wav')
  .then(r => r.arrayBuffer())
  .then(buf => audioCtx.decodeAudioData(buf))
  .then(decoded => { bellBuffer = decoded; })
  .catch(err => console.error('Failed to load bell sample:', err));

function ensureRunning() {
  if (audioCtx.state === 'suspended') audioCtx.resume().catch(() => {});
}

function playBellOnce(startTime) {
  if (!bellBuffer) return;
  ensureRunning();
  const t0 = startTime ?? audioCtx.currentTime;

  const source = audioCtx.createBufferSource();
  source.buffer = bellBuffer;

  const gain = audioCtx.createGain();
  gain.gain.setValueAtTime(0.75, t0);

  source.connect(gain);
  gain.connect(audioCtx.destination);
  source.start(t0);
}

// Play `count` dings spaced apart so each is audible.
function playBell(count) {
  const spacing = 0.38;
  const now = audioCtx.currentTime;
  for (let i = 0; i < count; i++) {
    playBellOnce(now + i * spacing);
  }
}

window.bp.onBell((count) => playBell(count));
