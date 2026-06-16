const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const fs = require('fs');
const path = require('path');
const childProcess = require('child_process');
const embeddedBinaries = require('./vendor/embedded-binaries');

const isElectron = !!(process.versions && process.versions.electron);
if (isElectron) {
  app.disableHardwareAcceleration();
}

const appDataRoot = isElectron ? path.join(app.getPath('appData'), 'DebateTimer') : path.join(require('os').homedir(), 'AppData', 'Roaming', 'DebateTimer');
if (isElectron) {
  app.setPath('userData', appDataRoot);
  app.setPath('cache', path.join(appDataRoot, 'cache'));
  app.setPath('temp', path.join(appDataRoot, 'temp'));
}

const userDataPath = isElectron ? app.getPath('userData') : appDataRoot;

const configPath = path.join(userDataPath, 'config.json');

function ensureUserDataDir() {
  for (const target of [userDataPath, path.join(userDataPath, 'cache'), path.join(userDataPath, 'temp')]) {
    if (!fs.existsSync(target)) {
      fs.mkdirSync(target, { recursive: true });
    }
  }
}

function defaultConfig() {
  return {
    eventName: '新建辩论赛事',
    teams: { affirmative: '正方', negative: '反方' },
    topics: { affirmative: '正方辩题', negative: '反方辩题' },
    theme: {
      backgroundType: 'color',
      backgroundImage: '',
      backgroundColor: '#1a1a1a',
      fontFamily: 'system-ui',
      fontSizeScale: 1,
      colors: {
        affirmative: '#c0392b',
        negative: '#2980b9',
        title: '#3498db',
        text: '#ffffff'
      }
    },
    segments: [
      { id: 1, name: '开场', type: 'none', duration: 0 },
      { id: 2, name: '正方一辩·开篇陈词', type: 'single_speech', duration: 180, side: 'affirmative' },
      { id: 3, name: '反方一辩·开篇陈词', type: 'single_speech', duration: 180, side: 'negative' }
    ]
  };
}

function validateConfig(input) {
  const def = defaultConfig();
  if (!input || typeof input !== 'object') return def;
  return {
    eventName: String(input.eventName || def.eventName),
    teams: {
      affirmative: String(input.teams?.affirmative || def.teams.affirmative),
      negative: String(input.teams?.negative || def.teams.negative)
    },
    topics: {
      affirmative: String(input.topics?.affirmative || def.topics.affirmative),
      negative: String(input.topics?.negative || def.topics.negative)
    },
    theme: {
      backgroundType: ['color', 'image'].includes(input.theme?.backgroundType) ? input.theme.backgroundType : def.theme.backgroundType,
      backgroundImage: String(input.theme?.backgroundImage || def.theme.backgroundImage),
      backgroundColor: String(input.theme?.backgroundColor || def.theme.backgroundColor),
      fontFamily: String(input.theme?.fontFamily || def.theme.fontFamily),
      fontSizeScale: Number(input.theme?.fontSizeScale || def.theme.fontSizeScale),
      customFont: String(input.theme?.customFont || def.theme.customFont),
      customFontName: String(input.theme?.customFontName || def.theme.customFontName),
      colors: {
        affirmative: String(input.theme?.colors?.affirmative || def.theme.colors.affirmative),
        negative: String(input.theme?.colors?.negative || def.theme.colors.negative),
        title: String(input.theme?.colors?.title || def.theme.colors.title),
        text: String(input.theme?.colors?.text || def.theme.colors.text)
      }
    },
    segments: Array.isArray(input.segments) ? input.segments.map((seg, i) => ({
      id: i + 1,
      name: String(seg.name || '未命名环节'),
      type: ['none', 'single_speech', 'single_question', 'dual_debate'].includes(seg.type) ? seg.type : 'none',
      duration: Math.max(0, Number(seg.duration || 0)),
      side: ['affirmative', 'negative'].includes(seg.side) ? seg.side : undefined
    })) : def.segments
  };
}

function readConfig() {
  ensureUserDataDir();
  if (!fs.existsSync(configPath)) {
    fs.writeFileSync(configPath, JSON.stringify(defaultConfig(), null, 2));
  }
  return JSON.parse(fs.readFileSync(configPath, 'utf8'));
}

