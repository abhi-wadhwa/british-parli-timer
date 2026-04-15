const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('bp', {
  start: () => ipcRenderer.send('timer:start'),
  stop: () => ipcRenderer.send('timer:stop'),
  reset: () => ipcRenderer.send('timer:reset'),
  getState: () => ipcRenderer.invoke('timer:getState'),
  onState: (cb) => ipcRenderer.on('state', (_evt, s) => cb(s)),
  onBell: (cb) => ipcRenderer.on('bell', (_evt, count) => cb(count)),
});
