const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('gta', Object.freeze({
  data: () => ipcRenderer.invoke('gta:data'),
  state: () => ipcRenderer.invoke('gta:state'),
  setOwned: (id, owned) => ipcRenderer.invoke('gta:set-owned', id, owned),
  setUpgrades: (id, upgrades) => ipcRenderer.invoke('gta:set-upgrades', id, upgrades),
  setSupply: (id, pct) => ipcRenderer.invoke('gta:set-supply', id, pct),
  orderSupply: id => ipcRenderer.invoke('gta:order-supply', id),
  setNightclub: (id, on) => ipcRenderer.invoke('gta:set-nightclub', id, on),
  nightclub: (action, value) => ipcRenderer.invoke('gta:nightclub', action, value),
  warehouse: (action, value) => ipcRenderer.invoke('gta:warehouse', action, value),
  setStock: (id, units) => ipcRenderer.invoke('gta:set-stock', id, units),
  boost: (id, on) => ipcRenderer.invoke('gta:boost', id, on),
  setCalibration: (id, cal) => ipcRenderer.invoke('gta:set-calibration', id, cal),
  setSettings: patch => ipcRenderer.invoke('gta:set-settings', patch),
  todo: (action, value) => ipcRenderer.invoke('gta:todo', action, value),
  update: action => ipcRenderer.invoke('gta:update', action),
  notices: (action, value) => ipcRenderer.invoke('gta:notices', action, value),
  onNavigate: callback => {
    if (typeof callback !== 'function') throw new TypeError('callback');
    const listener = (_event, page) => callback(String(page));
    ipcRenderer.on('gta:navigate', listener);
    return () => ipcRenderer.removeListener('gta:navigate', listener);
  },
  onWeekly: callback => {
    if (typeof callback !== 'function') throw new TypeError('callback');
    const listener = (_event, weekly) => callback(weekly);
    ipcRenderer.on('gta:weekly', listener);
    return () => ipcRenderer.removeListener('gta:weekly', listener);
  },
  onWiki: callback => {
    if (typeof callback !== 'function') throw new TypeError('callback');
    const listener = (_event, wiki) => callback(wiki);
    ipcRenderer.on('gta:wiki', listener);
    return () => ipcRenderer.removeListener('gta:wiki', listener);
  },
  heistStep: (heistId, stepId, done) => ipcRenderer.invoke('gta:heist-step', heistId, stepId, done),
  heistReset: heistId => ipcRenderer.invoke('gta:heist-reset', heistId),
  openSource: url => ipcRenderer.invoke('gta:open-source', url),
  mapOwn: (pointId, on) => ipcRenderer.invoke('gta:map-own', pointId, on),
  cayoCooldown: minutes => ipcRenderer.invoke('gta:cayo-cooldown', minutes),
  overlay: (action, value) => ipcRenderer.invoke('gta:overlay', action, value),
  onState: callback => {
    if (typeof callback !== 'function') throw new TypeError('callback');
    const listener = (_event, state) => callback(state);
    ipcRenderer.on('gta:state', listener);
    return () => ipcRenderer.removeListener('gta:state', listener);
  }
}));
