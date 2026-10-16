const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('marker', Object.freeze({
  onBoxes: callback => {
    if (typeof callback !== 'function') throw new TypeError('callback');
    ipcRenderer.on('marker:boxes', (_event, boxes) => callback(boxes));
    ipcRenderer.send('marker:ready');
  },
  onBadge: callback => {
    if (typeof callback !== 'function') throw new TypeError('callback');
    ipcRenderer.on('marker:badge', (_event, state) => callback(state));
    ipcRenderer.send('marker:ready');
  }
}));
