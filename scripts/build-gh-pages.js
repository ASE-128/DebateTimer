/**
 * scripts/build-gh-pages.js
 *
 * 从当前项目生成 Web 兼容版的计时器页面到 docs/ 目录，
 * 用于部署到 GitHub Pages。
 *
 * 用法: node scripts/build-gh-pages.js [--config <path>]
 *
 * 不带参数时使用默认配置；可传入一个 JSON 配置文件路径来嵌入自定义配置。
 */

const fs = require('fs');
const path = require('path');

const projectRoot = path.join(__dirname, '..');
const docsDir = path.join(projectRoot, 'docs');

// 从 export.js 借用的一些工具函数
function extractBody(html) {
  const match = html.match(/<body[^>]*>([\s\S]*)<\/body>/i);
  const body = match ? match[1].trim() : html;
  return body.replace(/<script[\s\S]*?<\/script>/gi, '').trim();
}

function escapeHtml(str) {
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

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
      },
      tokens: {
        radius: '16px',
        progressHeight: '4px',
        progressStyle: 'solid',
        controlStyle: 'default',
        motionEnabled: true,
        statusBarStyle: 'block',
        fwDisplay: 700,
        fwTitle: 900,
        fwBody: 700,
        fwCap: 600,
        fsCap: '11px',
        capTransform: 'uppercase',
        capSpacing: '2px',
        shadowLevel: 'default',
        timerFontFamily: "'JetBrains Mono', 'SF Mono', 'Courier New', Consolas, monospace"
      }
    },
    layout: {
      affirmativeTeamName: { x: 0, y: 0, fontSize: 0, fontFamily: '', color: '' },
      negativeTeamName: { x: 0, y: 0, fontSize: 0, fontFamily: '', color: '' },
      affirmativeTopic: { x: 0, y: 0, fontSize: 0, fontFamily: '', color: '' },
      negativeTopic: { x: 0, y: 0, fontSize: 0, fontFamily: '', color: '' },
      affirmativeLabel: { x: 0, y: 0, fontSize: 0, fontFamily: '', color: '', text: '正方' },
      negativeLabel: { x: 0, y: 0, fontSize: 0, fontFamily: '', color: '', text: '反方' },
      eventName: { x: 0, y: 0, fontSize: 0, fontFamily: '', color: '' },
      segmentName: { x: 0, y: 0, fontSize: 0, fontFamily: '', color: '' },
      sideLabel: { x: 0, y: 0, fontSize: 0, fontFamily: '', color: '' },
      affirmativeSideLabel: {
        x: 0,
        y: 0,
        fontSize: 0,
        fontFamily: '',
        color: '',
        text: '正方发言中'
      },
      negativeSideLabel: {
        x: 0,
        y: 0,
        fontSize: 0,
        fontFamily: '',
        color: '',
        text: '反方发言中'
      },
      neutralSideLabel: {
        x: 0,
        y: 0,
        fontSize: 0,
        fontFamily: '',
        color: '',
        text: '中立计时中'
      },
      watermark: { x: 0, y: 0, fontSize: 0, fontFamily: '', color: '', text: '辩论计时器' },
      judges: { x: 0, y: 0, fontSize: 0, fontFamily: '', color: '' }
    },
    segments: [
      { id: 1, name: '开场', type: 'none', duration: 0 },
      { id: 2, name: '正方一辩·开篇陈词', type: 'single_speech', duration: 180, side: 'affirmative' },
      { id: 3, name: '反方一辩·开篇陈词', type: 'single_speech', duration: 180, side: 'negative' }
    ],
    logos: { affirmative: '', negative: '' },
    judges: [],
    showJudges: true,
    schedule: []
  };
}

function loadThemePresets() {
  return require(path.join(projectRoot, 'js', 'main', 'theme-presets')).THEME_PRESETS;
}

function loadAppVersion() {
  return require(path.join(projectRoot, 'package.json')).version || '0.0.0';
}

function loadChangelogExcerpt() {
  const changelogPath = path.join(projectRoot, 'CHANGELOG.md');
  if (!fs.existsSync(changelogPath)) return '';
  const text = fs.readFileSync(changelogPath, 'utf8').trim();
  const secondSection = text.indexOf('\n## ', 1);
  const excerpt = secondSection > 0 ? text.slice(0, secondSection) : text;
  return excerpt.slice(0, 1600);
}

