const { app, BrowserWindow } = require('electron');
const exportModule = require('./js/main/export');
const windows = require('./js/main/windows');
const registerIpcHandlers = require('./js/main/ipc');

const { isMainApp, log, ensureUserDataDir } = exportModule;

if (isMainApp) {
  app.whenReady().then(() => {
    log('info', '应用启动');
    ensureUserDataDir();
    windows.createEditorWindow();
    registerIpcHandlers();

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        windows.createEditorWindow();
      }
    });
  });

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
  });
}

module.exports = {
  defaultConfig: exportModule.defaultConfig,
  readConfig: exportModule.readConfig,
  writeConfig: exportModule.writeConfig,
  validateConfig: exportModule.validateConfig,
  migrateV2ToV3: exportModule.migrateV2ToV3,
  generateStandaloneExe: exportModule.generateStandaloneExe,
  generateStandaloneAppFiles: exportModule.generateStandaloneAppFiles,
  generateNsisScript: exportModule.generateNsisScript,
  readAsset: exportModule.readAsset,
  extractBody: exportModule.extractBody,
  copyDir: exportModule.copyDir
};