function writeConfig(data) {
  ensureUserDataDir();
  fs.writeFileSync(configPath, JSON.stringify(data, null, 2));
  return readConfig();
}

function readAsset(...segments) {
  return fs.readFileSync(path.join(__dirname, ...segments), 'utf8');
}

function extractBody(html) {
  const match = html.match(/<body[^>]*>([\s\S]*)<\/body>/i);
  const body = match ? match[1].trim() : html;
  return body.replace(/<script[\s\S]*?<\/script>/gi, '').trim();
}

function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else if (entry.name.endsWith('.asar')) {
      continue;
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

function generateStandaloneAppFiles(config, appDir) {
  fs.mkdirSync(path.join(appDir, 'styles'), { recursive: true });
  fs.mkdirSync(path.join(appDir, 'js'), { recursive: true });

  fs.writeFileSync(path.join(appDir, 'package.json'), JSON.stringify({
    name: 'debate-timer-standalone',
    version: '1.0.0',
    main: 'main.js'
  }, null, 2));

  const mainJs = `const { app, BrowserWindow, ipcMain } = require('electron');\nconst path = require('path');\n\napp.disableHardwareAcceleration();\n\nfunction createWindow() {\n  const win = new BrowserWindow({\n    width: 1500,\n    height: 950,\n    fullscreen: false,\n    autoHideMenuBar: true,\n    webPreferences: {\n      preload: path.join(__dirname, 'preload.js'),\n      contextIsolation: true,\n      nodeIntegration: false\n    }\n  });\n  win.loadFile(path.join(__dirname, 'timer.html'));\n}\n\napp.whenReady().then(() => {\n  createWindow();\n  ipcMain.handle('toggle-fullscreen', () => {\n    const win = BrowserWindow.getFocusedWindow();\n    if (win) win.setFullScreen(!win.isFullScreen());\n  });\n});\n\napp.on('window-all-closed', () => {\n  if (process.platform !== 'darwin') app.quit();\n});\n`;
  fs.writeFileSync(path.join(appDir, 'main.js'), mainJs);

  const preloadJs = `const { contextBridge, ipcRenderer } = require('electron');\nconst embeddedConfig = ${JSON.stringify(config)};\ncontextBridge.exposeInMainWorld('electronAPI', {\n  loadConfig: () => Promise.resolve(embeddedConfig),\n  openEditor: () => Promise.resolve(),\n  toggleFullscreen: () => ipcRenderer.invoke('toggle-fullscreen'),\n  onConfigUpdated: () => () => {}\n});\n`;
  fs.writeFileSync(path.join(appDir, 'preload.js'), preloadJs);

  const timerHtml = readAsset('timer.html');
  const bodyContent = extractBody(timerHtml);

  const standaloneTimerHtml = `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="author" content="Chen Yu">
  <title>辩论赛计时器</title>
  <link rel="stylesheet" href="styles/timer.css">
</head>
<body>
  ${bodyContent}
  <div id="standaloneSetup" class="standalone-setup">
    <div class="box">
      <h2>赛前设置</h2>
      <label>正方队伍<input id="ssAffirmativeTeam" type="text" value="${(config.teams?.affirmative || '').replace(/"/g, '&quot;')}"></label>
      <label>正方辩题<input id="ssAffirmativeTopic" type="text" value="${(config.topics?.affirmative || '').replace(/"/g, '&quot;')}"></label>
      <label>反方队伍<input id="ssNegativeTeam" type="text" value="${(config.teams?.negative || '').replace(/"/g, '&quot;')}"></label>
      <label>反方辩题<input id="ssNegativeTopic" type="text" value="${(config.topics?.negative || '').replace(/"/g, '&quot;')}"></label>
      <button id="ssStartBtn">开始计时</button>
    </div>
  </div>
  <script>window.__STANDALONE_CONFIG__ = ${JSON.stringify(config)};</script>
  <script src="js/audio.js"></script>
  <script src="js/timer-core.js"></script>
  <script src="js/timer-app.js"></script>
  <script>initTimerApp();</script>
</body>
</html>`;

  fs.writeFileSync(path.join(appDir, 'timer.html'), standaloneTimerHtml);
  fs.writeFileSync(path.join(appDir, 'styles', 'timer.css'), readAsset('styles', 'timer.css'));
  fs.writeFileSync(path.join(appDir, 'js', 'audio.js'), readAsset('js', 'audio.js'));
  fs.writeFileSync(path.join(appDir, 'js', 'timer-core.js'), readAsset('js', 'timer-core.js'));
  fs.writeFileSync(path.join(appDir, 'js', 'timer-app.js'), readAsset('js', 'timer-app.js'));
}

function cleanupTemp(dir) {
  if (!dir) return;
  try {
    fs.rmSync(dir, { recursive: true, force: true });
  } catch (e) {
    console.error('清理临时目录失败:', e.message);
  }
}

function generateStandaloneExe(config, savePath) {
  return new Promise((resolve, reject) => {
    let tempBase = null;
    try {
      tempBase = path.join(app.getPath('temp'), `DebateTimer-standalone-${Date.now()}`);
      fs.mkdirSync(tempBase, { recursive: true });

      // 1. Copy Electron runtime
      const electronDist = path.join(__dirname, 'node_modules', 'electron', 'dist');
      if (!fs.existsSync(electronDist)) {
        throw new Error('未找到 Electron 运行时，请确保已执行 npm install');
      }
      copyDir(electronDist, tempBase);

      // 2. Create app folder
      const appDir = path.join(tempBase, 'resources', 'app');
      generateStandaloneAppFiles(config, appDir);

      // 3. Write embedded WinRAR tools and icon into temp dir
      const rarExe = path.join(tempBase, 'rar.exe');
      const sfxModule = path.join(tempBase, 'Default.SFX');
      const sfxIcon = path.join(tempBase, 'electron-icon.ico');
      fs.writeFileSync(rarExe, Buffer.from(embeddedBinaries.rarExeBase64, 'base64'));
      fs.writeFileSync(sfxModule, Buffer.from(embeddedBinaries.sfxModuleBase64, 'base64'));
      fs.writeFileSync(sfxIcon, Buffer.from(embeddedBinaries.electronIconBase64, 'base64'));

      // 4. Create WinRAR SFX
      const commentFile = path.join(tempBase, 'sfx-comment.txt');
      fs.writeFileSync(commentFile, 'Setup=electron.exe\nTempMode\nSilent=1\nOverwrite=1');
      const tmpExe = path.join(tempBase, 'debate-timer.exe');

      const child = childProcess.spawn(rarExe, [
        'a',
        '-sfxDefault.SFX',
        '-iiconelectron-icon.ico',
        '-zsfx-comment.txt',
        '-r',
        '-ep1',
        '-xrar.exe',
        '-xDefault.SFX',
        '-xelectron-icon.ico',
        '-xsfx-comment.txt',
        '-xdebate-timer.exe',
        'debate-timer.exe',
        '*'
      ], { cwd: tempBase, windowsHide: true });

      let stderr = '';
      child.stderr.setEncoding('utf8');
      child.stderr.on('data', (data) => { stderr += data; });

      child.on('error', (err) => {
        cleanupTemp(tempBase);
        reject(new Error(`rar.exe 启动失败: ${err.message}`));
      });

      child.on('close', (code) => {
        if (code !== 0) {
          cleanupTemp(tempBase);
          reject(new Error(`rar.exe 执行失败（退出码 ${code}）${stderr ? ': ' + stderr : ''}`));
          return;
        }
        if (!fs.existsSync(tmpExe)) {
          cleanupTemp(tempBase);
          reject(new Error('自解压程序生成失败，输出文件不存在'));
          return;
        }
        try {
          fs.copyFileSync(tmpExe, savePath);
          cleanupTemp(tempBase);
          resolve({ ok: true, path: savePath });
        } catch (err) {
          cleanupTemp(tempBase);
          reject(new Error(`复制 EXE 到目标路径失败: ${err.message}`));
        }
      });
    } catch (err) {
      cleanupTemp(tempBase);
      reject(err);
    }
  });
}

function refreshTimerWindow() {
  if (!timerWindow || timerWindow.isDestroyed()) {
    createTimerWindow();
    return;
  }

  timerWindow.reload();
  timerWindow.show();
  timerWindow.focus();
}

let editorWindow;
let timerWindow;

function createEditorWindow() {
  editorWindow = new BrowserWindow({
    width: 1400,
    height: 980,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });
  editorWindow.loadFile('editor.html');
}

function createTimerWindow() {
  timerWindow = new BrowserWindow({
    width: 1500,
    height: 950,
    fullscreen: false,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });
  timerWindow.loadFile('timer.html');
}

if (isElectron) {
  app.whenReady().then(() => {
    ensureUserDataDir();
    createEditorWindow();

    ipcMain.handle('load-config', () => readConfig());
    ipcMain.handle('save-config', (_event, data) => {
      const saved = writeConfig(data);
      if (timerWindow && !timerWindow.isDestroyed()) {
        timerWindow.webContents.send('config-updated', saved);
      }
      refreshTimerWindow();
      return saved;
    });
    ipcMain.handle('reset-config', () => writeConfig(defaultConfig()));
    ipcMain.handle('open-timer', () => {
      const latestConfig = readConfig();
      if (!timerWindow || timerWindow.isDestroyed()) {
        createTimerWindow();
      } else {
        timerWindow.reload();
        timerWindow.show();
        timerWindow.focus();
      }
      if (timerWindow && !timerWindow.isDestroyed()) {
        timerWindow.webContents.once('did-finish-load', () => {
          timerWindow.webContents.send('config-updated', latestConfig);
        });
      }
      if (editorWindow && !editorWindow.isDestroyed()) {
        editorWindow.hide();
      }
      return { ok: true };
    });
    ipcMain.handle('open-editor', () => {
      if (!editorWindow || editorWindow.isDestroyed()) {
        createEditorWindow();
      } else {
        editorWindow.show();
        editorWindow.focus();
      }
      if (timerWindow && !timerWindow.isDestroyed()) {
        timerWindow.hide();
      }
      return { ok: true };
    });
    ipcMain.handle('import-config', async () => {
      try {
        const { filePaths } = await dialog.showOpenDialog(editorWindow, {
          title: '导入比赛配置',
          properties: ['openFile'],
          filters: [{ name: 'JSON 配置', extensions: ['json'] }]
        });
        if (!filePaths || filePaths.length === 0) {
          return { ok: false, config: null, error: '用户取消选择' };
        }
        const content = fs.readFileSync(filePaths[0], 'utf8');
        const imported = JSON.parse(content);
        const validated = validateConfig(imported);
        if (timerWindow && !timerWindow.isDestroyed()) {
          timerWindow.webContents.send('config-updated', validated);
        }
        return { ok: true, config: validated, path: filePaths[0] };
      } catch (err) {
        console.error('导入配置失败:', err);
        return { ok: false, config: null, error: err.message };
      }
    });
    ipcMain.handle('export-config', async (_event, config) => {
      const { filePath } = await dialog.showSaveDialog(editorWindow, {
        title: '导出比赛配置',
        defaultPath: 'debate-config.json',
        filters: [{ name: 'JSON 配置', extensions: ['json'] }]
      });
      if (filePath) {
        fs.writeFileSync(filePath, JSON.stringify(config, null, 2), 'utf8');
        return { ok: true, path: filePath };
      }
      return { ok: false, path: null };
    });
    ipcMain.handle('export-standalone', async (_event, config) => {
      try {
        const { filePath } = await dialog.showSaveDialog(editorWindow, {
          title: '导出独立计时器',
          defaultPath: 'debate-timer.exe',
          filters: [{ name: '可执行文件', extensions: ['exe'] }]
        });
        if (!filePath) {
          return { ok: false, path: null, error: '用户取消保存' };
        }
        const result = await generateStandaloneExe(config, filePath);
        return result;
      } catch (err) {
        console.error('导出独立计时器失败:', err);
        return { ok: false, path: null, error: err.message };
      }
    });
    ipcMain.handle('toggle-fullscreen', () => {
      const target = timerWindow && !timerWindow.isDestroyed() ? timerWindow : editorWindow;
      if (target) {
        const next = !target.isFullScreen();
        target.setFullScreen(next);
        return { ok: true, fullscreen: next };
      }
      return { ok: false, fullscreen: false };
    });

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createEditorWindow();
    });
  });

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
  });
}

module.exports = { defaultConfig, readConfig, writeConfig, validateConfig, generateStandaloneExe, generateStandaloneAppFiles, readAsset, extractBody, copyDir };
