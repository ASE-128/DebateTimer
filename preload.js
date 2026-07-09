const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  loadConfig: () => ipcRenderer.invoke('load-config'),
  saveConfig: (config) => ipcRenderer.invoke('save-config', config),
  resetConfig: () => ipcRenderer.invoke('reset-config'),
  openTimer: () => ipcRenderer.invoke('open-timer'),
  openEditor: () => ipcRenderer.invoke('open-editor'),
  toggleFullscreen: () => ipcRenderer.invoke('toggle-fullscreen'),
  exportConfig: (config) => ipcRenderer.invoke('export-config', config),
  exportStandalone: (config) => ipcRenderer.invoke('export-standalone', config),
  importConfig: () => ipcRenderer.invoke('import-config'),
  log: (level, message) => ipcRenderer.invoke('log', level, message),
  onConfigUpdated: (callback) => {
    const listener = (_event, config) => callback(config);
    ipcRenderer.on('config-updated', listener);
    return () => ipcRenderer.removeListener('config-updated', listener);
  },
  onExportProgress: (callback) => {
    const listener = (_event, data) => callback(data);
    ipcRenderer.on('export-progress', listener);
    return () => ipcRenderer.removeListener('export-progress', listener);
  }
});
