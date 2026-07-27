const { ipcMain, dialog, BrowserWindow } = require('electron');
const { autoUpdater } = require('electron-updater');
const fs = require('fs');
const channels = require('./channels');
const windows = require('./windows');
const {
  log,
  readConfig,
  writeConfig,
  defaultConfig,
  validateConfig,
  serializeConfig,
  parseConfig,
  generateStandaloneExe,
  getLatestChangelog,
  consumeMigrationInfo,
  getAllTemplates,
  saveTemplate,
  deleteTemplate
} = require('./export');
const pkg = require('../../package.json');
const { resolvePreset } = require('./theme-presets');

function sendToEditor(channel, ...args) {
  const editorWindow = windows.getEditorWindow();
  if (editorWindow && !editorWindow.isDestroyed()) {
    editorWindow.webContents.send(channel, ...args);
  }
}

function sendToTimer(channel, ...args) {
  const timerWindow = windows.getTimerWindow();
  if (timerWindow && !timerWindow.isDestroyed()) {
    timerWindow.webContents.send(channel, ...args);
  }
}

function registerIpcHandlers() {
  let skippedVersion = null;

  ipcMain.handle(channels.LOAD_CONFIG, () => readConfig());
  ipcMain.handle(channels.RESOLVE_PRESET, (_event, preset, colorMode) => resolvePreset(preset, colorMode));
  ipcMain.handle(channels.GET_APP_VERSION, () => pkg.version || '0.0.0');
  ipcMain.handle(channels.GET_TIMER_BASE_SIZE, (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    return win?.__timerBaseSize || { width: 1600, height: 900 };
  });
  ipcMain.handle(channels.GET_LATEST_CHANGELOG, () => getLatestChangelog());
  ipcMain.handle(channels.CONSUME_MIGRATION_INFO, () => consumeMigrationInfo());
  ipcMain.handle(channels.LOG, (_event, level, message) => {
    log(level, message);
  });
  ipcMain.handle(channels.SAVE_CONFIG, (_event, data) => {
    const saved = writeConfig(data);
    sendToTimer(channels.CONFIG_UPDATED, saved);
    windows.refreshTimerWindow();
    return saved;
  });
  ipcMain.handle(channels.RESET_CONFIG, () => writeConfig(defaultConfig()));
  ipcMain.handle(channels.OPEN_TIMER, () => {
    const latestConfig = readConfig();
    const existingTimer = windows.getTimerWindow();
    if (!existingTimer || existingTimer.isDestroyed()) {
      windows.createTimerWindow();
    } else {
      existingTimer.reload();
      existingTimer.show();
      existingTimer.focus();
    }
    const timerWindow = windows.getTimerWindow();
    if (timerWindow && !timerWindow.isDestroyed()) {
      timerWindow.webContents.once('did-finish-load', () => {
        timerWindow.webContents.send(channels.CONFIG_UPDATED, latestConfig);
      });
    }
    const editorWindow = windows.getEditorWindow();
    if (editorWindow && !editorWindow.isDestroyed()) {
      editorWindow.hide();
    }
    return { ok: true };
  });
  ipcMain.handle(channels.OPEN_EDITOR, () => {
    const existingEditor = windows.getEditorWindow();
    if (!existingEditor || existingEditor.isDestroyed()) {
      windows.createEditorWindow();
    } else {
      existingEditor.show();
      existingEditor.focus();
    }
    const timerWindow = windows.getTimerWindow();
    if (timerWindow && !timerWindow.isDestroyed()) {
      timerWindow.hide();
    }
    return { ok: true };
  });
  ipcMain.handle(channels.IMPORT_CONFIG, async () => {
    try {
      const editorWindow = windows.getEditorWindow();
      const { filePaths } = await dialog.showOpenDialog(editorWindow, {
        title: '导入比赛配置',
        properties: ['openFile'],
        filters: [
          { name: 'JSON/YAML 配置', extensions: ['json', 'yaml', 'yml'] },
          { name: 'JSON 配置', extensions: ['json'] },
          { name: 'YAML 配置', extensions: ['yaml', 'yml'] }
        ]
      });
      if (!filePaths || filePaths.length === 0) {
        log('warn', '用户取消导入配置');
        return { ok: false, config: null, error: '用户取消选择' };
      }
      const content = fs.readFileSync(filePaths[0], 'utf8');
      const { config, warnings } = parseConfig(content, filePaths[0]);
      sendToTimer(channels.CONFIG_UPDATED, config);
      log('info', `配置已导入: ${filePaths[0]}`);
      return { ok: true, config, warnings, path: filePaths[0] };
    } catch (err) {
      log('error', `导入配置失败: ${err.message}`);
      console.error('导入配置失败:', err);
      return { ok: false, config: null, error: err.message };
    }
  });
  ipcMain.handle(channels.EXPORT_CONFIG, async (_event, config) => {
    try {
      const editorWindow = windows.getEditorWindow();
      const { filePath } = await dialog.showSaveDialog(editorWindow, {
        title: '导出比赛配置',
        defaultPath: 'debate-config.json',
        filters: [
          { name: 'JSON 配置', extensions: ['json'] },
          { name: 'YAML 配置', extensions: ['yaml', 'yml'] }
        ]
      });
      if (filePath) {
        fs.writeFileSync(filePath, serializeConfig(config, filePath), 'utf8');
        log('info', `配置已导出: ${filePath}`);
        return { ok: true, path: filePath };
      }
      log('warn', '用户取消导出配置');
      return { ok: false, path: null };
    } catch (err) {
      log('error', `导出配置失败: ${err.message}`);
      console.error('导出配置失败:', err);
      return { ok: false, path: null, error: err.message };
    }
  });
  ipcMain.handle(channels.EXPORT_STANDALONE, async (_event, config) => {
    try {
      const editorWindow = windows.getEditorWindow();
      const { filePath } = await dialog.showSaveDialog(editorWindow, {
        title: '导出独立计时器',
        defaultPath: '辩论赛计时器-Setup.exe',
        filters: [{ name: '可执行文件', extensions: ['exe'] }]
      });
      if (!filePath) {
        log('warn', '用户取消导出独立计时器');
        return { ok: false, path: null, error: '用户取消保存' };
      }
      log('info', '开始生成独立计时器...');
      const result = await generateStandaloneExe(config, filePath, (percent, message) => {
        sendToEditor(channels.EXPORT_PROGRESS, { percent, message });
      });
      log('info', `独立计时器已生成: ${filePath}`);
      return result;
    } catch (err) {
      log('error', `导出独立计时器失败: ${err.message}`);
      console.error('导出独立计时器失败:', err);
      return { ok: false, path: null, error: err.message };
    }
  });
  ipcMain.handle(channels.GET_TEMPLATES, () => getAllTemplates());
  ipcMain.handle(channels.APPLY_TEMPLATE, (_event, id) => {
    const templates = getAllTemplates();
    const template = templates.find((t) => t.id === id);
    if (!template) {
      return { ok: false, config: null, error: '模板不存在' };
    }
    return { ok: true, config: validateConfig(template.config) };
  });
  ipcMain.handle(channels.SAVE_TEMPLATE, (_event, { id, name, description, config }) => {
    try {
      return saveTemplate(id, name, description, config);
    } catch (err) {
      log('error', `保存模板失败: ${err.message}`);
      return { ok: false, error: err.message };
    }
  });
  ipcMain.handle(channels.DELETE_TEMPLATE, (_event, id) => {
    try {
      return deleteTemplate(id);
    } catch (err) {
      log('error', `删除模板失败: ${err.message}`);
      return { ok: false, error: err.message };
    }
  });
  ipcMain.handle(channels.TOGGLE_FULLSCREEN, (event) => {
    const senderWindow = BrowserWindow.fromWebContents(event.sender);
    const timerWindow = windows.getTimerWindow();
    const editorWindow = windows.getEditorWindow();
    const target =
      senderWindow && !senderWindow.isDestroyed()
        ? senderWindow
        : timerWindow && !timerWindow.isDestroyed()
          ? timerWindow
          : editorWindow;
    if (target) {
      const next = !target.isFullScreen();
      target.setFullScreen(next);
      return { ok: true, fullscreen: next };
    }
    return { ok: false, fullscreen: false };
  });

  autoUpdater.on('update-available', (info) => {
    if (skippedVersion === info.version) {
      log('info', `用户已跳过版本 ${info.version}，不提示更新`);
      return;
    }
    log('info', `发现新版本: ${info.version}`);
    sendToEditor(channels.UPDATE_AVAILABLE, { version: info.version });
  });

  autoUpdater.on('update-downloaded', () => {
    log('info', '更新已下载');
    sendToEditor(channels.UPDATE_DOWNLOADED);
  });

  autoUpdater.on('error', (err) => {
    log('error', `自动更新错误: ${err.message}`);
    sendToEditor(channels.UPDATE_ERROR, { message: err.message });
  });

  ipcMain.handle(channels.START_DOWNLOAD_UPDATE, () => {
    log('info', '用户开始下载更新');
    return autoUpdater.downloadUpdate();
  });

  ipcMain.handle(channels.QUIT_AND_INSTALL, () => {
    log('info', '用户退出并安装更新');
    autoUpdater.quitAndInstall();
  });

  ipcMain.handle(channels.SKIP_UPDATE, (_event, version) => {
    skippedVersion = version;
    log('info', `用户跳过版本 ${version}`);
  });

  setTimeout(() => {
    autoUpdater.checkForUpdatesAndNotify().catch((err) => {
      log('error', `检查更新失败: ${err.message}`);
    });
  }, 3000);
}

module.exports = registerIpcHandlers;
