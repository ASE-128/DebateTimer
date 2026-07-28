/**
 * DataService - 前后端数据服务抽象层
 *
 * 统一接口，Web 版用 localStorage 实现，Electron 版通过 IPC 实现。
 * 编辑器 app 和计时器 app 只通过此接口进行数据操作。
 */
window.DataService = (function () {
  'use strict';

  var STORAGE_KEY_CONFIG = 'debate-timer-config';
  var STORAGE_KEY_TEMPLATES = 'debate-timer-templates';

  var _configCallbacks = [];
  var _exportProgressCallbacks = [];
  var _viewOpenTimer = null;
  var _viewOpenEditor = null;

  // ==================== 默认配置 ====================

  function defaultConfig() {
    return {
      version: 3,
      eventName: '新建辩论赛事',
      teams: { affirmative: '正方', negative: '反方' },
      topics: { affirmative: '正方辩题', negative: '反方辩题' },
      theme: {
        preset: 'classic',
        colorMode: 'dark',
        backgroundType: 'color',
        backgroundImage: '',
        backgroundColor: '#1a1a1a',
        backgroundGradient: { start: '#1a1a1a', end: '#0b0e14', angle: 135 },
        fontFamily: 'system-ui',
        fontSizeScale: 1,
        customFont: '',
        customFontName: '',
        colors: {
          affirmative: '#c0392b', negative: '#2980b9',
          title: '#3498db', text: '#ffffff', neutral: '#ffffff'
        },
        statusBar: {
          height: 80,
          background: 'linear-gradient(90deg, rgba(231, 76, 60, 0.25) 0%, rgba(52, 152, 219, 0.25) 100%)',
          color: ''
        },
        backgroundImageSettings: { opacity: 1, scaleX: 100, scaleY: 100, offsetX: 0, offsetY: 0 },
        tokens: {
          radius: '16px', progressHeight: '4px', progressStyle: 'solid',
          controlStyle: 'default', motionEnabled: true, statusBarStyle: 'block',
          fwDisplay: 700, fwTitle: 900, fwBody: 700, fwCap: 600,
          fsCap: '11px', capTransform: 'uppercase', capSpacing: '2px',
          shadowLevel: 'default',
          timerFontFamily: "'JetBrains Mono', 'SF Mono', 'Courier New', Consolas, monospace"
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
      ],
      logos: { affirmative: '', negative: '' },
      schedule: []
    };
  }

  // ==================== 配置读写 ====================

  function loadFromStorage() {
    try {
      var saved = localStorage.getItem(STORAGE_KEY_CONFIG);
      if (saved) return JSON.parse(saved);
    } catch (e) { /* ignore */ }
    return null;
  }

  function saveToStorage(config) {
    try {
      localStorage.setItem(STORAGE_KEY_CONFIG, JSON.stringify(config));
    } catch (e) { /* ignore */ }
  }

  // ==================== 模板管理 ====================

  function loadTemplatesFromStorage() {
    try {
      var saved = localStorage.getItem(STORAGE_KEY_TEMPLATES);
      if (saved) return JSON.parse(saved);
    } catch (e) { /* ignore */ }
    return [];
  }

  function saveTemplatesToStorage(templates) {
    try {
      localStorage.setItem(STORAGE_KEY_TEMPLATES, JSON.stringify(templates));
    } catch (e) { /* ignore */ }
  }

  // ==================== 公开接口 ====================

  var service = {

    // ---- 初始化，注册视图回调 ----
    init: function (options) {
      if (options) {
        if (typeof options.onOpenTimer === 'function') _viewOpenTimer = options.onOpenTimer;
        if (typeof options.onOpenEditor === 'function') _viewOpenEditor = options.onOpenEditor;
      }
    },

    // ==================== 配置 CRUD ====================

    loadConfig: function () {
      if (window.__STANDALONE_CONFIG__) return Promise.resolve(window.__STANDALONE_CONFIG__);
      var cached = loadFromStorage();
      if (cached) return Promise.resolve(cached);
      return Promise.resolve(defaultConfig());
    },

    saveConfig: function (config) {
      saveToStorage(config);
      // 触发更新回调
      _configCallbacks.forEach(function (cb) {
        try { cb(config); } catch (e) { /* ignore */ }
      });
      return Promise.resolve(config);
    },

    resetConfig: function () {
      var def = defaultConfig();
      saveToStorage(def);
      _configCallbacks.forEach(function (cb) {
        try { cb(def); } catch (e) { /* ignore */ }
      });
      return Promise.resolve(def);
    },

    consumeMigrationInfo: function () {
      return Promise.resolve(null); // Web 版无迁移需求
    },

    // ==================== 主题预设 ====================

    resolvePreset: function (preset, colorMode) {
      var presets = window.__THEME_PRESETS__;
      if (!presets) return Promise.resolve(null);
      var key = (preset && presets[preset]) ? preset : 'classic';
      var mode = (colorMode === 'light' || colorMode === 'dark') ? colorMode : 'dark';
      var p = presets[key];
      var variant = p[mode];
      return Promise.resolve({
        colors: Object.assign({}, variant.colors),
        backgroundColor: variant.backgroundColor,
        statusBar: Object.assign({}, variant.statusBar),
        tokens: Object.assign({}, p.tokens)
      });
    },

    // ==================== 应用版本 / 变更日志 ====================

    getAppVersion: function () {
      return Promise.resolve('3.2.0 (Web)');
    },

    getLatestChangelog: function () {
      return Promise.resolve('');
    },

    getTimerBaseSize: function () {
      return Promise.resolve({ width: 1600, height: 900 });
    },

    // ==================== 模板 CRUD ====================

    getTemplates: function () {
      var builtins = (typeof window.builtInTemplates === 'function')
        ? window.builtInTemplates(defaultConfig)
        : [];
      var custom = loadTemplatesFromStorage();
      var customMap = {};
      custom.forEach(function (t) { customMap[t.id] = t; });

      var result = [];
      builtins.forEach(function (t) {
        var override = customMap[t.id];
        result.push({
          id: t.id, name: override ? override.name : t.name,
          description: override ? override.description : t.description,
          builtin: true, overridden: !!override,
          config: override ? override.config : t.config
        });
        delete customMap[t.id];
      });
      Object.keys(customMap).forEach(function (id) {
        var c = customMap[id];
        result.push({
          id: c.id, name: c.name, description: c.description || '',
          builtin: false, overridden: false, config: c.config
        });
      });
      return Promise.resolve(result);
    },

    saveTemplate: function (id, name, description, config) {
      if (!id || typeof id !== 'string' || !id.trim()) {
        return Promise.resolve({ ok: false, error: '模板 ID 不能为空' });
      }
      var templates = loadTemplatesFromStorage();
      var idx = -1;
      for (var i = 0; i < templates.length; i++) {
        if (templates[i].id === id) { idx = i; break; }
      }
      var template = { id: id, name: String(name || id), description: String(description || ''), config: config };
      if (idx >= 0) templates[idx] = template;
      else templates.push(template);
      saveTemplatesToStorage(templates);
      return Promise.resolve({ ok: true, id: id, overwritten: idx >= 0 });
    },

    deleteTemplate: function (id) {
      if (!id || typeof id !== 'string') {
        return Promise.resolve({ ok: false, error: '模板 ID 不能为空' });
      }
      var templates = loadTemplatesFromStorage();
      var idx = -1;
      for (var i = 0; i < templates.length; i++) {
        if (templates[i].id === id) { idx = i; break; }
      }
      if (idx >= 0) templates.splice(idx, 1);
      saveTemplatesToStorage(templates);

      // 检查是否为内置模板
      var builtins = (typeof window.builtInTemplates === 'function')
        ? window.builtInTemplates(defaultConfig)
        : [];
      var isBuiltIn = builtins.some(function (t) { return t.id === id; });
      return Promise.resolve({ ok: true, restored: isBuiltIn });
    },

    applyTemplate: function (id) {
      return this.getTemplates().then(function (templates) {
        var t = null;
        for (var i = 0; i < templates.length; i++) {
          if (templates[i].id === id) { t = templates[i]; break; }
        }
        if (!t) return { ok: false, config: null, error: '模板不存在' };
        return { ok: true, config: JSON.parse(JSON.stringify(t.config)) };
      });
    },

    // ==================== 配置导入/导出 ====================

    importConfig: function () {
      return new Promise(function (resolve) {
        var input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json,.yaml,.yml';
        input.onchange = function (e) {
          var file = e.target.files[0];
          if (!file) { resolve({ ok: false, config: null, error: '用户取消选择' }); return; }
          var reader = new FileReader();
          reader.onload = function () {
            try {
              var config = JSON.parse(reader.result);
              resolve({ ok: true, config: config, warnings: [], path: file.name });
            } catch (err) {
              resolve({ ok: false, config: null, error: '文件解析失败: ' + err.message });
            }
          };
          reader.onerror = function () {
            resolve({ ok: false, config: null, error: '文件读取失败' });
          };
          reader.readAsText(file);
        };
        input.click();
      });
    },

    exportConfig: function (config) {
      try {
        var blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url;
        a.download = 'debate-config.json';
        a.click();
        URL.revokeObjectURL(url);
        return Promise.resolve({ ok: true, path: null });
      } catch (err) {
        return Promise.resolve({ ok: false, path: null, error: err.message });
      }
    },

    // ==================== 独立计时器导出（Web 版不可用） ====================

    exportStandalone: function () {
      alert('导出独立计时器功能仅在桌面版可用。如需此功能，请下载 DebateTimer 桌面版。');
      return Promise.resolve({ ok: false, path: null, error: 'Web 版不支持独立导出' });
    },

    // ==================== 视图切换 ====================

    openTimer: function () {
      if (_viewOpenTimer) return Promise.resolve(_viewOpenTimer());
      return Promise.resolve({ ok: true });
    },

    openEditor: function () {
      if (_viewOpenEditor) return Promise.resolve(_viewOpenEditor());
      return Promise.resolve({ ok: true });
    },

    toggleFullscreen: function () {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(function () {});
      } else {
        document.exitFullscreen().catch(function () {});
      }
      return Promise.resolve({ ok: true, fullscreen: !!document.fullscreenElement });
    },

    // ==================== 事件监听 ====================

    onConfigUpdated: function (callback) {
      _configCallbacks.push(callback);
      return function () {
        var idx = _configCallbacks.indexOf(callback);
        if (idx >= 0) _configCallbacks.splice(idx, 1);
      };
    },

    onExportProgress: function () {
      // Web 版不支持导出进度
      return function () {};
    },

    // ==================== 自动更新（Web 版不可用） ====================

    onUpdateAvailable: function () { return function () {}; },
    onUpdateDownloaded: function () { return function () {}; },
    onUpdateError: function () { return function () {}; },
    startDownloadUpdate: function () {
      return Promise.reject(new Error('自动更新仅桌面版可用'));
    },
    quitAndInstall: function () { /* no-op */ },
    skipUpdate: function () { /* no-op */ },

    // ==================== 日志 ====================

    log: function (level, message) {
      var fn = console[level] || console.log;
      fn.call(console, '[DebateTimer]', '[' + level.toUpperCase() + ']', message);
    }
  };

  return service;
})();
