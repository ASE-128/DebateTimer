const fs = require('fs');
const path = require('path');
const childProcess = require('child_process');

const projectRoot = path.join(__dirname, '..');
const releaseDir = path.join(projectRoot, 'release');
const electronDist = path.join(projectRoot, 'node_modules', 'electron', 'dist');
const embeddedBinaries = require(path.join(projectRoot, 'vendor', 'embedded-binaries'));

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function copyDir(src, dest) {
  ensureDir(dest);
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

function readAsset(...segments) {
  return fs.readFileSync(path.join(projectRoot, ...segments), 'utf8');
}

function extractBody(html) {
  const match = html.match(/<body[^>]*>([\s\S]*)<\/body>/i);
  const body = match ? match[1].trim() : html;
  return body.replace(/<script[\s\S]*?<\/script>/gi, '').trim();
}

function minifyJs(code) {
  // 保守式 minify：移除行首/行尾空白和多余空行，保留注释中的版权信息
  return code
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .join('\n');
}

function minifyCss(code) {
  return code
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\s+/g, ' ')
    .replace(/;\s*}/g, '}')
    .replace(/\{\s+/g, '{')
    .replace(/\s+\}/g, '}')
    .replace(/,\s+/g, ',')
    .replace(/:\s+/g, ':')
    .replace(/;\s+/g, ';')
    .trim();
}

function inlineTimerHtml(config) {
  const timerHtml = readAsset('timer.html');
  const bodyContent = extractBody(timerHtml);
  const audioJs = minifyJs(readAsset('js', 'audio.js'));
  const coreJs = minifyJs(readAsset('js', 'timer-core.js'));
  const appJs = minifyJs(readAsset('js', 'timer-app.js'));
  const timerCss = minifyCss(readAsset('styles', 'timer.css'));

  return `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="author" content="Chen Yu">
<title>辩论赛计时器</title>
<style>${timerCss}</style>
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
<script>${audioJs}</script>
<script>${coreJs}</script>
<script>${appJs}</script>
<script>initTimerApp();</script>
</body>
</html>`;
}

function buildStandalone(config, savePath) {
  const tempBase = fs.mkdtempSync(path.join(require('os').tmpdir(), 'dt-release-'));
  try {
    // 1. Copy Electron runtime
    if (!fs.existsSync(electronDist)) {
      throw new Error('未找到 Electron 运行时，请确保已执行 npm install');
    }
    copyDir(electronDist, tempBase);

    // 2. Create app folder with inlined resources
    const appDir = path.join(tempBase, 'resources', 'app');
    ensureDir(appDir);

    fs.writeFileSync(path.join(appDir, 'package.json'), JSON.stringify({
      name: 'debate-timer-standalone',
      version: '1.0.0',
      main: 'main.js'
    }, null, 2));

    const mainJs = `const { app, BrowserWindow, ipcMain } = require('electron');\nconst path = require('path');\napp.disableHardwareAcceleration();\nfunction createWindow() {\n  const win = new BrowserWindow({ width: 1500, height: 950, fullscreen: false, autoHideMenuBar: true, webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, nodeIntegration: false } });\n  win.loadFile(path.join(__dirname, 'timer.html'));\n}\napp.whenReady().then(() => { createWindow(); ipcMain.handle('toggle-fullscreen', () => { const win = BrowserWindow.getFocusedWindow(); if (win) win.setFullScreen(!win.isFullScreen()); }); });\napp.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });`;
    fs.writeFileSync(path.join(appDir, 'main.js'), mainJs);

    const preloadJs = `const { contextBridge, ipcRenderer } = require('electron');\nconst embeddedConfig = ${JSON.stringify(config)};\ncontextBridge.exposeInMainWorld('electronAPI', { loadConfig: () => Promise.resolve(embeddedConfig), openEditor: () => Promise.resolve(), toggleFullscreen: () => ipcRenderer.invoke('toggle-fullscreen'), onConfigUpdated: () => () => {} });`;
    fs.writeFileSync(path.join(appDir, 'preload.js'), preloadJs);

    fs.writeFileSync(path.join(appDir, 'timer.html'), inlineTimerHtml(config));

    // 3. Write embedded WinRAR tools and icon
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
    const result = childProcess.spawnSync(rarExe, [
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
    ], { cwd: tempBase, windowsHide: true, encoding: 'utf8' });
    if (result.status !== 0) {
      throw new Error(`rar.exe 执行失败（退出码 ${result.status}）${result.stderr ? ': ' + result.stderr : ''}`);
    }
    if (!fs.existsSync(tmpExe)) {
      throw new Error('自解压程序生成失败');
    }

    fs.copyFileSync(tmpExe, savePath);
    console.log('Standalone EXE built:', savePath, 'size:', fs.statSync(savePath).size);
  } finally {
    fs.rmSync(tempBase, { recursive: true, force: true });
  }
}

