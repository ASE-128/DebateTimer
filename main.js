const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const { autoUpdater } = require('electron-updater');
const fs = require('fs');
const path = require('path');
const childProcess = require('child_process');
const embeddedBinaries = require('./vendor/embedded-binaries');
const pkg = require('./package.json');

const isElectron = !!(process.versions && process.versions.electron);
const isMainApp = isElectron && process.env.DEBATE_TIMER_TEST_MODE !== 'export';

const appDataRoot = isElectron ? path.join(app.getPath('appData'), 'DebateTimer') : path.join(require('os').homedir(), 'AppData', 'Roaming', 'DebateTimer');
if (isElectron) {
  app.setPath('userData', appDataRoot);
  app.setPath('cache', path.join(appDataRoot, 'cache'));
  app.setPath('temp', path.join(appDataRoot, 'temp'));
}

const userDataPath = isElectron ? app.getPath('userData') : appDataRoot;

// 日志路径：程序运行目录下的 logs 文件夹，按日期命名（单文件无大小限制）
function getLogDir() {
  return path.join(userDataPath, 'logs');
}

function getLogPath() {
  const logDir = getLogDir();
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  const filename = `${y}${m}${d}.log`;
  return path.join(logDir, filename);
}

function log(level, message) {
  const now = new Date();
  const timestamp = now.toISOString().replace('T', ' ').slice(0, 23);
  const ms = String(now.getMilliseconds()).padStart(3, '0');
  const fullTimestamp = `${timestamp}.${ms}`;
  const line = `[${fullTimestamp}] [${level.toUpperCase()}] ${message}\n`;
  try {
    const logPath = getLogPath();
    const logDir = path.dirname(logPath);
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
    fs.appendFileSync(logPath, line, 'utf8');
  } catch (e) {
    console.error('日志写入失败:', e.message);
  }
}

const configPath = path.join(userDataPath, 'config.json');

function ensureUserDataDir() {
  for (const target of [userDataPath, path.join(userDataPath, 'cache'), path.join(userDataPath, 'temp'), path.join(userDataPath, 'logs')]) {
    if (!fs.existsSync(target)) {
      fs.mkdirSync(target, { recursive: true });
    }
  }
}

