// BP Timer — macOS menu bar application
// The timer runs in the main process so the tray title ("time: status")
// ticks whether or not the popup window is visible. A hidden persistent
// renderer window is used purely for audio synthesis (service-bell dings).

const {
  app,
  BrowserWindow,
  Tray,
  Menu,
  ipcMain,
  nativeImage,
  screen,
  globalShortcut,
} = require('electron');
const path = require('path');

// Hide dock icon — this is a menu bar app.
if (process.platform === 'darwin' && app.dock) {
  app.dock.hide();
}

// --- Timer state (authoritative, lives in main process) ---
const state = {
  seconds: 0,
  running: false,
  status: 'Ready',
  interval: null,
};

// Milestones replicated from the original timer.html (British Parliamentary):
//   1:00  POI Window Open      (1 ding)
//   6:00  POI Window Closed    (1 ding)
//   7:00  Time Expired         (2 dings)
//   7:15  Grace Period Over    (3 dings)
//   7:20+ HARD STOP            (1 ding)
function milestoneFor(s) {
  if (s === 60) return { status: 'POI Window Open', dings: 1 };
  if (s === 360) return { status: 'POI Window Closed', dings: 1 };
  if (s === 420) return { status: 'Time Expired', dings: 2 };
  if (s === 435) return { status: 'Grace Period Over', dings: 3 };
  if (s === 440) return { status: 'HARD STOP', dings: 1 };
  // Past 7:20 — ding every second until they stop
  if (s > 440) return { status: 'HARD STOP', dings: 1 };
  return null;
}

function fmtTime(s) {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${sec.toString().padStart(2, '0')}`;
}

let tray = null;
let popupWindow = null;
let audioWindow = null;

function updateTrayTitle() {
  if (!tray) return;
  // Format: "time: status"   e.g. "2:14: Protected Time"
  tray.setTitle(`${fmtTime(state.seconds)}: ${state.status}`);
}

function broadcast() {
  if (popupWindow && !popupWindow.isDestroyed()) {
    popupWindow.webContents.send('state', {
      seconds: state.seconds,
      running: state.running,
      status: state.status,
    });
  }
}

function playBell(count) {
  if (audioWindow && !audioWindow.isDestroyed()) {
    audioWindow.webContents.send('bell', count);
  }
}

function tick() {
  state.seconds += 1;
  const m = milestoneFor(state.seconds);
  if (m) {
    state.status = m.status;
    playBell(m.dings);
  }
  updateTrayTitle();
  broadcast();
}

function startTimer() {
  if (state.running) return;
  // First start from zero → "Protected Time" + one ding (mirrors original)
  if (state.seconds === 0) {
    state.status = 'Protected Time';
    playBell(1);
  }
  state.running = true;
  state.interval = setInterval(tick, 1000);
  updateTrayTitle();
  broadcast();
  rebuildMenu();
}

function stopTimer() {
  if (!state.running) return;
  clearInterval(state.interval);
  state.interval = null;
  state.running = false;
  updateTrayTitle();
  broadcast();
  rebuildMenu();
}

function resetTimer() {
  clearInterval(state.interval);
  state.interval = null;
  state.running = false;
  state.seconds = 0;
  state.status = 'Ready';
  updateTrayTitle();
  broadcast();
  rebuildMenu();
}

// --- Popup window (the "app UI" that drops down from the tray) ---
function createPopupWindow() {
  popupWindow = new BrowserWindow({
    width: 360,
    height: 420,
    show: false,
    frame: false,
    resizable: false,
    movable: false,
    fullscreenable: false,
    skipTaskbar: true,
    alwaysOnTop: true,
    transparent: true,
    hasShadow: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  popupWindow.loadFile('renderer.html');
  popupWindow.on('blur', () => {
    // Hide when the user clicks away — standard macOS menu bar behavior.
    if (popupWindow && popupWindow.isVisible()) popupWindow.hide();
  });
  popupWindow.on('closed', () => { popupWindow = null; });
}

// Hidden window used only to synthesize the service-bell sound.
function createAudioWindow() {
  audioWindow = new BrowserWindow({
    width: 1,
    height: 1,
    show: false,
    skipTaskbar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      backgroundThrottling: false,
    },
  });
  audioWindow.loadFile('bell.html');
}

function positionPopupToTray() {
  if (!popupWindow || !tray) return;
  const trayBounds = tray.getBounds();
  const winBounds = popupWindow.getBounds();
  const display = screen.getDisplayNearestPoint({ x: trayBounds.x, y: trayBounds.y });
  // Center the popup horizontally under the tray icon.
  let x = Math.round(trayBounds.x + trayBounds.width / 2 - winBounds.width / 2);
  let y = Math.round(trayBounds.y + trayBounds.height + 4);
  // Keep it on-screen
  const maxX = display.workArea.x + display.workArea.width - winBounds.width - 4;
  if (x > maxX) x = maxX;
  if (x < display.workArea.x + 4) x = display.workArea.x + 4;
  popupWindow.setPosition(x, y, false);
}

function togglePopup() {
  if (!popupWindow) createPopupWindow();
  if (popupWindow.isVisible()) {
    popupWindow.hide();
    return;
  }
  positionPopupToTray();
  popupWindow.show();
  popupWindow.focus();
  broadcast();
}

// Right-click menu (left-click toggles the popup)
function rebuildMenu() {
  const menu = Menu.buildFromTemplate([
    { label: state.running ? 'Stop' : 'Start', click: () => state.running ? stopTimer() : startTimer() },
    { label: 'Reset', click: () => resetTimer() },
    { type: 'separator' },
    { label: 'Open Timer Window', click: () => togglePopup() },
    { type: 'separator' },
    { label: 'Quit BP Timer', role: 'quit' },
  ]);
  // On macOS we don't bind this as the default click handler — we attach
  // it only to right-click via tray.popUpContextMenu(). Left-click toggles
  // the popup window. Storing the menu on the tray makes right-click
  // surface it automatically.
  tray.setContextMenu(null); // left-click should NOT open context menu
  tray._bpMenu = menu;
}

app.whenReady().then(() => {
  // Use a template image so macOS tints it correctly in light/dark menu bars.
  const iconPath = path.join(__dirname, 'assets', 'trayTemplate.png');
  const icon = nativeImage.createFromPath(iconPath);
  icon.setTemplateImage(true);
  tray = new Tray(icon);
  tray.setToolTip('BP Timer');

  createAudioWindow();
  createPopupWindow();
  rebuildMenu();
  updateTrayTitle();

  tray.on('click', () => togglePopup());
  tray.on('right-click', () => {
    if (tray._bpMenu) tray.popUpContextMenu(tray._bpMenu);
  });

  // Global shortcuts (optional but very handy during a round):
  //   Cmd+Shift+S → start/stop
  //   Cmd+Shift+R → reset
  globalShortcut.register('CommandOrControl+Shift+S', () => {
    state.running ? stopTimer() : startTimer();
  });
  globalShortcut.register('CommandOrControl+Shift+R', () => resetTimer());
});

// --- IPC from popup buttons ---
ipcMain.on('timer:start', () => startTimer());
ipcMain.on('timer:stop', () => stopTimer());
ipcMain.on('timer:reset', () => resetTimer());
ipcMain.handle('timer:getState', () => ({
  seconds: state.seconds,
  running: state.running,
  status: state.status,
}));

// Menu-bar apps stay alive after all windows close.  On macOS that's the
// default, but we subscribe anyway so a future non-darwin host doesn't quit.
app.on('window-all-closed', (e) => { e.preventDefault(); });

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});
