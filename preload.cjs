const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('gta', Object.freeze({
  data: () => ipcRenderer.invoke('gta:data'),
  state: () => ipcRenderer.invoke('gta:state'),
  setOwned: (id, owned) => ipcRenderer.invoke('gta:set-owned', id, owned),
  setUpgrades: (id, upgrades) => ipcRenderer.invoke('gta:set-upgrades', id, upgrades),
  setSupply: (id, pct) => ipcRenderer.invoke('gta:set-supply', id, pct),
  setStock: (id, units) => ipcRenderer.invoke('gta:set-stock', id, units),
  setCalibration: (id, cal) => ipcRenderer.invoke('gta:set-calibration', id, cal),
  setSettings: patch => ipcRenderer.invoke('gta:set-settings', patch),
  todo: (action, value) => ipcRenderer.invoke('gta:todo', action, value),
  update: action => ipcRenderer.invoke('gta:update', action),
  onWeekly: callback => {
    if (typeof callback !== 'function') throw new TypeError('callback');
    const listener = (_event, weekly) => callback(weekly);
    ipcRenderer.on('gta:weekly', listener);
    return () => ipcRenderer.removeListener('gta:weekly', listener);
  },
  cayoCooldown: minutes => ipcRenderer.invoke('gta:cayo-cooldown', minutes),
  overlay: (action, value) => ipcRenderer.invoke('gta:overlay', action, value),
  onState: callback => {
    if (typeof callback !== 'function') throw new TypeError('callback');
    const listener = (_event, state) => callback(state);
    ipcRenderer.on('gta:state', listener);
    return () => ipcRenderer.removeListener('gta:state', listener);
  }
}));
