const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  loadConfig: () => ipcRenderer.invoke('load-config'),
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  getLatestChangelog: () => ipcRenderer.invoke('get-latest-changelog'),
  consumeMigrationInfo: () => ipcRenderer.invoke('consume-migration-info'),
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
  },
  onUpdateAvailable: (callback) => {
    const listener = (_event, info) => callback(info);
    ipcRenderer.on('update-available', listener);
    return () => ipcRenderer.removeListener('update-available', listener);
  },
  onUpdateDownloaded: (callback) => {
    const listener = () => callback();
    ipcRenderer.on('update-downloaded', listener);
    return () => ipcRenderer.removeListener('update-downloaded', listener);
  },
  onUpdateError: (callback) => {
    const listener = (_event, error) => callback(error);
    ipcRenderer.on('update-error', listener);
    return () => ipcRenderer.removeListener('update-error', listener);
  },
  startDownloadUpdate: () => ipcRenderer.invoke('start-download-update'),
  quitAndInstall: () => ipcRenderer.invoke('quit-and-install'),
  skipUpdate: (version) => ipcRenderer.invoke('skip-update', version)
});
