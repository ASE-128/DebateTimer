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

function loadThemePresets() {
  return require(path.join(projectRoot, 'js', 'main', 'theme-presets')).THEME_PRESETS;
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

  // --- 构建 index.html ---
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
    `    <button id="ssStartBtn">${escapeHtml('开始计时')}</button>`,
    `  </div>`,
    `</div>`
  ].join('\n    ');

  // Web 兼容补丁：在 electronAPI 注入之前定义 polyfill
  const webPolyfill = `
  <!-- GitHub Pages: Web 兼容补丁 -->
  <script>
    // 为独立模式提供 window.electronAPI polyfill（仅在纯浏览器环境使用）
    window.__STANDALONE_CONFIG__ = ${JSON.stringify(config)};
    window.__THEME_PRESETS__ = ${JSON.stringify(themePresets)};

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
        openEditor: function() { return Promise.resolve(); },
        log: function() {},
        onConfigUpdated: function() { return function() {}; }
      };
    }
  </script>`;

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

  fs.writeFileSync(path.join(docsDir, 'index.html'), standaloneHtml, 'utf8');
  console.log(`  生成: docs/index.html`);

  // --- 复制样式 ---
  copyFile(path.join(projectRoot, 'icon.svg'), path.join(docsDir, 'favicon.svg'));
  copyFile(path.join(projectRoot, 'styles', 'variables.css'), path.join(docsDir, 'styles', 'variables.css'));
  copyFile(path.join(projectRoot, 'styles', 'timer.css'), path.join(docsDir, 'styles', 'timer.css'));

  // --- 复制 JS ---
  const jsFiles = ['toast.js', 'audio.js', 'timer-core.js', 'timer-app.js'];
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
