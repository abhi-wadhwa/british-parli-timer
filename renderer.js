// Popup UI logic. The timer itself runs in the Electron main process;
// this script just mirrors state and sends button presses over IPC.

const timerEl = document.getElementById('timer');
const statusEl = document.getElementById('status');
const phaseFill = document.getElementById('phaseFill');
const startBtn = document.getElementById('startBtn');
const stopBtn = document.getElementById('stopBtn');
const resetBtn = document.getElementById('resetBtn');
const rows = Array.from(document.querySelectorAll('.milestones .row'));

function fmt(s) {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${sec.toString().padStart(2, '0')}`;
}

// Total speech length reference for the phase bar: 7:20 = 440s hard stop.
const HARD_STOP = 440;

function render(s) {
  timerEl.textContent = fmt(s.seconds);
  statusEl.textContent = s.status || 'Ready';

  const pct = Math.min(100, (s.seconds / HARD_STOP) * 100);
  phaseFill.style.width = pct + '%';

  // Highlight the most recently passed milestone
  rows.forEach(r => r.classList.remove('active'));
  const passed = rows.filter(r => s.seconds >= parseInt(r.dataset.at, 10));
  if (passed.length) passed[passed.length - 1].classList.add('active');

  startBtn.disabled = s.running;
  stopBtn.disabled = !s.running;
}

startBtn.addEventListener('click', () => window.bp.start());
stopBtn.addEventListener('click', () => window.bp.stop());
resetBtn.addEventListener('click', () => window.bp.reset());

window.bp.onState(render);

// Prime the UI on open
window.bp.getState().then(render);