function loadBuiltInTemplates() {
  const { getBuiltInTemplates } = require(path.join(projectRoot, 'js', 'main', 'built-in-templates.js'));
  const { defaultConfig } = require(path.join(projectRoot, 'js', 'main', 'export.js'));
  return getBuiltInTemplates(defaultConfig);
}

function loadDefaultConfig() {
  const { defaultConfig } = require(path.join(projectRoot, 'js', 'main', 'export.js'));
  return defaultConfig();
}

function buildEditorPolyfill(config, themePresets, appVersion, changelog, builtInTemplates) {
  return `
  <!-- GitHub Pages: 网页版编辑器补丁 -->
  <script>
    (function () {
      window.__WEB_MODE__ = true;
      window.__WEB_CONFIG__ = ${JSON.stringify(config)};
      window.__THEME_PRESETS__ = ${JSON.stringify(themePresets)};
      window.__APP_VERSION__ = ${JSON.stringify(appVersion)};
      window.__WEB_CHANGELOG__ = ${JSON.stringify(changelog)};
      window.__WEB_BUILTIN_TEMPLATES__ = ${JSON.stringify(builtInTemplates)};

      var CONFIG_KEY = 'debatetimer.web.config.v1';
      var TEMPLATE_KEY = 'debatetimer.web.templates.v1';
      var RELEASES_PAGE = 'https://github.com/ASE-128/DebateTimer/releases/latest';
      var API_LATEST = 'https://api.github.com/repos/ASE-128/DebateTimer/releases/latest';

      function clone(value) { return JSON.parse(JSON.stringify(value)); }
      function readSavedConfig() {
        try {
          var raw = window.localStorage.getItem(CONFIG_KEY);
          return raw ? JSON.parse(raw) : null;
        } catch (e) { return null; }
      }
      function currentConfig() { return readSavedConfig() || clone(window.__WEB_CONFIG__); }
      function writeConfig(config) {
        try { window.localStorage.setItem(CONFIG_KEY, JSON.stringify(config)); } catch (e) {}
        return config;
      }
      function readTemplates() {
        try { return JSON.parse(window.localStorage.getItem(TEMPLATE_KEY) || '[]'); } catch (e) { return []; }
      }
      function writeTemplates(list) {
        try { window.localStorage.setItem(TEMPLATE_KEY, JSON.stringify(list)); } catch (e) {}
      }
      function getAllTemplates() {
        var builtins = window.__WEB_BUILTIN_TEMPLATES__ || [];
        var custom = readTemplates();
        var customMap = {};
        custom.forEach(function (item) { customMap[item.id] = item; });

        var result = builtins.map(function (template) {
          var override = customMap[template.id];
          if (override) delete customMap[template.id];
          return {
            id: template.id,
            name: override ? override.name : template.name,
            description: override ? override.description : template.description,
            builtin: true,
            overridden: !!override,
            config: override ? override.config : template.config
          };
        });

        Object.keys(customMap).forEach(function (id) {
          var item = customMap[id];
          result.push({
            id: item.id,
            name: item.name,
            description: item.description || '',
            builtin: false,
            overridden: false,
            config: item.config
          });
        });
        return result;
      }
      function slugify(name) {
        return String(name || '').toLowerCase().trim().replace(/[^a-z0-9\\u4e00-\\u9fa5]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80) || 'template';
      }
      function resolvePreset(preset, colorMode) {
        var presets = window.__THEME_PRESETS__ || {};
        var p = presets[preset] || presets.classic;
        var mode = colorMode === 'light' ? 'light' : 'dark';
        var variant = p[mode] || p.dark;
        return {
          colors: Object.assign({}, variant.colors),
          backgroundColor: variant.backgroundColor,
          statusBar: Object.assign({}, variant.statusBar),
          tokens: Object.assign({}, p.tokens)
        };
      }
      function downloadBlob(name, text, type) {
        var blob = new Blob([text], { type: type || 'application/json' });
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url;
        a.download = name;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(function () { URL.revokeObjectURL(url); }, 6000);
      }
      function downloadUrl(url, name) {
        var a = document.createElement('a');
        a.href = url;
        if (name) a.download = name;
        a.rel = 'noopener';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }

      var progressCallback = null;
      function emitProgress(percent, message) {
        if (typeof progressCallback === 'function') progressCallback({ percent: percent, message: message });
      }

      var releaseState = { loaded: false, asset: null, pageUrl: RELEASES_PAGE, tag: '' };
      function loadLatestRelease() {
        return fetch(API_LATEST, { headers: { Accept: 'application/vnd.github+json' } })
          .then(function (response) {
            if (!response.ok) throw new Error('HTTP ' + response.status);
            return response.json();
          })
          .then(function (release) {
            var assets = release.assets || [];
            var setup = assets.find(function (asset) { return /setup.*\\.exe$/i.test(asset.name); }) ||
              assets.find(function (asset) { return /\\.exe$/i.test(asset.name); }) || null;
            releaseState.loaded = true;
            releaseState.asset = setup;
            releaseState.pageUrl = release.html_url || RELEASES_PAGE;
            releaseState.tag = release.tag_name || '';
            return releaseState;
          })
          .catch(function () {
            releaseState.loaded = true;
            return releaseState;
          });
      }
      var releasePromise = loadLatestRelease();

      window.electronAPI = {
        loadConfig: function () { return Promise.resolve(clone(currentConfig())); },
        resolvePreset: function (preset, colorMode) { return Promise.resolve(resolvePreset(preset, colorMode)); },
        getAppVersion: function () { return Promise.resolve(window.__APP_VERSION__ || '0.0.0'); },
        getTimerBaseSize: function () { return Promise.resolve({ width: 1600, height: 900 }); },
        getLatestChangelog: function () { return Promise.resolve(window.__WEB_CHANGELOG__ || ''); },
        consumeMigrationInfo: function () { return Promise.resolve(null); },
        saveConfig: function (config) { return Promise.resolve(writeConfig(clone(config))); },
        resetConfig: function () { return Promise.resolve(clone(window.__WEB_CONFIG__)); },
        openTimer: function () { window.location.href = 'timer.html'; return Promise.resolve({ ok: true }); },
        openEditor: function () { window.location.href = 'editor.html'; return Promise.resolve({ ok: true }); },
        toggleFullscreen: function () {
          if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch(function () {});
          } else {
            document.exitFullscreen().catch(function () {});
          }
          return Promise.resolve();
        },
        exportConfig: function (config) {
          downloadBlob('debate-config.json', JSON.stringify(config, null, 2), 'application/json');
          return Promise.resolve({ ok: true, path: 'debate-config.json' });
        },
        importConfig: function () {
          return new Promise(function (resolve) {
            var input = document.createElement('input');
            input.type = 'file';
            input.accept = '.json,application/json';
            input.addEventListener('change', function () {
              var file = input.files && input.files[0];
              if (!file) {
                resolve({ ok: false, config: null, error: '未选择文件' });
                return;
              }
              var reader = new FileReader();
              reader.onload = function () {
                try {
                  resolve({ ok: true, config: JSON.parse(reader.result), warnings: [], path: file.name });
                } catch (error) {
                  resolve({ ok: false, config: null, error: 'JSON 解析失败：' + error.message });
                }
              };
              reader.onerror = function () { resolve({ ok: false, config: null, error: '读取文件失败' }); };
              reader.readAsText(file);
            });
            input.click();
          });
        },
        exportStandalone: function (config) {
          return new Promise(function (resolve) {
            var confirmed = window.confirm(
              '网页版无法在本机生成安装程序。\\n\\n确定后将下载：\\n1. 最新发布版 Setup 安装程序（GitHub Releases）\\n2. 当前 config.json\\n\\n浏览器若询问“允许多个下载”，请选择允许。'
            );
            if (!confirmed) {
              resolve({ ok: false, path: null, error: '用户取消' });
              return;
            }

            emitProgress(10, '正在下载 config.json...');
            downloadBlob('config.json', JSON.stringify(config, null, 2), 'application/json');

            emitProgress(40, '正在获取最新发布版本...');
            releasePromise.then(function (state) {
              if (state.asset) {
                emitProgress(75, '正在下载 ' + state.asset.name + '...');
                downloadUrl(state.asset.browser_download_url, state.asset.name);
                emitProgress(100, '已开始下载安装包与 config.json');
                setTimeout(function () {
                  resolve({
                    ok: true,
                    path: state.asset.name,
                    message: '已开始下载最新发布安装包（' + (state.tag || state.asset.name) + '）与当前 config.json。网页版不生成独立安装程序，可在下载完成后双击安装。'
                  });
                }, 600);
              } else {
                emitProgress(75, '未找到安装包，正在打开下载页面...');
                window.open(state.pageUrl || RELEASES_PAGE, '_blank', 'noopener');
                emitProgress(100, '已打开最新版本下载页面');
                setTimeout(function () {
                  resolve({
                    ok: true,
                    path: state.pageUrl || RELEASES_PAGE,
                    message: '当前配置 config.json 已开始下载；未能在页面内直接获取安装包，已为你打开最新版本下载页。'
                  });
                }, 600);
              }
            });
          });
        },
        getTemplates: function () { return Promise.resolve(clone(getAllTemplates())); },
        applyTemplate: function (id) {
          var template = getAllTemplates().find(function (item) { return item.id === id; });
          if (!template) return Promise.resolve({ ok: false, config: null, error: '模板不存在' });
          return Promise.resolve({ ok: true, config: clone(template.config) });
        },
        saveTemplate: function (id, name, description, config) {
          var list = readTemplates();
          var existing = list.find(function (item) { return item.id === id; });
          if (existing) {
            existing.name = name;
            existing.description = description || '';
            existing.config = clone(config);
          } else {
            list.push({ id: id, name: name, description: description || '', config: clone(config) });
          }
          writeTemplates(list);
          return Promise.resolve({ ok: true, id: id, overwritten: !!existing });
        },
        deleteTemplate: function (id) {
          var builtinIds = (window.__WEB_BUILTIN_TEMPLATES__ || []).map(function (item) { return item.id; });
          var list = readTemplates();
          var existed = list.some(function (item) { return item.id === id; });
          writeTemplates(list.filter(function (item) { return item.id !== id; }));

          if (existed) {
            return Promise.resolve({ ok: true, restored: builtinIds.indexOf(id) >= 0 });
          }
          if (builtinIds.indexOf(id) >= 0) {
            return Promise.resolve({ ok: true, restored: false });
          }
          return Promise.resolve({ ok: false, error: '模板不存在' });
        },
        saveCustomTemplate: function (name, config) {
          var id = slugify(name);
          return window.electronAPI.saveTemplate(id, name, '', config);
        },
        deleteCustomTemplate: function (name) {
          return window.electronAPI.deleteTemplate(slugify(name));
        },
        log: function (level, message) { console.log('[web:' + level + '] ' + message); },
        onConfigUpdated: function () { return function () {}; },
        onExportProgress: function (callback) {
          progressCallback = callback;
          return function () { progressCallback = null; };
        },
        onUpdateAvailable: function () { return function () {}; },
        onUpdateDownloaded: function () { return function () {}; },
        onUpdateError: function () { return function () {}; },
        startDownloadUpdate: function () { return Promise.resolve(); },
        quitAndInstall: function () { return Promise.resolve(); },
        skipUpdate: function () { return Promise.resolve(); }
      };
    })();
  </script>`;
}

