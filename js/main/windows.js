const { app, BrowserWindow, screen } = require('electron');
const path = require('path');
const { log } = require('./export');

const projectRoot = path.join(__dirname, '..', '..');

let editorWindow;
let timerWindow;

function calculateWindowGeometry() {
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width: screenW, height: screenH } = primaryDisplay.workAreaSize;
  const margin = 0.9;
  const width = Math.round(screenW * margin);
  const height = Math.round(screenH * margin);
  const baseWidth = 1600;
  const baseHeight = Math.max(600, Math.round((baseWidth * screenH) / screenW));
  return { width, height, baseWidth, baseHeight };
}

function createEditorWindow() {
  log('info', '创建编辑窗口');
  const { width, height, baseWidth, baseHeight } = calculateWindowGeometry();

  editorWindow = new BrowserWindow({
    width,
    height,
    webPreferences: {
      preload: path.join(projectRoot, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });
  editorWindow.__timerBaseSize = { width: baseWidth, height: baseHeight };
  editorWindow.on('closed', () => {
    editorWindow = null;
    if (timerWindow && !timerWindow.isDestroyed()) {
      timerWindow.close();
    }
    app.quit();
  });
  editorWindow.loadFile(path.join(projectRoot, 'editor.html'));
}

function createTimerWindow() {
  log('info', '创建计时窗口');
  const { width, height, baseWidth, baseHeight } = calculateWindowGeometry();

  timerWindow = new BrowserWindow({
    width,
    height,
    fullscreen: false,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(projectRoot, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  timerWindow.__timerBaseSize = { width: baseWidth, height: baseHeight };

  timerWindow.on('closed', () => {
    timerWindow = null;
    if (editorWindow && !editorWindow.isDestroyed()) {
      editorWindow.close();
    }
    app.quit();
  });
  timerWindow.loadFile(path.join(projectRoot, 'timer.html'));
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

function getEditorWindow() {
  return editorWindow;
}

function getTimerWindow() {
  return timerWindow;
}

module.exports = {
  createEditorWindow,
  createTimerWindow,
  refreshTimerWindow,
  getEditorWindow,
  getTimerWindow
};
