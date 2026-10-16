const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('overlay', Object.freeze({
  set: patch => ipcRenderer.invoke('overlay:set', patch),
  onState: callback => {
    if (typeof callback !== 'function') throw new TypeError('callback');
    ipcRenderer.on('overlay:state', (_event, state) => callback(state));
  }
}));