function loadConfig(configPath) {
  if (configPath) {
    const absPath = path.resolve(projectRoot, configPath);
    console.log(`加载配置: ${absPath}`);
    return JSON.parse(fs.readFileSync(absPath, 'utf8'));
  }
  return defaultConfig();
}

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function copyFile(src, dest) {
  ensureDir(path.dirname(dest));
  fs.copyFileSync(src, dest);
  console.log(`  复制: ${path.relative(projectRoot, dest)}`);
}

function build() {
  // 解析命令行参数 --config <path>
  const args = process.argv.slice(2);
  let configPath = null;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--config' && i + 1 < args.length) {
      configPath = args[i + 1];
      i++;
    }
  }

  const config = loadConfig(configPath);
  const themePresets = loadThemePresets();

  console.log('开始构建 GitHub Pages 站点...');
  console.log(`  配置: ${configPath || '默认配置'}`);
  console.log(`  输出目录: ${path.relative(projectRoot, docsDir)}`);

  // 清空 docs/ 但保留 .git 等隐藏文件
  if (fs.existsSync(docsDir)) {
    const entries = fs.readdirSync(docsDir);
    for (const entry of entries) {
      if (entry.startsWith('.')) continue; // 保留隐藏文件（如 .nojekyll）
      const fullPath = path.join(docsDir, entry);
      fs.rmSync(fullPath, { recursive: true, force: true });
    }
  }

  // 创建子目录
  ensureDir(path.join(docsDir, 'styles'));
  ensureDir(path.join(docsDir, 'js'));

  // 确保 GitHub Pages 不启用 Jekyll 处理（整目录重建时该文件不会被清理逻辑补建）
  const nojekyllPath = path.join(docsDir, '.nojekyll');
  if (!fs.existsSync(nojekyllPath)) {
    fs.writeFileSync(nojekyllPath, '', 'utf8');
  }

  // --- 构建独立计时器页（timer.html）---
  const timerHtml = fs.readFileSync(path.join(projectRoot, 'timer.html'), 'utf8');
  let bodyContent = extractBody(timerHtml);

  // 移除独立设置弹窗（standaloneSetup 会在后面重新生成）
  bodyContent = bodyContent.replace(/<div[^>]*id=["']standaloneSetup["'][^>]*>[\s\S]*?<\/div>\s*<\/div>/i, '').trim();

  // 赛前设置弹窗 HTML
  const setupHtml = [
    `<div id="standaloneSetup" class="standalone-setup">`,
    `  <div class="box">`,
    `    <h2>${escapeHtml('赛前设置')}</h2>`,
    `    <div id="ssScheduleSection" class="ss-schedule-section" style="display:none;">`,
    `      <h3>${escapeHtml('选择预设赛程')}</h3>`,
    `      <div id="ssScheduleList" class="ss-schedule-list"></div>`,
    `      <p class="ss-schedule-or">${escapeHtml('或手动输入下方信息')}</p>`,
    `    </div>`,
    `    <label>${escapeHtml('正方队伍')}<input id="ssAffirmativeTeam" type="text" value="${escapeHtml(config.teams?.affirmative || '')}"></label>`,
    `    <label>${escapeHtml('正方辩题')}<input id="ssAffirmativeTopic" type="text" value="${escapeHtml(config.topics?.affirmative || '')}"></label>`,
    `    <label>${escapeHtml('反方队伍')}<input id="ssNegativeTeam" type="text" value="${escapeHtml(config.teams?.negative || '')}"></label>`,
    `    <label>${escapeHtml('反方辩题')}<input id="ssNegativeTopic" type="text" value="${escapeHtml(config.topics?.negative || '')}"></label>`,
    `    <div class="ss-judge-group">`,
    `      <label>${escapeHtml('评委一')}<input id="ssJudge1" type="text"></label>`,
    `      <label>${escapeHtml('评委二')}<input id="ssJudge2" type="text"></label>`,
    `      <label>${escapeHtml('评委三')}<input id="ssJudge3" type="text"></label>`,
    `    </div>`,
    `    <button id="ssStartBtn">${escapeHtml('开始计时')}</button>`,
    `  </div>`,
    `</div>`
  ].join('\n    ');

  // Web 兼容补丁：在 electronAPI 注入之前定义 polyfill
  const webPolyfill = `
  <!-- GitHub Pages: Web 兼容补丁 -->
  <script>
    (function () {
      var WEB_CONFIG_KEY = 'debatetimer.web.config.v1';
      var params = new URLSearchParams(window.location.search);
      var embed = params.get('embed') === '1';
      var cfg = ${JSON.stringify(config)};

      if (!embed) {
        try {
          var saved = window.localStorage.getItem(WEB_CONFIG_KEY);
          if (saved) cfg = JSON.parse(saved);
        } catch (e) {}
      }
      cfg = JSON.parse(JSON.stringify(cfg));
      cfg.theme = cfg.theme || {};
      if (params.get('preset')) cfg.theme.preset = params.get('preset');
      if (params.get('colorMode')) cfg.theme.colorMode = params.get('colorMode');

      window.__STANDALONE_CONFIG__ = cfg;
      window.__THEME_PRESETS__ = ${JSON.stringify(themePresets)};
      window.__EMBED_MODE__ = embed;
      window.__EMBED_SEGMENT__ = params.get('seg') || '';
      window.__EMBED_TIME__ = params.get('time') || '';
      window.__EMBED_AUTOSTART__ = params.get('autostart') === '1';

      if (!window.electronAPI) {
        window.electronAPI = {
          loadConfig: function() { return Promise.resolve(window.__STANDALONE_CONFIG__); },
          toggleFullscreen: function() {
            if (!document.fullscreenElement) {
              document.documentElement.requestFullscreen().catch(function(){});
            } else {
              document.exitFullscreen().catch(function(){});
            }
          },
          openEditor: function() { window.location.href = 'editor.html'; },
          openTimer: function() { window.location.href = 'timer.html'; },
          log: function() {},
          onConfigUpdated: function() { return function() {}; }
        };
      }
    })();
  </script>`;

  const embedStyle = `
  <style>
    body.embed-mode .control-panel,
    body.embed-mode .design-by { display: none !important; }
    body.embed-mode .watermark { padding-bottom: 24px; }
  </style>`;

  const standaloneHtml = [
    '<!doctype html>',
    '<html lang="zh-CN">',
    '<head>',
    '  <meta charset="UTF-8">',
    '  <meta name="viewport" content="width=device-width, initial-scale=1.0">',
    '  <meta name="author" content="DebateTimer">',
    '  <title>辩论赛计时器</title>',
    '  <link rel="icon" type="image/svg+xml" href="favicon.svg">',
    '  <link rel="stylesheet" href="styles/variables.css">',
    '  <link rel="stylesheet" href="styles/timer.css">',
    embedStyle,
    '</head>',
    '<body>',
    '  ' + bodyContent,
    '  ' + setupHtml,
    webPolyfill,
    '  <script src="js/toast.js"></script>',
    '  <script src="js/audio.js"></script>',
    '  <script src="js/timer-core.js"></script>',
    '  <script src="js/timer-app.js"></script>',
    '</body>',
    '</html>'
  ].join('\n');

  // --- 构建 index.html（门户页资源来自 site/） ---
  const siteDir = path.join(projectRoot, 'site');
  copyFile(path.join(siteDir, 'portal.html'), path.join(docsDir, 'index.html'));
  copyFile(path.join(siteDir, 'portal.css'), path.join(docsDir, 'styles', 'portal.css'));
  copyFile(path.join(siteDir, 'portal.js'), path.join(docsDir, 'js', 'portal.js'));
  console.log('  生成: docs/index.html（门户页）');

  // --- 构建 timer.html（独立计时器页面） ---
  fs.writeFileSync(path.join(docsDir, 'timer.html'), standaloneHtml, 'utf8');
  console.log('  生成: docs/timer.html');

  // --- 构建 editor.html（网页版编辑器） ---
  const editorSource = fs.readFileSync(path.join(projectRoot, 'editor.html'), 'utf8');
  // 网页版编辑器默认使用应用内置的默认配置（布局、颜色、字体等均为内置默认值）
  const editorPolyfill = buildEditorPolyfill(
    loadDefaultConfig(),
    themePresets,
    loadAppVersion(),
    loadChangelogExcerpt(),
    loadBuiltInTemplates()
  );
  const editorHtml = editorSource.replace(
    '<script src="js/toast.js"></script>',
    `${editorPolyfill}\n    <script src="js/toast.js"></script>`
  );
  fs.writeFileSync(path.join(docsDir, 'editor.html'), editorHtml, 'utf8');
  console.log('  生成: docs/editor.html');

  // --- 复制样式 ---
  copyFile(path.join(projectRoot, 'icon.svg'), path.join(docsDir, 'favicon.svg'));
  copyFile(path.join(projectRoot, 'styles', 'variables.css'), path.join(docsDir, 'styles', 'variables.css'));
  copyFile(path.join(projectRoot, 'styles', 'timer.css'), path.join(docsDir, 'styles', 'timer.css'));
  copyFile(path.join(projectRoot, 'styles', 'editor.css'), path.join(docsDir, 'styles', 'editor.css'));

  // --- 复制 JS ---
  const jsFiles = ['toast.js', 'audio.js', 'timer-core.js', 'timer-app.js', 'editor-app.js'];
  for (const file of jsFiles) {
    copyFile(path.join(projectRoot, 'js', file), path.join(docsDir, 'js', file));
  }

  console.log('\n构建完成！');
  console.log(`部署方式：在 GitHub 仓库 Settings → Pages 中选择`);
  console.log(`  Source: Deploy from branch → main → /docs`);
  console.log(`然后访问 https://ASE-128.github.io/DebateTimer/`);
  console.log('');
  console.log('提示：如需嵌入自定义配置，编辑 config.json 后运行：');
  console.log(`  node scripts/build-gh-pages.js --config path/to/config.json`);
}

build();