function defaultConfig() {
  return {
    version: 3,
    eventName: '新建辩论赛事',
    teams: { affirmative: '正方', negative: '反方' },
    topics: { affirmative: '正方辩题', negative: '反方辩题' },
    theme: {
      preset: 'classic',
      backgroundType: 'color',
      backgroundImage: '',
      backgroundColor: '#1a1a1a',
      backgroundGradient: { start: '#1a1a1a', end: '#0b0e14', angle: 135 },
      fontFamily: 'system-ui',
      fontSizeScale: 1,
      customFont: '',
      customFontName: '',
      colors: {
        affirmative: '#c0392b',
        negative: '#2980b9',
        title: '#3498db',
        text: '#ffffff',
        neutral: '#ffffff'
      },
      statusBar: {
        height: 80,
        background: 'linear-gradient(90deg, rgba(231, 76, 60, 0.25) 0%, rgba(52, 152, 219, 0.25) 100%)',
        color: ''
      },
      backgroundImageSettings: {
        opacity: 1,
        scaleX: 100,
        scaleY: 100,
        offsetX: 0,
        offsetY: 0
      }
    },
    layout: {
      affirmativeTeamName: { x: 0, y: 0, fontSize: 0, fontFamily: '', color: '' },
      negativeTeamName: { x: 0, y: 0, fontSize: 0, fontFamily: '', color: '' },
      affirmativeTopic: { x: 0, y: 0, fontSize: 0, fontFamily: '', color: '' },
      negativeTopic: { x: 0, y: 0, fontSize: 0, fontFamily: '', color: '' },
      eventName: { x: 0, y: 0, fontSize: 0, fontFamily: '', color: '' },
      segmentName: { x: 0, y: 0, fontSize: 0, fontFamily: '', color: '' },
      sideLabel: { x: 0, y: 0, fontSize: 0, fontFamily: '', color: '' },
      watermark: { x: 0, y: 0, fontSize: 0, fontFamily: '', color: '', text: '辩论计时器' },
      designBy: { x: 0, y: 0, fontSize: 0, fontFamily: '', color: '' }
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
  const theme = input.theme || {};
  const defTheme = def.theme;
  return {
    version: 3,
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
      preset: String(theme.preset || defTheme.preset),
      backgroundType: ['color', 'image', 'gradient'].includes(theme.backgroundType) ? theme.backgroundType : defTheme.backgroundType,
      backgroundImage: String(theme.backgroundImage || defTheme.backgroundImage),
      backgroundColor: String(theme.backgroundColor || defTheme.backgroundColor),
      backgroundGradient: theme.backgroundGradient && typeof theme.backgroundGradient === 'object' ? {
        start: String(theme.backgroundGradient.start || '#1a1a1a'),
        end: String(theme.backgroundGradient.end || '#0b0e14'),
        angle: Number(theme.backgroundGradient.angle || 135)
      } : defTheme.backgroundGradient,
      fontFamily: String(theme.fontFamily || defTheme.fontFamily),
      fontSizeScale: Number(theme.fontSizeScale || defTheme.fontSizeScale),
      customFont: String(theme.customFont || defTheme.customFont),
      customFontName: String(theme.customFontName || defTheme.customFontName),
      colors: {
        affirmative: String(theme.colors?.affirmative || defTheme.colors.affirmative),
        negative: String(theme.colors?.negative || defTheme.colors.negative),
        title: String(theme.colors?.title || defTheme.colors.title),
        text: String(theme.colors?.text || defTheme.colors.text),
        neutral: String(theme.colors?.neutral || defTheme.colors.neutral)
      },
      statusBar: theme.statusBar && typeof theme.statusBar === 'object' ? {
        height: Number(theme.statusBar.height || 80),
        background: String(theme.statusBar.background || 'linear-gradient(90deg, rgba(231, 76, 60, 0.25) 0%, rgba(52, 152, 219, 0.25) 100%)'),
        color: String(theme.statusBar.color || '')
      } : defTheme.statusBar,
      backgroundImageSettings: theme.backgroundImageSettings && typeof theme.backgroundImageSettings === 'object' ? {
        opacity: Number(theme.backgroundImageSettings.opacity ?? 1),
        scaleX: Number(theme.backgroundImageSettings.scaleX ?? 100),
        scaleY: Number(theme.backgroundImageSettings.scaleY ?? 100),
        offsetX: Number(theme.backgroundImageSettings.offsetX ?? 0),
        offsetY: Number(theme.backgroundImageSettings.offsetY ?? 0)
      } : defTheme.backgroundImageSettings
    },
    layout: input.layout && typeof input.layout === 'object' ? Object.fromEntries(
      Object.entries(input.layout).map(([key, val]) => [key, {
        x: Number(val?.x || 0),
        y: Number(val?.y || 0),
        fontSize: Number(val?.fontSize || 0),
        fontFamily: String(val?.fontFamily || ''),
        color: String(val?.color || ''),
        text: String(val?.text || '')
      }])
    ) : def.layout,
    segments: Array.isArray(input.segments) ? input.segments.map((seg, i) => ({
      id: i + 1,
      name: String(seg.name || '未命名环节'),
      type: ['none', 'single_speech', 'single_question', 'dual_debate', 'neutral_timer'].includes(seg.type) ? seg.type : 'none',
      duration: Math.max(0, Number(seg.duration || 0)),
      side: ['affirmative', 'negative', 'neutral'].includes(seg.side) ? seg.side : undefined
    })) : def.segments
  };
}

let lastMigrationInfo = null;

function migrateV2ToV3(oldConfig) {
  if (!oldConfig || typeof oldConfig !== 'object') {
    return defaultConfig();
  }

  // 深拷贝，避免修改原始对象
  const cloned = JSON.parse(JSON.stringify(oldConfig));

  // 处理 backgroundImageSettings.scale -> scaleX / scaleY
  // 旧版 scale 为倍数（1 = 100%），新版 scaleX/scaleY 为百分比数值
  const bgSettings = cloned.theme?.backgroundImageSettings;
  if (bgSettings && typeof bgSettings === 'object' && bgSettings.scale !== undefined) {
    const scaleValue = (Number(bgSettings.scale) || 1) * 100;
    if (bgSettings.scaleX === undefined) bgSettings.scaleX = scaleValue;
    if (bgSettings.scaleY === undefined) bgSettings.scaleY = scaleValue;
    delete bgSettings.scale;
  }

  // 移除 2.x 废弃的 SFX 相关字段（如果存在）
  const deprecatedFields = ['sfxEnabled', 'sfxScript', 'sfxConfig', 'useSfx', 'winrarSfx', 'standaloneSfx'];
  for (const field of deprecatedFields) {
    if (cloned[field] !== undefined) {
      delete cloned[field];
    }
  }

  cloned.version = 3;
  return validateConfig(cloned);
}

function readConfig() {
  ensureUserDataDir();
  let migrated = false;
  if (!fs.existsSync(configPath)) {
    fs.writeFileSync(configPath, JSON.stringify(defaultConfig(), null, 2));
    log('info', '创建默认配置文件');
  } else {
    const raw = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    if (!raw.version || raw.version < 3) {
      const backupPath = `${configPath}.v2.bak`;
      fs.writeFileSync(backupPath, JSON.stringify(raw, null, 2));
      log('info', `检测到旧版配置 (version=${raw.version ?? 'none'})，已备份到 ${backupPath}`);
      const migratedConfig = migrateV2ToV3(raw);
      fs.writeFileSync(configPath, JSON.stringify(migratedConfig, null, 2));
      log('info', '配置已迁移到 3.0 格式');
      lastMigrationInfo = { fromVersion: raw.version ?? null, backupPath };
      migrated = true;
    }
  }
  const config = validateConfig(JSON.parse(fs.readFileSync(configPath, 'utf8')));
  if (!migrated) {
    lastMigrationInfo = null;
  }
  log('info', '配置已加载');
  return config;
}

function writeConfig(data) {
  ensureUserDataDir();
  fs.writeFileSync(configPath, JSON.stringify(data, null, 2));
  log('info', '配置已保存');
  return readConfig();
}

function readAsset(...segments) {
  return fs.readFileSync(path.join(__dirname, ...segments), 'utf8');
}

function getLatestChangelog() {
  const changelogPath = path.join(__dirname, 'CHANGELOG.md');
  try {
    const content = fs.readFileSync(changelogPath, 'utf8');
    const lines = content.split(/\r?\n/);
    let start = -1;
    for (let i = 0; i < lines.length; i++) {
      if (/^##\s*\[\d+\.\d+\.\d+\]/.test(lines[i])) {
        start = i;
        break;
      }
    }
    if (start === -1) return '';

    let end = lines.length;
    for (let i = start + 1; i < lines.length; i++) {
      if (/^##\s*\[\d+\.\d+\.\d+\]/.test(lines[i])) {
        end = i;
        break;
      }
    }

    return lines.slice(start, end).join('\n').trim();
  } catch (e) {
    log('error', `读取 CHANGELOG.md 失败: ${e.message}`);
    return '';
  }
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
    } else if (entry.name.toLowerCase() === 'default_app.asar') {
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
    version: pkg.version || '1.0.0',
    main: 'main.js'
  }, null, 2));

  const mainJs = `const { app, BrowserWindow, ipcMain } = require('electron');\nconst path = require('path');\nconst fs = require('fs');\nconst url = require('url');\n\napp.disableHardwareAcceleration();\napp.commandLine.appendSwitch('disable-gpu');\napp.commandLine.appendSwitch('disable-software-rasterizer');\napp.commandLine.appendSwitch('disable-gpu-compositing');\napp.commandLine.appendSwitch('disable-gpu-rasterization');\napp.commandLine.appendSwitch('disable-features', 'CalculateNativeWinOcclusion');\n\nconst userDataRoot = path.join(app.getPath('appData'), 'DebateTimerStandalone');\nconst cacheRoot = path.join(userDataRoot, 'Cache');\n\nfunction ensureDir(dir) {\n  try {\n    fs.mkdirSync(dir, { recursive: true });\n  } catch (e) {\n    console.error('Failed to create directory:', dir, e.message);\n  }\n}\n\nensureDir(userDataRoot);\nensureDir(cacheRoot);\napp.setPath('userData', userDataRoot);\napp.setPath('cache', cacheRoot);\napp.setAppUserModelId('DebateTimerStandalone');\n\nconsole.log('Standalone userData:', userDataRoot);\nconsole.log('Standalone cache:', cacheRoot);\n\nfunction createWindow() {\n  const timerHtmlPath = path.join(__dirname, 'timer.html');\n  if (!fs.existsSync(timerHtmlPath)) {\n    console.error('timer.html not found:', timerHtmlPath);\n  }\n\n  const win = new BrowserWindow({\n    width: 1500,\n    height: 950,\n    fullscreen: false,\n    autoHideMenuBar: true,\n    show: false,\n    icon: path.join(__dirname, 'electron-icon.ico'),\n    webPreferences: {\n      preload: path.join(__dirname, 'preload.js'),\n      contextIsolation: true,\n      nodeIntegration: false,\n      sandbox: false,\n      webSecurity: false,\n      allowRunningInsecureContent: true\n    }\n  });\n\n  win.once('ready-to-show', () => win.show());\n\n  win.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {\n    console.error('Page load failed:', errorCode, errorDescription);\n  });\n\n  win.webContents.on('render-process-gone', (event, details) => {\n    console.error('Renderer process gone:', details);\n  });\n\n  win.webContents.on('crashed', (event, killed) => {\n    console.error('Renderer crashed, killed:', killed);\n  });\n\n  const fileUrl = url.pathToFileURL(timerHtmlPath).href;\n  console.log('Loading URL:', fileUrl);\n  win.loadURL(fileUrl).catch((err) => {\n    console.error('loadURL failed:', err.message);\n  });\n\n  if (process.env.DEBATE_TIMER_DEVTOOLS === '1') {\n    win.webContents.openDevTools();\n  }\n}\n\napp.whenReady().then(() => {\n  ipcMain.handle('toggle-fullscreen', () => {\n    const win = BrowserWindow.getFocusedWindow();\n    if (win) win.setFullScreen(!win.isFullScreen());\n  });\n  createWindow();\n});\n\nprocess.on('uncaughtException', (err) => {\n  console.error('Uncaught exception:', err);\n});\n\napp.on('window-all-closed', () => {\n  if (process.platform !== 'darwin') app.quit();\n});\n`;
  fs.writeFileSync(path.join(appDir, 'main.js'), mainJs);

  const preloadJs = 'const { contextBridge, ipcRenderer } = require(\'electron\');\n' +
    'const embeddedConfig = ' + JSON.stringify(config) + ';\n' +
    'contextBridge.exposeInMainWorld(\'electronAPI\', {\n' +
    '  loadConfig: () => Promise.resolve(embeddedConfig),\n' +
    '  openEditor: () => Promise.resolve(),\n' +
    '  toggleFullscreen: () => ipcRenderer.invoke(\'toggle-fullscreen\'),\n' +
    '  log: () => Promise.resolve(),\n' +
    '  onConfigUpdated: () => () => {}\n' +
    '});\n';
  fs.writeFileSync(path.join(appDir, 'preload.js'), preloadJs);

  const timerHtml = readAsset('timer.html');
  const bodyContent = extractBody(timerHtml).replace(/<div[^>]*id=["']standaloneSetup["'][^>]*>[\s\S]*?<\/div>\s*<\/div>/i, '').trim();

  function escapeHtml(str) {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  const standaloneProductName = pkg.productName || pkg.name || 'DebateTimer';
  const standaloneAuthor = pkg.author || 'DebateTimer';
  const standaloneTimerHtml = '<!doctype html>\n' +
    '<html lang="zh-CN">\n' +
    '<head>\n' +
    '  <meta charset="UTF-8">\n' +
    '  <meta name="viewport" content="width=device-width, initial-scale=1.0">\n' +
    '  <meta name="author" content="' + standaloneAuthor + '">\n' +
    '  <title>' + standaloneProductName + '</title>\n' +
    '  <link rel="stylesheet" href="styles/variables.css">\n' +
    '  <link rel="stylesheet" href="styles/timer.css">\n' +
    '</head>\n' +
    '<body>\n' +
    '  ' + bodyContent + '\n' +
    '  <div id="standaloneSetup" class="standalone-setup">\n' +
    '    <div class="box">\n' +
    '      <h2>赛前设置</h2>\n' +
    '      <label>正方队伍<input id="ssAffirmativeTeam" type="text" value="' + escapeHtml(config.teams?.affirmative || '') + '"></label>\n' +
    '      <label>正方辩题<input id="ssAffirmativeTopic" type="text" value="' + escapeHtml(config.topics?.affirmative || '') + '"></label>\n' +
    '      <label>反方队伍<input id="ssNegativeTeam" type="text" value="' + escapeHtml(config.teams?.negative || '') + '"></label>\n' +
    '      <label>反方辩题<input id="ssNegativeTopic" type="text" value="' + escapeHtml(config.topics?.negative || '') + '"></label>\n' +
    '      <button id="ssStartBtn">开始计时</button>\n' +
    '    </div>\n' +
    '  </div>\n' +
    '  <script>window.__STANDALONE_CONFIG__ = ' + JSON.stringify(config) + ';</script>\n' +
    '  <script src="js/toast.js"></script>\n' +
    '  <script src="js/audio.js"></script>\n' +
    '  <script src="js/timer-core.js"></script>\n' +
    '  <script src="js/timer-app.js"></script>\n' +
    '</body>\n' +
    '</html>';

  fs.writeFileSync(path.join(appDir, 'timer.html'), standaloneTimerHtml);
  fs.writeFileSync(path.join(appDir, 'styles', 'variables.css'), readAsset('styles', 'variables.css'));
  fs.writeFileSync(path.join(appDir, 'styles', 'timer.css'), readAsset('styles', 'timer.css'));
  fs.writeFileSync(path.join(appDir, 'js', 'toast.js'), readAsset('js', 'toast.js'));
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

function findMakensis(tempBase) {
  // 1. 优先使用 vendor/nsis/makensis.exe（完整 NSIS 目录，推荐）
  // 打包环境下 vendor 已被 asarUnpack 释放到 app.asar.unpacked
  const candidates = [];
  if (app && app.isPackaged) {
    candidates.push(path.join(process.resourcesPath, 'app.asar.unpacked', 'vendor', 'nsis', 'makensis.exe'));
  }
  candidates.push(path.join(__dirname, 'vendor', 'nsis', 'makensis.exe'));
  candidates.push(path.join(__dirname, 'vendor', 'makensis.exe'));

  for (const p of candidates) {
    if (fs.existsSync(p)) {
      log('info', `使用 vendor/nsis 目录下的 makensis.exe: ${p}`);
      return p;
    }
  }

  // 4. 从 PATH 环境变量中查找
  const pathEnv = process.env.PATH || process.env.Path || '';
  const dirs = pathEnv.split(path.delimiter);
  for (const dir of dirs) {
    if (!dir) continue;
    const p = path.join(dir.trim(), 'makensis.exe');
    if (fs.existsSync(p)) {
      log('info', `从 PATH 找到 makensis.exe: ${p}`);
      return p;
    }
  }

  // 5. 使用内嵌的 makensis.exe（如果提供了 makensisBase64）
  if (embeddedBinaries && embeddedBinaries.makensisBase64) {
    const embeddedPath = path.join(tempBase, 'makensis.exe');
    fs.writeFileSync(embeddedPath, Buffer.from(embeddedBinaries.makensisBase64, 'base64'));
    log('info', '使用内嵌的 makensis.exe');
    return embeddedPath;
  }

  throw new Error('未找到 makensis.exe。推荐将完整 NSIS 目录复制到 vendor/nsis/，或放置 makensis.exe 于 vendor/makensis.exe，或安装 NSIS 并加入 PATH，亦或在 vendor/embedded-binaries.js 中提供 makensisBase64。');
}

function toVersionQuad(version) {
  const parts = String(version || '0.0.0').split('.').map((p) => parseInt(p, 10) || 0);
  while (parts.length < 4) parts.push(0);
  return parts.slice(0, 4).join('.');
}

function generateNsisScript(nsiPath, packageDir, appName, appExeName, iconName) {
  const packageName = path.basename(packageDir);
  const appVersion = pkg.version || '1.0.0';
  const displayName = '辩论赛计时器';
  const installDirName = 'DebateTimer-Standalone';
  const authorName = pkg.author || 'DebateTimer';
  const script =
    '; NSIS installer generated by DebateTimer\n' +
    'Unicode true\n' +
    'SetCompressor /SOLID zlib\n' +
    '\n' +
    '!define APP_NAME "' + displayName + '"\n' +
    '!define APP_EXE "' + appExeName + '"\n' +
    '!define ICON_NAME "' + iconName + '"\n' +
    '\n' +
    'Name "${APP_NAME}"\n' +
    'OutFile "' + displayName + '-Setup.exe"\n' +
    'InstallDir "$LOCALAPPDATA\\' + installDirName + '"\n' +
    'RequestExecutionLevel user\n' +
    '\n' +
    '; 版本信息\n' +
    'VIProductVersion "' + toVersionQuad(appVersion) + '"\n' +
    'VIAddVersionKey "ProductName" "${APP_NAME}"\n' +
    'VIAddVersionKey "ProductVersion" "' + appVersion + '"\n' +
    'VIAddVersionKey "FileVersion" "' + appVersion + '"\n' +
    'VIAddVersionKey "FileDescription" "${APP_NAME}安装程序"\n' +
    'VIAddVersionKey "LegalCopyright" "© ' + authorName + ' 2026"\n' +
    '\n' +
    '!include "MUI2.nsh"\n' +
    '!define MUI_ICON "${ICON_NAME}"\n' +
    '!define MUI_UNICON "${ICON_NAME}"\n' +
    '!insertmacro MUI_PAGE_DIRECTORY\n' +
    '!insertmacro MUI_PAGE_INSTFILES\n' +
    '!insertmacro MUI_LANGUAGE "SimpChinese"\n' +
    '\n' +
    '; 旧版本检测与卸载\n' +
    'Function .onInit\n' +
    '  ReadRegStr $0 HKCU "Software\\${APP_NAME}" "InstallPath"\n' +
    '  StrCmp $0 "" done\n' +
    '  IfFileExists "$0\\${APP_EXE}" 0 done\n' +
    '  MessageBox MB_YESNO "检测到已安装版本（$0），是否先卸载旧版本？" IDYES uninstall IDNO cancel\n' +
    '  uninstall:\n' +
    '    ExecWait \'"$0\\uninst.exe" /S\'\n' +
    '    Goto done\n' +
    '  cancel:\n' +
    '    Abort\n' +
    '  done:\n' +
    'FunctionEnd\n' +
    '\n' +
    'Section "Install" SecInstall\n' +
    '  SetOutPath "$INSTDIR"\n' +
    '  File /r "' + packageName + '\\*.*"\n' +
    '\n' +
    '  ; 记录安装路径到注册表，便于后续升级或卸载\n' +
    '  WriteRegStr HKCU "Software\\${APP_NAME}" "InstallPath" "$INSTDIR"\n' +
    '  WriteRegStr HKCU "Software\\${APP_NAME}" "Version" "' + appVersion + '"\n' +
    '\n' +
    '  ; 桌面快捷方式\n' +
    '  CreateShortcut "$DESKTOP\\${APP_NAME}.lnk" "$INSTDIR\\${APP_EXE}" "" "$INSTDIR\\${ICON_NAME}"\n' +
    '  ; 开始菜单\n' +
    '  CreateDirectory "$SMPROGRAMS\\${APP_NAME}"\n' +
    '  CreateShortcut "$SMPROGRAMS\\${APP_NAME}\\${APP_NAME}.lnk" "$INSTDIR\\${APP_EXE}" "" "$INSTDIR\\${ICON_NAME}"\n' +
    '\n' +
    '  WriteUninstaller "$INSTDIR\\uninst.exe"\n' +
    '\n' +
    '  ; 安装完成后运行应用\n' +
    '  Exec \'"$INSTDIR\\${APP_EXE}"\'\n' +
    'SectionEnd\n' +
    '\n' +
    'Section "Uninstall" SecUninstall\n' +
    '  RMDir /r "$INSTDIR"\n' +
    '  Delete "$DESKTOP\\${APP_NAME}.lnk"\n' +
    '  RMDir /r "$SMPROGRAMS\\${APP_NAME}"\n' +
    '  DeleteRegKey HKCU "Software\\${APP_NAME}"\n' +
    'SectionEnd\n';

  fs.writeFileSync(nsiPath, '\ufeff' + script, 'utf8');
}

function trimElectronRuntime(packageDir) {
  // 仅保留中文语言包，减少安装包体积
  const localesDir = path.join(packageDir, 'locales');
  if (fs.existsSync(localesDir)) {
    try {
      const entries = fs.readdirSync(localesDir);
      for (const entry of entries) {
        if (entry.toLowerCase() !== 'zh-cn.pak') {
          fs.rmSync(path.join(localesDir, entry), { recursive: true, force: true });
        }
      }
      log('info', '已清理 Electron 运行时多语言文件');
    } catch (e) {
      log('warn', `清理多语言文件失败: ${e.message}`);
    }
  }

  // 移除 GPU/媒体相关文件（独立计时器已禁用硬件加速，无需 D3D12/Vulkan 图形 API）
  // 注意：ffmpeg.dll 保留，Chromium 渲染进程初始化仍依赖它
  const itemsToRemove = [
    'swiftshader',
    'vk_swiftshader.dll',
    'vk_swiftshader_icd.json',
    'dxcompiler.dll',
    'dxil.dll',
    'vulkan-1.dll'
  ];
  for (const item of itemsToRemove) {
    const itemPath = path.join(packageDir, item);
    if (fs.existsSync(itemPath)) {
      try {
        fs.rmSync(itemPath, { recursive: true, force: true });
      } catch (e) {
        log('warn', `清理 ${item} 失败: ${e.message}`);
      }
    }
  }
}

function getElectronDist() {
  // 优先使用 node_modules 中的 Electron 运行时，这是纯净的运行时
  const devPath = path.join(__dirname, 'node_modules', 'electron', 'dist');
  if (fs.existsSync(devPath)) {
    return devPath;
  }
  // 如果找不到（例如在生产环境中），尝试使用当前应用目录
  if (app.isPackaged) {
    const packedDir = path.dirname(process.execPath);
    if (fs.existsSync(packedDir)) return packedDir;
  }
  throw new Error('未找到 Electron 运行时，请确保已执行 npm install');
}

function writeIconToTemp(tempBase) {
  const iconPath = path.join(tempBase, 'electron-icon.ico');
  // 尝试优先使用 Electron 运行时目录下的默认 .ico（打包环境下）或项目内的 icon 文件，找不到则回退到内嵌图标
  let sourceIcon = null;
  try {
    const execDir = path.dirname(process.execPath || '');
    const candidates = [];
    if (app && app.isPackaged) {
      candidates.push(path.join(execDir, 'electron-icon.ico'));
      candidates.push(path.join(execDir, path.basename(process.execPath, '.exe') + '.ico'));
      candidates.push(path.join(execDir, 'icon.ico'));
      candidates.push(path.join(execDir, 'resources', 'electron-icon.ico'));
      candidates.push(path.join(execDir, 'resources', 'app.asar.unpacked', 'icon.ico'));
      candidates.push(path.join(__dirname, 'icon.ico'));
    }
    candidates.push(path.join(__dirname, 'icon.ico'));
    candidates.push(path.join(__dirname, 'electron-icon.ico'));
    candidates.push(path.join(__dirname, 'resources', 'electron-icon.ico'));
    candidates.push(path.join(__dirname, 'resources', 'app.asar.unpacked', 'icon.ico'));
    for (const c of candidates) {
      if (fs.existsSync(c)) { sourceIcon = c; break; }
    }
  } catch (e) {
    sourceIcon = null;
  }
  if (sourceIcon) {
    try { fs.copyFileSync(sourceIcon, iconPath); }
    catch (e) { fs.writeFileSync(iconPath, Buffer.from(embeddedBinaries.electronIconBase64, 'base64')); }
  } else {
    fs.writeFileSync(iconPath, Buffer.from(embeddedBinaries.electronIconBase64, 'base64'));
  }
  return iconPath;
}

function generateStandaloneExe(config, savePath, onProgress = () => {}) {
  return new Promise((resolve, reject) => {
    let tempBase = null;
    try {
      onProgress(2, '准备临时目录...');
      const appVersion = pkg.version || '1.0.0';
      tempBase = path.join(app.getPath('temp'), `DebateTimer-standalone-${appVersion}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`);
      fs.mkdirSync(tempBase, { recursive: true });
      log('info', `创建临时目录: ${tempBase}`);

      // 1. 复制 Electron 运行时至 package 目录
      onProgress(5, '复制 Electron 运行时...');
      const packageDir = path.join(tempBase, 'package');
      const electronDist = getElectronDist();
      copyDir(electronDist, packageDir);
      log('info', 'Electron 运行时复制完成');

      // 1.5 清理运行时中不必要的文件以减小安装包体积
      onProgress(25, '清理运行时冗余文件...');
      trimElectronRuntime(packageDir);

      // 打包后 electron.exe 可能被重命名，确保存在 electron.exe
      if (!fs.existsSync(path.join(packageDir, 'electron.exe'))) {
        const appExeName = path.basename(process.execPath);
        const appExePath = path.join(packageDir, appExeName);
        if (fs.existsSync(appExePath)) {
          fs.copyFileSync(appExePath, path.join(packageDir, 'electron.exe'));
          log('info', `从 ${appExeName} 复制一份 electron.exe`);
        }
      }

      // 2. 生成应用文件
      onProgress(35, '生成应用文件...');
      const appDir = path.join(packageDir, 'resources', 'app');
      generateStandaloneAppFiles(config, appDir);
      log('info', '应用文件生成完成');

      // 3. 重命名为独立的可执行文件名
      onProgress(45, '准备可执行文件...');
      const appExeName = 'DebateTimer.exe';
      fs.renameSync(path.join(packageDir, 'electron.exe'), path.join(packageDir, appExeName));
      log('info', `已将 electron.exe 重命名为 ${appExeName}`);

      // 4. 准备图标
      onProgress(50, '准备图标...');
      const iconName = 'electron-icon.ico';
      const iconPath = writeIconToTemp(tempBase);
      fs.copyFileSync(iconPath, path.join(packageDir, iconName));
      log('info', '图标准备完成');

      // 5. 查找 makensis.exe
      onProgress(55, '准备安装程序编译器...');
      const makensisExe = findMakensis(tempBase);

      // 6. 生成 .nsi 脚本
      onProgress(60, '生成安装脚本...');
      const appName = pkg.productName || pkg.name || 'DebateTimer';
      const nsiPath = path.join(tempBase, 'installer.nsi');
      generateNsisScript(nsiPath, packageDir, appName, appExeName, iconName);
      log('info', `NSIS 脚本生成完成: ${nsiPath}`);

      // 7. 调用 makensis.exe 编译安装程序
      onProgress(65, '编译安装程序（耗时较长）...');
      const tmpExe = path.join(tempBase, '辩论赛计时器-Setup.exe');
      const child = childProcess.spawn(makensisExe, ['/INPUTCHARSET', 'UTF8', nsiPath], { cwd: tempBase, windowsHide: true });

      let stdout = '';
      let stderr = '';
      child.stdout.setEncoding('utf8');
      child.stdout.on('data', (data) => { stdout += data; });
      child.stderr.setEncoding('utf8');
      child.stderr.on('data', (data) => { stderr += data; });

      child.on('error', (err) => {
        cleanupTemp(tempBase);
        log('error', `makensis.exe 启动失败: ${err.message}`);
        reject(new Error(`makensis.exe 启动失败: ${err.message}`));
      });

      child.on('close', (code) => {
        if (code !== 0) {
          cleanupTemp(tempBase);
          log('error', `makensis.exe 执行失败（退出码 ${code}）${stderr ? ': ' + stderr : ''}`);
          reject(new Error(`makensis.exe 执行失败（退出码 ${code}）${stderr ? ': ' + stderr : ''}`));
          return;
        }
        if (!fs.existsSync(tmpExe)) {
          cleanupTemp(tempBase);
          log('error', 'NSIS 安装程序生成失败，输出文件不存在');
          reject(new Error('NSIS 安装程序生成失败，输出文件不存在'));
          return;
        }
        try {
          onProgress(95, '复制安装程序到目标位置...');
          fs.copyFileSync(tmpExe, savePath);
          onProgress(100, '完成');
          cleanupTemp(tempBase);
          log('info', `安装程序复制到目标路径: ${savePath}`);
          resolve({ ok: true, path: savePath });
        } catch (err) {
          cleanupTemp(tempBase);
          log('error', `复制安装程序到目标路径失败: ${err.message}`);
          reject(new Error(`复制安装程序到目标路径失败: ${err.message}`));
        }
      });
    } catch (err) {
      cleanupTemp(tempBase);
      log('error', `生成独立 EXE 失败: ${err.message}`);
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
  log('info', '创建编辑窗口');
  editorWindow = new BrowserWindow({
    width: 1400,
    height: 980,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });
  editorWindow.on('closed', () => {
    editorWindow = null;
    if (timerWindow && !timerWindow.isDestroyed()) {
      timerWindow.close();
    }
    app.quit();
  });
  editorWindow.loadFile('editor.html');
}

function createTimerWindow() {
  log('info', '创建计时窗口');
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
  timerWindow.on('closed', () => {
    timerWindow = null;
    if (editorWindow && !editorWindow.isDestroyed()) {
      editorWindow.close();
    }
    app.quit();
  });
  timerWindow.loadFile('timer.html');
}

if (isMainApp) {
  app.whenReady().then(() => {
    log('info', '应用启动');
    ensureUserDataDir();
    createEditorWindow();

    ipcMain.handle('load-config', () => readConfig());
    ipcMain.handle('get-app-version', () => pkg.version || '0.0.0');
    ipcMain.handle('get-latest-changelog', () => getLatestChangelog());
    ipcMain.handle('consume-migration-info', () => {
      const info = lastMigrationInfo;
      lastMigrationInfo = null;
      return info;
    });
    ipcMain.handle('log', (_event, level, message) => {
      log(level, message);
    });
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
          log('warn', '用户取消导入配置');
          return { ok: false, config: null, error: '用户取消选择' };
        }
        const content = fs.readFileSync(filePaths[0], 'utf8');
        const imported = JSON.parse(content);
        const validated = validateConfig(imported);
        if (timerWindow && !timerWindow.isDestroyed()) {
          timerWindow.webContents.send('config-updated', validated);
        }
        log('info', `配置已导入: ${filePaths[0]}`);
        return { ok: true, config: validated, path: filePaths[0] };
      } catch (err) {
        log('error', `导入配置失败: ${err.message}`);
        console.error('导入配置失败:', err);
        return { ok: false, config: null, error: err.message };
      }
    });
    ipcMain.handle('export-config', async (_event, config) => {
      try {
        const { filePath } = await dialog.showSaveDialog(editorWindow, {
          title: '导出比赛配置',
          defaultPath: 'debate-config.json',
          filters: [{ name: 'JSON 配置', extensions: ['json'] }]
        });
        if (filePath) {
          fs.writeFileSync(filePath, JSON.stringify(config, null, 2), 'utf8');
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
    ipcMain.handle('export-standalone', async (_event, config) => {
      try {
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
          if (editorWindow && !editorWindow.isDestroyed()) {
            editorWindow.webContents.send('export-progress', { percent, message });
          }
        });
        log('info', `独立计时器已生成: ${filePath}`);
        return result;
      } catch (err) {
        log('error', `导出独立计时器失败: ${err.message}`);
        console.error('导出独立计时器失败:', err);
        return { ok: false, path: null, error: err.message };
      }
    });
    ipcMain.handle('toggle-fullscreen', (event) => {
      const senderWindow = BrowserWindow.fromWebContents(event.sender);
      const target = senderWindow && !senderWindow.isDestroyed() ? senderWindow : (timerWindow && !timerWindow.isDestroyed() ? timerWindow : editorWindow);
      if (target) {
        const next = !target.isFullScreen();
        target.setFullScreen(next);
        return { ok: true, fullscreen: next };
      }
      return { ok: false, fullscreen: false };
    });

    // 自动更新
    let skippedVersion = null;
    function sendToEditor(channel, ...args) {
      if (editorWindow && !editorWindow.isDestroyed()) {
        editorWindow.webContents.send(channel, ...args);
      }
    }

    autoUpdater.on('update-available', (info) => {
      if (skippedVersion === info.version) {
        log('info', `用户已跳过版本 ${info.version}，不提示更新`);
        return;
      }
      log('info', `发现新版本: ${info.version}`);
      sendToEditor('update-available', { version: info.version });
    });

    autoUpdater.on('update-downloaded', () => {
      log('info', '更新已下载');
      sendToEditor('update-downloaded');
    });

    autoUpdater.on('error', (err) => {
      log('error', `自动更新错误: ${err.message}`);
      sendToEditor('update-error', { message: err.message });
    });

    ipcMain.handle('start-download-update', () => {
      log('info', '用户开始下载更新');
      return autoUpdater.downloadUpdate();
    });

    ipcMain.handle('quit-and-install', () => {
      log('info', '用户退出并安装更新');
      autoUpdater.quitAndInstall();
    });

    ipcMain.handle('skip-update', (_event, version) => {
      skippedVersion = version;
      log('info', `用户跳过版本 ${version}`);
    });

    setTimeout(() => {
      autoUpdater.checkForUpdatesAndNotify().catch((err) => {
        log('error', `检查更新失败: ${err.message}`);
      });
    }, 3000);

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createEditorWindow();
    });
  });

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
  });
}

module.exports = { defaultConfig, readConfig, writeConfig, validateConfig, migrateV2ToV3, generateStandaloneExe, generateStandaloneAppFiles, generateNsisScript, readAsset, extractBody, copyDir };