function buildEditorRelease(config, savePath) {
  const editorHtml = readAsset('editor.html');
  const editorCss = minifyCss(readAsset('styles', 'editor.css'));
  const editorJs = minifyJs(readAsset('js', 'editor-app.js'));

  // Inline CSS and JS into editor.html
  let html = editorHtml;
  html = html.replace('<link rel="stylesheet" href="styles/editor.css" />', `<style>${editorCss}</style>`);
  html = html.replace('<script src="js/editor-app.js"></script>', `<script>${editorJs}</script>`);

  // Add meta author if not present
  if (!html.includes('name="author"')) {
    html = html.replace('<meta charset="UTF-8" />', '<meta charset="UTF-8" />\n    <meta name="author" content="Chen Yu" />');
  }

  fs.writeFileSync(savePath, html, 'utf8');
  console.log('Editor release built:', savePath, 'size:', fs.statSync(savePath).size);
}

function buildTimerRelease(config, savePath) {
  const html = inlineTimerHtml(config);
  fs.writeFileSync(savePath, html, 'utf8');
  console.log('Timer release built:', savePath, 'size:', fs.statSync(savePath).size);
}

// CLI usage
if (require.main === module) {
  const args = process.argv.slice(2);
  const config = require(path.join(projectRoot, 'main.js')).defaultConfig?.() || {
    eventName: '新建辩论赛事',
    teams: { affirmative: '正方', negative: '反方' },
    topics: { affirmative: '正方辩题', negative: '反方辩题' },
    theme: { backgroundType: 'color', backgroundImage: '', backgroundColor: '#1a1a1a', fontFamily: 'system-ui', fontSizeScale: 1, colors: { affirmative: '#c0392b', negative: '#2980b9', title: '#3498db', text: '#ffffff' } },
    segments: [
      { id: 1, name: '开场', type: 'none', duration: 0 },
      { id: 2, name: '正方一辩·开篇陈词', type: 'single_speech', duration: 180, side: 'affirmative' },
      { id: 3, name: '反方一辩·开篇陈词', type: 'single_speech', duration: 180, side: 'negative' }
    ]
  };

  ensureDir(releaseDir);

  const mode = args[0] || 'all';
  if (mode === 'all' || mode === 'editor') {
    buildEditorRelease(config, path.join(releaseDir, 'editor.html'));
  }
  if (mode === 'all' || mode === 'timer') {
    buildTimerRelease(config, path.join(releaseDir, 'timer.html'));
  }
  if (mode === 'all' || mode === 'standalone') {
    buildStandalone(config, path.join(releaseDir, 'debate-timer.exe'));
  }
  if (mode === 'all' || mode === 'electron') {
    // Build Electron app release (asar package)
    const appDir = path.join(releaseDir, 'app');
    ensureDir(appDir);
    const files = ['main.js', 'preload.js', 'editor.html', 'timer.html', 'package.json', 'README.md'];
    for (const file of files) {
      fs.copyFileSync(path.join(projectRoot, file), path.join(appDir, file));
    }
    // Copy styles and js
    copyDir(path.join(projectRoot, 'styles'), path.join(appDir, 'styles'));
    copyDir(path.join(projectRoot, 'js'), path.join(appDir, 'js'));
    copyDir(path.join(projectRoot, 'vendor'), path.join(appDir, 'vendor'));
    console.log('Electron app release copied to:', appDir);
  }
  console.log('Build complete.');
}

module.exports = { buildEditorRelease, buildTimerRelease, buildStandalone, minifyJs, minifyCss };
