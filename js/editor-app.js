function log(level, message) {
  if (window.electronAPI?.log) {
    window.electronAPI.log(level, message);
  }
}

const fonts = ['system-ui', 'SimSun', 'Microsoft YaHei', 'KaiTi', 'Segoe UI', 'Inter', 'Noto Sans SC'];

let currentConfig = null;
let editingElement = null;
let editingLayoutKey = null;
let isDraggingText = false;
let dragStartX = 0;
let dragStartY = 0;
let dragElementStartX = 0;
let dragElementStartY = 0;
let isBackgroundEditMode = false;
let isResizingStatusBar = false;
let statusBarStartHeight = 0;
let resizeStartY = 0;

// 预览区缩放与环节切换状态
let previewScale = 1;
let timerBaseSize = { width: 1600, height: 900 };
let currentPreviewSegmentIndex = 0;

// 高频 DOM 引用缓存，避免在 renderSegments / renderSegmentNav 等热路径中反复查询
const dom = {};

function cacheDom() {
  dom.editorPreviewWrapper = document.getElementById('editorPreviewWrapper');
  dom.timerPreview = document.getElementById('timerPreview');
  dom.previewSegmentName = document.getElementById('previewSegmentName');
  dom.previewTimerDisplay = document.getElementById('previewTimerDisplay');
  dom.previewSingleTimer = document.getElementById('previewSingleTimer');
  dom.previewDualTimer = document.getElementById('previewDualTimer');
  dom.previewSideLabel = document.getElementById('previewSideLabel');
  dom.previewAffirmativeTime = document.getElementById('previewAffirmativeTime');
  dom.previewNegativeTime = document.getElementById('previewNegativeTime');
  dom.previewTimerProgressBar = document.getElementById('previewTimerProgressBar');
  dom.previewEventName = document.getElementById('previewEventName');
  dom.previewAffirmativeTeamName = document.getElementById('previewAffirmativeTeamName');
  dom.previewNegativeTeamName = document.getElementById('previewNegativeTeamName');
  dom.previewAffirmativeTopic = document.getElementById('previewAffirmativeTopic');
  dom.previewNegativeTopic = document.getElementById('previewNegativeTopic');
  dom.previewWatermark = document.getElementById('previewWatermark');
  dom.previewTopBand = document.getElementById('previewTopBand');
  dom.previewSegmentSelect = document.getElementById('previewSegmentSelect');
  dom.segmentsRoot = document.getElementById('segments');
  dom.segmentNav = document.getElementById('segmentNav');
  dom.textEditToolbar = document.getElementById('textEditToolbar');
  dom.statusBarToolbar = document.getElementById('statusBarToolbar');
  dom.backgroundToolbar = document.getElementById('backgroundToolbar');
  dom.topBandResizeHandle = document.getElementById('topBandResizeHandle');
  dom.editBackgroundBtn = document.getElementById('editBackgroundBtn');
  dom.saveBtn = document.getElementById('saveBtn');
  dom.resetBtn = document.getElementById('resetBtn');
  dom.importConfigBtn = document.getElementById('importConfigBtn');
  dom.exportConfigBtn = document.getElementById('exportConfigBtn');
  dom.exportTimerBtn = document.getElementById('exportTimerBtn');
  dom.openTimerBtn = document.getElementById('openTimerBtn');
  dom.addNoneBtn = document.getElementById('addNoneBtn');
  dom.addSpeechBtn = document.getElementById('addSpeechBtn');
  dom.addQuestionBtn = document.getElementById('addQuestionBtn');
  dom.addNeutralBtn = document.getElementById('addNeutralBtn');
  dom.addDebateBtn = document.getElementById('addDebateBtn');
  dom.addFreeDebateBtn = document.getElementById('addFreeDebateBtn');
  dom.migrationNotification = document.getElementById('migrationNotification');
  dom.migrationBackupPath = document.getElementById('migrationBackupPath');
  dom.migrationCloseBtn = document.getElementById('migrationCloseBtn');
  dom.exportProgressOverlay = document.getElementById('exportProgressOverlay');
  dom.exportProgressBar = document.getElementById('exportProgressBar');
  dom.exportProgressText = document.getElementById('exportProgressText');
  dom.aboutOverlay = document.getElementById('aboutOverlay');
  dom.aboutVersion = document.getElementById('aboutVersion');
  dom.aboutCloseBtn = document.getElementById('aboutCloseBtn');
  dom.aboutBtn = document.getElementById('aboutBtn');
  dom.updateNotification = document.getElementById('updateNotification');
  dom.updateVersion = document.getElementById('updateVersion');
  dom.updateChangelog = document.getElementById('updateChangelog');
  dom.updateDownloadBtn = document.getElementById('updateDownloadBtn');
  dom.updateRestartBtn = document.getElementById('updateRestartBtn');
  dom.updateLaterBtn = document.getElementById('updateLaterBtn');
  dom.updateSkipBtn = document.getElementById('updateSkipBtn');
  dom.updateErrorText = document.getElementById('updateErrorText');
  dom.toolbarTextContent = document.getElementById('toolbarTextContent');
  dom.toolbarFontFamily = document.getElementById('toolbarFontFamily');
  dom.toolbarFontSize = document.getElementById('toolbarFontSize');
  dom.toolbarTextColor = document.getElementById('toolbarTextColor');
  dom.toolbarStatusBarColor = document.getElementById('toolbarStatusBarColor');
  dom.toolbarStatusBarOpacity = document.getElementById('toolbarStatusBarOpacity');
  dom.toolbarStatusBarColor2 = document.getElementById('toolbarStatusBarColor2');
  dom.toolbarStatusBarGradient = document.getElementById('toolbarStatusBarGradient');
  dom.toolbarBgType = document.getElementById('toolbarBgType');
  dom.toolbarBgColor = document.getElementById('toolbarBgColor');
  dom.toolbarBgGradientStart = document.getElementById('toolbarBgGradientStart');
  dom.toolbarBgGradientEnd = document.getElementById('toolbarBgGradientEnd');
  dom.toolbarBgGradientAngle = document.getElementById('toolbarBgGradientAngle');
  dom.toolbarBgImageOpacity = document.getElementById('toolbarBgImageOpacity');
  dom.toolbarBgImageScaleX = document.getElementById('toolbarBgImageScaleX');
  dom.toolbarBgImageScaleY = document.getElementById('toolbarBgImageScaleY');
  dom.toolbarBgImageOffsetX = document.getElementById('toolbarBgImageOffsetX');
  dom.toolbarBgImageOffsetY = document.getElementById('toolbarBgImageOffsetY');
  dom.toolbarBgImage = document.getElementById('toolbarBgImage');
  dom.bgColorPanel = document.getElementById('bgColorPanel');
  dom.bgGradientPanel = document.getElementById('bgGradientPanel');
  dom.bgImagePanel = document.getElementById('bgImagePanel');
  dom.textToolbarClose = document.getElementById('textToolbarClose');
  dom.statusBarToolbarClose = document.getElementById('statusBarToolbarClose');
  dom.bgToolbarClose = document.getElementById('bgToolbarClose');
  dom.previewCustomFontFace = document.getElementById('preview-custom-font-face');
}

function renderFonts() {
  const selects = document.querySelectorAll('#toolbarFontFamily, #fontFamily');
  selects.forEach((select) => {
    if (!select) return;
    const currentVal = select.value;
    select.innerHTML = '';
    fonts.forEach((font) => {
      const option = document.createElement('option');
      option.value = font;
      option.textContent = font;
      select.appendChild(option);
    });
    if (currentVal) select.value = currentVal;
  });
}

function defaultLayout() {
  return {
    affirmativeTeamName: { x: 0, y: 0, fontSize: 0, fontFamily: '', color: '' },
    negativeTeamName: { x: 0, y: 0, fontSize: 0, fontFamily: '', color: '' },
    affirmativeTopic: { x: 0, y: 0, fontSize: 0, fontFamily: '', color: '' },
    negativeTopic: { x: 0, y: 0, fontSize: 0, fontFamily: '', color: '' },
    eventName: { x: 0, y: 0, fontSize: 0, fontFamily: '', color: '' },
    segmentName: { x: 0, y: 0, fontSize: 0, fontFamily: '', color: '' },
    sideLabel: { x: 0, y: 0, fontSize: 0, fontFamily: '', color: '' },
    watermark: { x: 0, y: 0, fontSize: 0, fontFamily: '', color: '', text: '辩论计时器' },
    designBy: { x: 0, y: 0, fontSize: 0, fontFamily: '', color: '' }
  };
}

function defaultStatusBar() {
  return {
    height: 80,
    background: 'linear-gradient(90deg, rgba(231, 76, 60, 0.25) 0%, rgba(52, 152, 219, 0.25) 100%)',
    color: ''
  };
}

function defaultBackgroundImageSettings() {
  return {
    opacity: 1,
    scaleX: 100,
    scaleY: 100,
    offsetX: 0,
    offsetY: 0
  };
}

function defaultBackgroundGradient() {
  return { start: '#1a1a1a', end: '#0b0e14', angle: 135 };
}

function getSymmetricKey(key) {
  const map = {
    affirmativeTeamName: 'negativeTeamName',
    negativeTeamName: 'affirmativeTeamName',
    affirmativeTopic: 'negativeTopic',
    negativeTopic: 'affirmativeTopic'
  };
  return map[key] || null;
}

function applyLayoutToPreview(layout = {}) {
  const preview = dom.timerPreview;
  if (!preview) return;
  const elements = preview.querySelectorAll('[data-layout-key]');
  elements.forEach((el) => {
    const key = el.getAttribute('data-layout-key');
    const settings = layout[key] || {};
    if (settings.x !== undefined && settings.x !== 0) {
      el.style.transform = `translate(${settings.x}px, ${settings.y || 0}px)`;
    } else if (settings.y !== undefined && settings.y !== 0) {
      el.style.transform = `translate(0px, ${settings.y}px)`;
    } else {
      el.style.transform = '';
    }
    if (settings.fontSize && settings.fontSize > 0) {
      el.style.fontSize = `${settings.fontSize}px`;
    } else {
      el.style.fontSize = '';
    }
    if (settings.fontFamily) {
      el.style.fontFamily = settings.fontFamily;
    } else {
      el.style.fontFamily = '';
    }
    if (settings.color) {
      el.style.color = settings.color;
    } else {
      el.style.color = '';
    }
  });
}

function applyStatusBarToPreview(statusBar = {}) {
  const topBand = dom.previewTopBand;
  if (!topBand) return;
  if (statusBar.height && statusBar.height > 0) {
    topBand.style.height = `${statusBar.height}px`;
  }
  if (statusBar.background) {
    topBand.style.background = statusBar.background;
  }
  if (statusBar.color) {
    topBand.style.color = statusBar.color;
  }
}

function applyBackgroundToPreview(theme = {}) {
  const preview = dom.timerPreview;
  if (!preview) return;
  const bgLayer = preview.querySelector('.bg-layer');
  const bgType = theme.backgroundType || 'color';
  const bgImageSettings = theme.backgroundImageSettings || defaultBackgroundImageSettings();

  // 将背景设置在 timerPreview 上（最外层 .timer-shell），并确保子元素透明
  preview.style.background = 'transparent';
  preview.style.opacity = 1;

  if (bgType === 'image' && theme.backgroundImage && bgLayer) {
    bgLayer.style.backgroundImage = `url(${theme.backgroundImage})`;
    bgLayer.style.backgroundSize = `${bgImageSettings.scaleX || 100}% ${bgImageSettings.scaleY || 100}%`;
    bgLayer.style.backgroundPosition = `calc(50% + ${bgImageSettings.offsetX || 0}%) calc(50% + ${bgImageSettings.offsetY || 0}%)`;
    bgLayer.style.backgroundRepeat = 'no-repeat';
    bgLayer.style.backgroundColor = theme.backgroundColor || '#1a1a1a';
    bgLayer.style.opacity = bgImageSettings.opacity !== undefined ? bgImageSettings.opacity : 1;
  } else if (bgType === 'gradient' && theme.backgroundGradient && bgLayer) {
    const grad = theme.backgroundGradient;
    bgLayer.style.backgroundImage = `linear-gradient(${grad.angle}deg, ${grad.start}, ${grad.end})`;
    bgLayer.style.backgroundSize = '';
    bgLayer.style.backgroundPosition = '';
    bgLayer.style.backgroundRepeat = '';
    bgLayer.style.backgroundColor = '';
    bgLayer.style.opacity = 1;
  } else if (bgLayer) {
    bgLayer.style.backgroundImage = '';
    bgLayer.style.background = theme.backgroundColor || '#1a1a1a';
    bgLayer.style.backgroundSize = '';
    bgLayer.style.backgroundPosition = '';
    bgLayer.style.backgroundRepeat = '';
    bgLayer.style.opacity = 1;
  }
}

function applyThemeToPreview(theme = {}) {
  const preview = dom.timerPreview;
  if (!preview) return;
  const colors = theme.colors || {};
  const root = preview;

  root.style.setProperty('--accent-affirmative', colors.affirmative || '#e74c3c');
  root.style.setProperty('--accent-negative', colors.negative || '#3498db');
  root.style.setProperty('--accent-neutral', colors.neutral || '#ffffff');
  root.style.setProperty('--accent-title', colors.title || '#5dade2');
  root.style.setProperty('--text-color', colors.text || '#f0f2f5');
  root.style.setProperty('--bg-color', theme.backgroundColor || '#0b0e14');
  root.style.setProperty('--font-family', theme.fontFamily || 'system-ui');
  root.style.setProperty('--font-scale', theme.fontSizeScale || 1);

  applyBackgroundToPreview(theme);
  applyStatusBarToPreview(theme.statusBar || defaultStatusBar());
  applyLayoutToPreview(currentConfig?.layout || defaultLayout());
  applyCustomFontToPreview(theme);
}

function applyCustomFontToPreview(theme = {}) {
  const preview = dom.timerPreview;
  if (!preview) return;
  const customFontUrl = theme?.customFont;
  const customFontName = theme?.customFontName || 'CustomFont';
  const baseFont = theme?.fontFamily || 'system-ui';

  let style = dom.previewCustomFontFace;
  if (!style) {
    style = document.createElement('style');
    style.id = 'preview-custom-font-face';
    document.head.appendChild(style);
    dom.previewCustomFontFace = style;
  }

  if (customFontUrl) {
    style.textContent = `@font-face { font-family: '${customFontName}'; src: url('${customFontUrl}'); }`;
    preview.style.setProperty('--text-font-family', `'${customFontName}', ${baseFont}`);
  } else {
    style.textContent = '';
    preview.style.setProperty('--text-font-family', baseFont);
  }
}

function formatDuration(seconds) {
  const total = Math.max(0, Math.floor(Number(seconds) || 0));
  const m = Math.floor(total / 60).toString().padStart(2, '0');
  const s = (total % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

function initPreviewScale() {
  const preview = dom.timerPreview;
  const wrapper = dom.editorPreviewWrapper;
  if (!preview || !wrapper) return;

  window.electronAPI?.getTimerBaseSize?.().then((size) => {
    if (size?.width && size?.height) {
      timerBaseSize = size;
      preview.style.width = `${timerBaseSize.width}px`;
      preview.style.height = `${timerBaseSize.height}px`;
      updatePreviewScale();
    }
  }).catch((err) => {
    log('warn', `获取计时基准尺寸失败: ${err?.message || err}`);
  });

  preview.style.width = `${timerBaseSize.width}px`;
  preview.style.height = `${timerBaseSize.height}px`;
  preview.style.minHeight = 'auto';
  updatePreviewScale();

  if (typeof ResizeObserver !== 'undefined') {
    new ResizeObserver(() => updatePreviewScale()).observe(wrapper);
  } else {
    window.addEventListener('resize', updatePreviewScale);
  }
}

function updatePreviewScale() {
  const wrapper = dom.editorPreviewWrapper;
  const preview = dom.timerPreview;
  if (!wrapper || !preview) return;
  const rect = wrapper.getBoundingClientRect();
  const scale = Math.min(
    rect.width / timerBaseSize.width,
    rect.height / timerBaseSize.height,
    1
  );
  previewScale = scale;
  preview.style.setProperty('--preview-scale', scale);
  preview.style.setProperty('--preview-base-width', `${timerBaseSize.width}px`);
  preview.style.setProperty('--preview-base-height', `${timerBaseSize.height}px`);
  preview.style.setProperty('--preview-visual-width', `${rect.width}px`);
  preview.style.setProperty('--preview-visual-height', `${rect.height}px`);
  preview.classList.toggle('preview-tablet', rect.width <= 1000);
  preview.classList.toggle('preview-mobile', rect.width <= 768);
}

function updatePreviewSegmentSelect() {
  const select = dom.previewSegmentSelect;
  if (!select) return;
  const segments = currentConfig?.segments || [];
  select.innerHTML = '';
  segments.forEach((segment, index) => {
    const option = document.createElement('option');
    option.value = index;
    option.textContent = segment.name || `环节 ${index + 1}`;
    select.appendChild(option);
  });
  if (currentPreviewSegmentIndex >= segments.length) {
    currentPreviewSegmentIndex = Math.max(0, segments.length - 1);
  }
  select.value = currentPreviewSegmentIndex;
  updatePreviewForSegment(currentPreviewSegmentIndex);
}

function isDualSegmentType(type) {
  return type === 'dual_debate';
}

function isNoTimerSegmentType(type) {
  return type === 'none';
}

function getSegmentActiveSide(segment) {
  if (!segment) return 'affirmative';
  if (segment.type === 'neutral_timer') return 'neutral';
  if (segment.side) return segment.side;
  return 'affirmative';
}

function updatePreviewForSegment(index) {
  const segments = currentConfig?.segments || [];
  const segment = segments[index];
  if (!segment) return;
  currentPreviewSegmentIndex = index;

  const previewSegmentName = dom.previewSegmentName;
  const timerDisplay = dom.previewTimerDisplay;
  const singleTimer = dom.previewSingleTimer;
  const dualTimer = dom.previewDualTimer;
  const sideLabel = dom.previewSideLabel;
  const affirmativeTime = dom.previewAffirmativeTime;
  const negativeTime = dom.previewNegativeTime;
  const progressBar = dom.previewTimerProgressBar;

  const isNoTimer = isNoTimerSegmentType(segment.type);
  const isDual = isDualSegmentType(segment.type);
  const activeSide = getSegmentActiveSide(segment);

  if (previewSegmentName) {
    previewSegmentName.textContent = segment.name || '未命名环节';
    previewSegmentName.classList.toggle('segment-name-large', isNoTimer);
    if (isNoTimer) {
      adjustPreviewSegmentNameFontSize();
    } else {
      previewSegmentName.style.fontSize = '';
    }
  }

  if (timerDisplay) {
    timerDisplay.style.display = isNoTimer ? 'none' : '';
  }

  if (singleTimer) {
    singleTimer.style.display = isDual ? 'none' : '';
    singleTimer.textContent = formatDuration(segment.duration);
    singleTimer.classList.remove('affirmative', 'negative', 'neutral');
    if (!isDual) {
      singleTimer.classList.add(activeSide);
    }
  }

  if (dualTimer) {
    dualTimer.style.display = isDual ? 'flex' : 'none';
  }

  if (affirmativeTime) affirmativeTime.textContent = formatDuration(segment.duration);
  if (negativeTime) negativeTime.textContent = formatDuration(segment.duration);

  if (sideLabel) {
    sideLabel.classList.remove('affirmative', 'negative', 'neutral');
    sideLabel.style.display = isNoTimer ? 'none' : '';
    if (!isNoTimer) {
      sideLabel.classList.add(activeSide);
      if (activeSide === 'neutral') {
        sideLabel.textContent = '中立计时中';
      } else if (activeSide === 'affirmative') {
        sideLabel.textContent = '正方发言中';
      } else {
        sideLabel.textContent = '反方发言中';
      }
    }
  }

  if (progressBar) {
    progressBar.style.width = isNoTimer ? '0%' : '60%';
  }

  const select = dom.previewSegmentSelect;
  if (select) select.value = currentPreviewSegmentIndex;
}

function adjustPreviewSegmentNameFontSize() {
  const el = dom.previewSegmentName;
  if (!el || !el.classList.contains('segment-name-large')) {
    if (el) el.style.fontSize = '';
    return;
  }
  const baseWidth = timerBaseSize.width;
  const maxFontSize = Math.min(Math.max(baseWidth * 0.14, 48), 180);
  el.style.fontSize = `${maxFontSize}px`;
}

function fillEditorUI(config) {
  if (!config) return;
  currentConfig = config;

  dom.previewEventName.textContent = config.eventName || '赛事名称';
  dom.previewAffirmativeTeamName.textContent = config.teams?.affirmative || '正方队';
  dom.previewNegativeTeamName.textContent = config.teams?.negative || '反方队';
  dom.previewAffirmativeTopic.textContent = config.topics?.affirmative || '正方辩题';
  dom.previewNegativeTopic.textContent = config.topics?.negative || '反方辩题';
  dom.previewWatermark.textContent = config.layout?.watermark?.text || '辩论计时器';

  applyThemeToPreview(config.theme || {});
  applyLayoutToPreview(config.layout || defaultLayout());

  const theme = config.theme || {};
  const bgType = theme.backgroundType || 'color';
  const bgImageSettings = theme.backgroundImageSettings || defaultBackgroundImageSettings();
  dom.toolbarBgType.value = bgType;
  dom.toolbarBgColor.value = theme.backgroundColor || '#1a1a1a';
  if (theme.backgroundGradient) {
    dom.toolbarBgGradientStart.value = theme.backgroundGradient.start || '#1a1a1a';
    dom.toolbarBgGradientEnd.value = theme.backgroundGradient.end || '#0b0e14';
    dom.toolbarBgGradientAngle.value = theme.backgroundGradient.angle || 135;
  }
  dom.toolbarBgImageOpacity.value = Math.round((bgImageSettings.opacity !== undefined ? bgImageSettings.opacity : 1) * 100);
  dom.toolbarBgImageScaleX.value = bgImageSettings.scaleX || 100;
  dom.toolbarBgImageScaleY.value = bgImageSettings.scaleY || 100;
  dom.toolbarBgImageOffsetX.value = bgImageSettings.offsetX || 0;
  dom.toolbarBgImageOffsetY.value = bgImageSettings.offsetY || 0;

  dom.bgColorPanel.style.display = bgType === 'color' ? 'block' : 'none';
  dom.bgGradientPanel.style.display = bgType === 'gradient' ? 'block' : 'none';
  dom.bgImagePanel.style.display = bgType === 'image' ? 'block' : 'none';

  renderSegments(config.segments || []);
  renderSegmentNav();
  updatePreviewSegmentSelect();
}

async function loadConfig() {
  const config = await window.electronAPI.loadConfig();
  fillEditorUI(config);
}

async function showMigrationNoticeIfNeeded() {
  if (!window.electronAPI?.consumeMigrationInfo) return;
  try {
    const info = await window.electronAPI.consumeMigrationInfo();
    if (!info) return;
    const notification = dom.migrationNotification;
    const backupPathEl = dom.migrationBackupPath;
    if (!notification) return;
    if (backupPathEl && info.backupPath) {
      backupPathEl.textContent = info.backupPath;
    }
    notification.style.display = 'block';
    log('info', `已展示配置迁移提示：从版本 ${info.fromVersion ?? 'none'} 迁移`);
  } catch (e) {
    log('error', `获取迁移信息失败: ${e.message}`);
  }
}

function hideMigrationNotification() {
  const notification = dom.migrationNotification;
  if (notification) notification.style.display = 'none';
}

async function loadConfigFromImport(config) {
  fillEditorUI(config);
}

function switchPanel(panelId) {
  document.querySelectorAll('.editor-panel').forEach((p) => p.classList.remove('active'));
  document.querySelectorAll('.editor-nav-item').forEach((n) => n.classList.remove('active'));
  document.querySelectorAll('.editor-tab').forEach((t) => t.classList.remove('active'));

  const panel = document.getElementById('panel-' + panelId);
  if (panel) panel.classList.add('active');

  const nav = document.querySelector(`.editor-nav-item[data-panel="${panelId}"]`);
  if (nav) nav.classList.add('active');

  const tab = document.querySelector(`.editor-tab[data-panel="${panelId}"]`);
  if (tab) tab.classList.add('active');
}

function renderSegments(segments) {
  const root = dom.segmentsRoot;
  const existingCards = Array.from(root.children);
  const targetCount = segments.length;
  const existingCount = existingCards.length;

  for (let i = 0; i < Math.min(existingCount, targetCount); i++) {
    const card = existingCards[i];
    const segment = segments[i];
    const nameInput = card.querySelector('[data-field="name"]');
    const typeSelect = card.querySelector('[data-field="type"]');
    const durationInput = card.querySelector('[data-field="duration"]');
    const sideSelect = card.querySelector('[data-field="side"]');
    const indexLabel = card.querySelector('.segment-name-row strong');

    if (indexLabel) indexLabel.textContent = i + 1;
    if (nameInput && nameInput.value !== (segment.name || '')) nameInput.value = segment.name || '';
    if (typeSelect && typeSelect.value !== segment.type) {
      typeSelect.value = segment.type;
      updateNameTemplateSelect(card, segment.type || 'single_speech');
    }
    if (durationInput) {
      durationInput.value = segment.duration || 0;
      const durationRow = card.querySelector('.duration-row');
      if (durationRow) durationRow.style.display = segment.type === 'none' ? 'none' : '';
    }
    if (sideSelect) {
      sideSelect.value = segment.side || '';
      const sideRow = card.querySelector('.side-row');
      if (sideRow) sideRow.style.display = segment.type === 'none' || segment.type === 'neutral_timer' ? 'none' : '';
    }
  }

  for (let i = existingCount; i < targetCount; i++) {
    const segment = segments[i];
    const card = document.createElement('article');
    card.className = 'segment-card';
    card.innerHTML = `
      <div class="row segment-name-row"><strong>${i + 1}</strong><input data-field="name" value="${segment.name || ''}" /></div>
      <div class="row"><select data-field="type"><option value="none" ${segment.type === 'none' ? 'selected' : ''}>无计时</option><option value="single_speech" ${segment.type === 'single_speech' ? 'selected' : ''}>单边计时</option><option value="single_question" ${segment.type === 'single_question' ? 'selected' : ''}>单边发问</option><option value="neutral_timer" ${segment.type === 'neutral_timer' ? 'selected' : ''}>中立计时</option><option value="dual_debate" ${segment.type === 'dual_debate' ? 'selected' : ''}>双边对辩</option></select></div>
      <div class="row name-template-row">
        <select data-name-side class="name-template"></select>
        <select data-name-position class="name-template"></select>
        <select data-name-template class="name-template"></select>
        <select data-name-side2 class="name-template" style="display:none"></select>
        <select data-name-position2 class="name-template" style="display:none" multiple></select>
        <select data-name-option2 class="name-template"></select>
        <button type="button" data-action="apply-name">确认名称</button>
      </div>
      <div class="row duration-row" ${segment.type === 'none' ? 'style="display:none"' : ''}><input data-field="duration" type="number" value="${segment.duration || 0}" min="0" step="5" /></div>
      <div class="row action-row"><button data-action="up">上移</button><button data-action="down">下移</button><button data-action="del">删除</button></div>
      <div class="row side-row" ${segment.type === 'none' || segment.type === 'neutral_timer' ? 'style="display:none"' : ''}><select data-field="side"><option value="" ${!segment.side ? 'selected' : ''}>默认</option><option value="affirmative" ${segment.side === 'affirmative' ? 'selected' : ''}>正方</option><option value="negative" ${segment.side === 'negative' ? 'selected' : ''}>反方</option></select></div>
    `;
    root.appendChild(card);
    updateNameTemplateSelect(card, segment.type || 'single_speech');
  }

  for (let i = existingCount - 1; i >= targetCount; i--) {
    existingCards[i].remove();
  }

  updatePreviewSegmentSelect();
}

function moveSegmentCard(index, direction) {
  const root = dom.segmentsRoot;
  const cards = Array.from(root.children);
  if (direction === 'up' && index > 0) {
    root.insertBefore(cards[index], cards[index - 1]);
  } else if (direction === 'down' && index < cards.length - 1) {
    root.insertBefore(cards[index + 1], cards[index]);
  }
  updateCardIndices();
  renderSegmentNav();
}

function updateCardIndices() {
  document.querySelectorAll('.segment-card').forEach((card, i) => {
    const strong = card.querySelector('.segment-name-row strong');
    if (strong) strong.textContent = i + 1;
  });
}

function renderSegmentNav() {
  const navContainer = dom.segmentNav;
  if (!navContainer) return;
  const cards = document.querySelectorAll('.segment-card');
  const existingItems = navContainer.querySelectorAll('.segment-nav-item');
  const targetCount = cards.length;
  const existingCount = existingItems.length;

  for (let i = 0; i < Math.min(existingCount, targetCount); i++) {
    const item = existingItems[i];
    const name = cards[i].querySelector('[data-field="name"]').value || `环节 ${i + 1}`;
    const indexSpan = item.querySelector('.nav-index');
    const nameSpan = item.querySelector('.nav-name');
    if (indexSpan) indexSpan.textContent = `${i + 1}.`;
    if (nameSpan) nameSpan.textContent = name;
    item.setAttribute('data-index', i);
  }

  for (let i = existingCount; i < targetCount; i++) {
    const name = cards[i].querySelector('[data-field="name"]').value || `环节 ${i + 1}`;
    const item = document.createElement('div');
    item.className = 'segment-nav-item';
    item.setAttribute('data-index', i);
    item.innerHTML = `<span class="drag-handle">⋮⋮</span><span class="nav-index">${i + 1}.</span><span class="nav-name">${name}</span>`;
    navContainer.appendChild(item);
  }

  for (let i = existingCount - 1; i >= targetCount; i--) {
    existingItems[i].remove();
  }
}

function bindSegmentNavDragDrop() {
  const navContainer = dom.segmentNav;
  if (!navContainer) return;

  let draggedItem = null;
  let draggedIndex = null;
  let placeholder = null;
  let isDragging = false;
  let dragPreview = null;
  let dragOffsetX = 0;
  let dragOffsetY = 0;

  function createPlaceholder() {
    const ph = document.createElement('div');
    ph.className = 'segment-nav-placeholder';
    return ph;
  }

  function createDragPreview(item) {
    const preview = item.cloneNode(true);
    preview.classList.remove('dragging');
    preview.classList.add('drag-preview');
    const rect = item.getBoundingClientRect();
    preview.style.left = `${rect.left}px`;
    preview.style.top = `${rect.top}px`;
    preview.style.width = `${rect.width}px`;
    dragOffsetX = 0;
    dragOffsetY = 0;
    document.body.appendChild(preview);
    return preview;
  }

  function getInsertionIndex(clientY) {
    const items = Array.from(navContainer.querySelectorAll('.segment-nav-item'));
    for (let i = 0; i < items.length; i++) {
      if (items[i] === draggedItem) continue;
      const rect = items[i].getBoundingClientRect();
      const midpoint = rect.top + rect.height / 2;
      if (clientY < midpoint) return i;
    }
    return items.length;
  }

  function updatePlaceholder(clientY) {
    const items = Array.from(navContainer.querySelectorAll('.segment-nav-item'));
    const insertIndex = getInsertionIndex(clientY);

    let beforeNode = null;
    let itemCount = 0;
    for (const child of navContainer.children) {
      if (child === placeholder) continue;
      if (child.classList.contains('segment-nav-item')) {
        if (itemCount === insertIndex) {
          beforeNode = child;
          break;
        }
        itemCount++;
      }
    }

    if (beforeNode) {
      if (placeholder.nextSibling !== beforeNode) {
        navContainer.insertBefore(placeholder, beforeNode);
      }
    } else {
      if (navContainer.lastChild !== placeholder) {
        navContainer.appendChild(placeholder);
      }
    }
  }

  navContainer.addEventListener('mousedown', (e) => {
    const item = e.target.closest('.segment-nav-item');
    if (!item) return;
    if (e.button !== 0) return;
    e.preventDefault();

    draggedItem = item;
    draggedIndex = parseInt(item.getAttribute('data-index'), 10);
    isDragging = true;

    item.classList.add('dragging');

    placeholder = createPlaceholder();
    navContainer.insertBefore(placeholder, item.nextSibling);

    dragPreview = createDragPreview(item);

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  });

  function onMouseMove(e) {
    if (!isDragging) return;
    e.preventDefault();

    if (dragPreview) {
      dragPreview.style.left = `${e.clientX - dragOffsetX}px`;
      dragPreview.style.top = `${e.clientY - dragOffsetY}px`;
    }

    updatePlaceholder(e.clientY);
  }

  function onMouseUp(e) {
    if (!isDragging) return;
    isDragging = false;

    document.removeEventListener('mousemove', onMouseMove);
    document.removeEventListener('mouseup', onMouseUp);

    if (dragPreview) {
      dragPreview.remove();
      dragPreview = null;
    }

    if (draggedItem) {
      draggedItem.classList.remove('dragging');
    }

    let insertIndex = 0;
    if (placeholder) {
      const children = Array.from(navContainer.children);
      let count = 0;
      for (const child of children) {
        if (child === placeholder) break;
        if (child === draggedItem) continue;
        if (child.classList.contains('segment-nav-item')) count++;
      }
      insertIndex = count;
      placeholder.remove();
      placeholder = null;
    }

    if (draggedIndex !== null && insertIndex !== draggedIndex) {
      const root = dom.segmentsRoot;
      const cards = Array.from(root.children);
      const draggedCard = cards[draggedIndex];
      draggedCard.remove();

      const remainingCards = Array.from(root.children);
      if (insertIndex >= remainingCards.length) {
        root.appendChild(draggedCard);
      } else {
        root.insertBefore(draggedCard, remainingCards[insertIndex]);
      }

      updateCardIndices();
      renderSegmentNav();
    }

    draggedItem = null;
    draggedIndex = null;
  }

  // 右键菜单
  let contextMenu = document.getElementById('segmentNavContextMenu');
  if (!contextMenu) {
    contextMenu = document.createElement('div');
    contextMenu.id = 'segmentNavContextMenu';
    contextMenu.style.cssText = 'position:fixed;display:none;z-index:1000;background:var(--bg-card);border:1px solid var(--border-subtle);border-radius:var(--radius-sm);box-shadow:var(--shadow-md);padding:4px 0;min-width:140px;overflow:hidden;';
    contextMenu.innerHTML = `
      <div class="ctx-item" data-ctx="scroll" style="padding:6px 14px;font-size:13px;cursor:pointer;transition:background var(--duration-fast);color:var(--text-primary);">定位到该环节</div>
      <div class="ctx-item" data-ctx="up" style="padding:6px 14px;font-size:13px;cursor:pointer;transition:background var(--duration-fast);color:var(--text-primary);">上移</div>
      <div class="ctx-item" data-ctx="down" style="padding:6px 14px;font-size:13px;cursor:pointer;transition:background var(--duration-fast);color:var(--text-primary);">下移</div>
      <div class="ctx-divider" style="height:1px;background:var(--border-subtle);margin:4px 0;"></div>
      <div class="ctx-item" data-ctx="del" style="padding:6px 14px;font-size:13px;cursor:pointer;transition:background var(--duration-fast);color:var(--danger);">删除</div>
    `;
    document.body.appendChild(contextMenu);

    contextMenu.addEventListener('mouseover', (e) => {
      if (e.target.classList.contains('ctx-item')) {
        e.target.style.background = 'var(--bg-card-hover)';
      }
    });
    contextMenu.addEventListener('mouseout', (e) => {
      if (e.target.classList.contains('ctx-item')) {
        e.target.style.background = '';
      }
    });
  }

  function hideContextMenu() {
    contextMenu.style.display = 'none';
  }

  navContainer.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    const item = e.target.closest('.segment-nav-item');
    if (!item) return;
    const index = parseInt(item.getAttribute('data-index'), 10);
    const cards = Array.from(document.querySelectorAll('.segment-card'));

    const rect = document.body.getBoundingClientRect();
    let x = e.clientX;
    let y = e.clientY;
    const menuWidth = 160;
    const menuHeight = 160;
    if (x + menuWidth > rect.width) x = rect.width - menuWidth - 8;
    if (y + menuHeight > rect.height) y = rect.height - menuHeight - 8;

    contextMenu.style.left = `${x}px`;
    contextMenu.style.top = `${y}px`;
    contextMenu.style.display = 'block';

    contextMenu.querySelectorAll('.ctx-item').forEach((el) => {
      el.onclick = () => {
        hideContextMenu();
        const action = el.getAttribute('data-ctx');
        if (action === 'scroll' && cards[index]) {
          cards[index].scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
        if (action === 'up' && index > 0) {
          moveSegmentCard(index, 'up');
        }
        if (action === 'down' && index < cards.length - 1) {
          moveSegmentCard(index, 'down');
        }
        if (action === 'del') {
          cards[index]?.remove();
          updateCardIndices();
          renderSegmentNav();
        }
      };
    });
  });

  document.addEventListener('click', (e) => {
    if (!contextMenu.contains(e.target)) hideContextMenu();
  });
}

function updateNameTemplateSelect(card, type) {
  const sideSelect = card.querySelector('[data-name-side]');
  const positionSelect = card.querySelector('[data-name-position]');
  const templateSelect = card.querySelector('[data-name-template]');
  const side2Select = card.querySelector('[data-name-side2]');
  const position2Select = card.querySelector('[data-name-position2]');
  const option2Select = card.querySelector('[data-name-option2]');
  const durationRow = card.querySelector('.duration-row');
  const sideRow = card.querySelector('.side-row');
  if (durationRow) durationRow.style.display = type === 'none' ? 'none' : '';
  if (sideRow) sideRow.style.display = type === 'none' || type === 'neutral_timer' ? 'none' : '';

  const sideOptions = [
    ['持方', ''],
    ['正方', '正方'],
    ['反方', '反方'],
    ['双方', '双方']
  ];
  const positionOptions = [
    ['辩位', ''],
    ['一辩', '一辩'],
    ['二辩', '二辩'],
    ['三辩', '三辩'],
    ['四辩', '四辩'],
    ['全体', '全体'],
    ['无', '无']
  ];
  const templateOptions = {
    none: [
      ['请选择模板', ''],
      ['开场', '开场'],
      ['评委介绍', '评委介绍'],
      ['双方介绍', '双方介绍'],
      ['提示音介绍', '提示音介绍'],
      ['评委点评', '评委点评'],
      ['赛果公示', '赛果公示']
    ],
    single_speech: [
      ['请选择模板', ''],
      ['陈词', '陈词'],
      ['申论', '申论'],
      ['发言', '发言'],
      ['总结陈词', '总结陈词'],
      ['结辩', '结辩']
    ],
    single_question: [
      ['请选择模板', ''],
      ['质询', '质询'],
      ['盘问', '盘问']
    ],
    neutral_timer: [
      ['请选择模板', ''],
      ['中场暂停', '中场暂停'],
      ['评委述票', '评委述票'],
      ['休息', '休息'],
      ['准备时间', '准备时间']
    ],
    dual_debate: [
      ['请选择模板', ''],
      ['对辩', '对辩'],
      ['自由辩论', '自由辩论'],
      ['交锋', '交锋']
    ]
  };
  const option2Options = [
    ['（附加）', ''],
    ['开篇', '开篇'],
    ['攻辩', '攻辩'],
    ['小结', '小结'],
    ['总结', '总结'],
    ['结辩', '结辩'],
    ['自由', '自由']
  ];
  const side2Options = [
    ['对方持方', ''],
    ['正方', '正方'],
    ['反方', '反方']
  ];
  const position2Options = [
    ['对方辩手', ''],
    ['一辩', '一辩'],
    ['二辩', '二辩'],
    ['三辩', '三辩'],
    ['四辩', '四辩'],
    ['全体', '全体']
  ];

  sideSelect.innerHTML = sideOptions.map(([label, value]) => `<option value="${value}">${label}</option>`).join('');
  sideSelect.value = '';
  positionSelect.innerHTML = positionOptions.map(([label, value]) => `<option value="${value}">${label}</option>`).join('');
  positionSelect.value = '';
  templateSelect.innerHTML = (templateOptions[type] || templateOptions.single_speech).map(([label, value]) => `<option value="${value}">${label}</option>`).join('');
  templateSelect.value = type === 'none' ? '' : '';
  side2Select.innerHTML = side2Options.map(([label, value]) => `<option value="${value}">${label}</option>`).join('');
  side2Select.value = '';
  position2Select.innerHTML = position2Options.map(([label, value]) => `<option value="${value}">${label}</option>`).join('');
  for (const opt of position2Select.options) { opt.selected = false; }
  option2Select.innerHTML = option2Options.map(([label, value]) => `<option value="${value}">${label}</option>`).join('');
  option2Select.value = '';

  const show = (el, v) => { if (el) el.style.display = v ? '' : 'none'; };
  if (type === 'none') {
    show(sideSelect, false);
    show(positionSelect, false);
    show(templateSelect, true);
    show(side2Select, false);
    show(position2Select, false);
    show(option2Select, false);
  } else if (type === 'single_question') {
    show(sideSelect, true);
    show(positionSelect, true);
    show(templateSelect, true);
    show(side2Select, true);
    show(position2Select, true);
    show(option2Select, false);
  } else {
    show(sideSelect, true);
    show(positionSelect, true);
    show(templateSelect, true);
    show(side2Select, false);
    show(position2Select, false);
    show(option2Select, true);
  }
}

function gatherConfig() {
  const theme = currentConfig?.theme || {};
  const layout = currentConfig?.layout ? JSON.parse(JSON.stringify(currentConfig.layout)) : defaultLayout();
  const statusBar = currentConfig?.theme?.statusBar ? JSON.parse(JSON.stringify(currentConfig.theme.statusBar)) : defaultStatusBar();
  const bgImageSettings = currentConfig?.theme?.backgroundImageSettings ? JSON.parse(JSON.stringify(currentConfig.theme.backgroundImageSettings)) : defaultBackgroundImageSettings();
  const bgGradient = currentConfig?.theme?.backgroundGradient ? JSON.parse(JSON.stringify(currentConfig.theme.backgroundGradient)) : defaultBackgroundGradient();

  const preview = dom.timerPreview;
  if (preview) {
    preview.querySelectorAll('[data-layout-key]').forEach((el) => {
      const key = el.getAttribute('data-layout-key');
      if (!layout[key]) layout[key] = {};
      const transform = el.style.transform;
      const match = transform.match(/translate\(([-\d.]+)px,\s*([-\d.]+)px\)/);
      if (match) {
        layout[key].x = parseFloat(match[1]);
        layout[key].y = parseFloat(match[2]);
      }
      const fontSize = parseFloat(el.style.fontSize);
      if (fontSize > 0) layout[key].fontSize = fontSize;
      if (el.style.fontFamily) layout[key].fontFamily = el.style.fontFamily;
      if (el.style.color) layout[key].color = el.style.color;
      if (key === 'watermark') {
        layout[key].text = el.textContent || '';
      }
    });
  }

  const topBand = dom.previewTopBand;
  if (topBand) {
    const h = parseFloat(topBand.style.height);
    if (h > 0) statusBar.height = h;
    if (topBand.style.background) statusBar.background = topBand.style.background;
    if (topBand.style.color) statusBar.color = topBand.style.color;
  }

  // 收集背景设置 - 优先从 currentConfig.theme 读取（已被 updateBackgroundToolbar 更新）
  const bgType = theme.backgroundType || 'color';
  const bgColor = theme.backgroundColor || '#1a1a1a';
  const bgImage = theme.backgroundImage || '';

  return {
    version: 3,
    eventName: dom.previewEventName?.textContent || '新建辩论赛事',
    teams: {
      affirmative: dom.previewAffirmativeTeamName?.textContent || '正方',
      negative: dom.previewNegativeTeamName?.textContent || '反方'
    },
    topics: {
      affirmative: dom.previewAffirmativeTopic?.textContent || '正方辩题',
      negative: dom.previewNegativeTopic?.textContent || '反方辩题'
    },
    theme: {
      preset: theme.preset || 'classic',
      backgroundType: bgType,
      backgroundImage: bgImage,
      backgroundColor: bgColor,
      backgroundGradient: bgGradient,
      fontFamily: theme.fontFamily || 'system-ui',
      fontSizeScale: theme.fontSizeScale || 1,
      customFont: theme.customFont || '',
      customFontName: theme.customFontName || '',
      colors: theme.colors || {
        affirmative: '#c0392b',
        negative: '#2980b9',
        neutral: '#ffffff',
        title: '#3498db',
        text: '#ffffff'
      },
      statusBar: statusBar,
      backgroundImageSettings: bgImageSettings
    },
    layout: layout,
    segments: Array.from(document.querySelectorAll('.segment-card')).map((card, index) => ({
      id: index + 1,
      name: card.querySelector('[data-field="name"]').value,
      type: card.querySelector('[data-field="type"]').value,
      duration: Number(card.querySelector('[data-field="duration"]').value || 0),
      side: card.querySelector('[data-field="side"]').value || undefined
    }))
  };
}

async function saveConfig() {
  const saveBtn = dom.saveBtn;
  saveBtn.textContent = '保存中...';
  log('info', '保存配置');
  await window.electronAPI.saveConfig(gatherConfig());
  saveBtn.textContent = '已保存';
  setTimeout(() => { saveBtn.textContent = '保存配置'; }, 1200);
}

async function resetConfig() {
  log('info', '重置配置');
  await window.electronAPI.resetConfig();
  await loadConfig();
  showToast('已重置为默认配置', 'info');
}

function bindSegmentActions() {
  dom.segmentsRoot.addEventListener('click', async (event) => {
    const action = event.target.getAttribute('data-action');
    if (!action) return;
    const cards = Array.from(document.querySelectorAll('.segment-card'));
    const index = cards.indexOf(event.target.closest('.segment-card'));
    if (index < 0) return;
    if (action === 'up' && index > 0) {
      moveSegmentCard(index, 'up');
    }
    if (action === 'down' && index < cards.length - 1) {
      moveSegmentCard(index, 'down');
    }
    if (action === 'del') {
      cards[index].remove();
      updateCardIndices();
      renderSegmentNav();
    }
    if (action === 'apply-name') {
      const card = event.target.closest('.segment-card');
      const type = card.querySelector('[data-field="type"]').value;
      const template = card.querySelector('[data-name-template]').value;
      const nameInput = card.querySelector('[data-field="name"]');
      let name = '';

      if (type === 'none') {
        name = template || nameInput.value || '新环节';
      } else if (type === 'single_question') {
        const side = card.querySelector('[data-name-side]').value;
        const position = card.querySelector('[data-name-position]').value;
        const side2 = card.querySelector('[data-name-side2]').value;
        const position2Select = card.querySelector('[data-name-position2]');
        const selectedPositions = Array.from(position2Select.selectedOptions).map((o) => o.value).filter(Boolean);
        const position2 = selectedPositions.length ? selectedPositions.join('/') : '';
        const prefix = [side, position].filter(Boolean).join('');
        const target = [side2, position2].filter(Boolean).join('');
        if (template) {
          name = prefix ? `${prefix}·${template}` : template;
          if (target) name = `${name}·${target}`;
        }
      } else {
        const side = card.querySelector('[data-name-side]').value;
        const position = card.querySelector('[data-name-position]').value;
        const option2 = card.querySelector('[data-name-option2]').value;
        const prefixParts = [side, position].filter(Boolean);
        const prefix = prefixParts.join('');
        if (template) {
          name = prefix ? `${prefix}·${template}` : template;
          if (option2) {
            name = `${name}（${option2}）`;
          }
        }
      }
      nameInput.value = name || nameInput.value || '新环节';
      renderSegmentNav();
    }
  });

  dom.segmentsRoot.addEventListener('input', (event) => {
    const card = event.target.closest('.segment-card');
    if (!card) return;
    if (event.target.matches('[data-field="type"]')) {
      updateNameTemplateSelect(card, event.target.value);
    }
    if (event.target.matches('[data-field="name"]')) {
      renderSegmentNav();
    }
  });
}

function addSegmentPreset(type, name, duration, side) {
  const root = dom.segmentsRoot;
  const card = document.createElement('article');
  card.className = 'segment-card';
  card.innerHTML = `
    <div class="row segment-name-row"><strong>${root.children.length + 1}</strong><input data-field="name" value="${name}" /></div>
    <div class="row"><select data-field="type"><option value="none" ${type === 'none' ? 'selected' : ''}>无计时</option><option value="single_speech" ${type === 'single_speech' ? 'selected' : ''}>单边计时</option><option value="single_question" ${type === 'single_question' ? 'selected' : ''}>单边发问</option><option value="neutral_timer" ${type === 'neutral_timer' ? 'selected' : ''}>中立计时</option><option value="dual_debate" ${type === 'dual_debate' ? 'selected' : ''}>双边对辩</option></select></div>
    <div class="row name-template-row">
      <select data-name-side class="name-template"></select>
      <select data-name-position class="name-template"></select>
      <select data-name-template class="name-template"></select>
      <select data-name-side2 class="name-template" style="display:none"></select>
      <select data-name-position2 class="name-template" style="display:none" multiple></select>
      <select data-name-option2 class="name-template"></select>
      <button type="button" data-action="apply-name">确认名称</button>
    </div>
    <div class="row duration-row" ${type === 'none' ? 'style="display:none"' : ''}><input data-field="duration" type="number" value="${duration}" min="0" step="5" /></div>
    <div class="row action-row"><button data-action="up">上移</button><button data-action="down">下移</button><button data-action="del">删除</button></div>
    <div class="row side-row" ${type === 'none' || type === 'neutral_timer' ? 'style="display:none"' : ''}><select data-field="side"><option value="" ${!side ? 'selected' : ''}>默认</option><option value="affirmative" ${side === 'affirmative' ? 'selected' : ''}>正方</option><option value="negative" ${side === 'negative' ? 'selected' : ''}>反方</option></select></div>
  `;
  root.appendChild(card);
  updateNameTemplateSelect(card, type);
  renderSegmentNav();
}

// ==================== 文本编辑工具栏 ====================
function showTextToolbar(element, layoutKey) {
  const toolbar = dom.textEditToolbar;
  if (!toolbar) return;

  editingElement = element;
  editingLayoutKey = layoutKey;

  const contentInput = dom.toolbarTextContent;
  const fontSelect = dom.toolbarFontFamily;
  const sizeInput = dom.toolbarFontSize;
  const colorInput = dom.toolbarTextColor;

  if (contentInput) contentInput.value = element.textContent || '';
  if (fontSelect) fontSelect.value = element.style.fontFamily || currentConfig?.theme?.fontFamily || 'system-ui';

  const computedSize = parseFloat(element.style.fontSize) || parseFloat(getComputedStyle(element).fontSize);
  if (sizeInput) sizeInput.value = Math.round(computedSize);

  const rgb = getComputedStyle(element).color;
  const hex = rgbToHex(rgb);
  if (colorInput) colorInput.value = hex;

  const rect = element.getBoundingClientRect();
  toolbar.style.display = 'block';
  const toolbarWidth = toolbar.offsetWidth || 220;
  const toolbarHeight = toolbar.offsetHeight || 180;
  let left = rect.left;
  let top = rect.bottom + 8;
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  if (left + toolbarWidth > vw) left = vw - toolbarWidth - 8;
  if (left < 8) left = 8;
  if (top + toolbarHeight > vh) top = rect.top - toolbarHeight - 8;
  if (top < 8) top = 8;
  toolbar.style.left = `${left}px`;
  toolbar.style.top = `${top}px`;

  element.classList.add('editing');
}

function hideTextToolbar() {
  const toolbar = dom.textEditToolbar;
  if (toolbar) toolbar.style.display = 'none';
  if (editingElement) {
    editingElement.classList.remove('editing');
    editingElement = null;
  }
  editingLayoutKey = null;
}

function rgbToHex(rgb) {
  if (!rgb || rgb.startsWith('#')) return rgb || '#ffffff';
  const match = rgb.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (!match) return '#ffffff';
  return '#' + [match[1], match[2], match[3]].map((x) => {
    const hex = parseInt(x).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  }).join('');
}

function updateTextToolbar() {
  if (!editingElement) return;
  const content = dom.toolbarTextContent?.value;
  const font = dom.toolbarFontFamily?.value;
  const size = dom.toolbarFontSize?.value;
  const color = dom.toolbarTextColor?.value;

  if (content !== undefined && !editingElement.classList.contains('team-label')) {
    editingElement.textContent = content;
  }
  if (font) editingElement.style.fontFamily = font;
  if (size) editingElement.style.fontSize = `${size}px`;
  if (color) editingElement.style.color = color;

  // 同步对称元素
  const symKey = getSymmetricKey(editingLayoutKey);
  if (symKey) {
    const symEl = document.querySelector(`[data-layout-key="${symKey}"]`);
    if (symEl) {
      if (font) symEl.style.fontFamily = font;
      if (size) symEl.style.fontSize = `${size}px`;
      if (color) symEl.style.color = color;
    }
  }
}

// ==================== 状态栏工具栏 ====================
function showStatusBarToolbar() {
  const toolbar = dom.statusBarToolbar;
  if (!toolbar) return;
  const topBand = dom.previewTopBand;
  if (!topBand) return;

  const rect = topBand.getBoundingClientRect();
  toolbar.style.display = 'block';
  const toolbarWidth = toolbar.offsetWidth || 220;
  const toolbarHeight = toolbar.offsetHeight || 180;
  let left = rect.left + 20;
  let top = rect.bottom + 8;
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  if (left + toolbarWidth > vw) left = vw - toolbarWidth - 8;
  if (left < 8) left = 8;
  if (top + toolbarHeight > vh) top = rect.top - toolbarHeight - 8;
  if (top < 8) top = 8;
  toolbar.style.left = `${left}px`;
  toolbar.style.top = `${top}px`;
}

function hideStatusBarToolbar() {
  const toolbar = dom.statusBarToolbar;
  if (toolbar) toolbar.style.display = 'none';
}

function updateStatusBarToolbar() {
  const topBand = dom.previewTopBand;
  if (!topBand) return;
  const color = dom.toolbarStatusBarColor?.value || '#e74c3c';
  const color2 = dom.toolbarStatusBarColor2?.value || '#3498db';
  const opacity = dom.toolbarStatusBarOpacity?.value || 25;
  const useGradient = dom.toolbarStatusBarGradient?.checked;

  const alpha = opacity / 100;
  const hexToRgba = (hex, a) => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${a})`;
  };

  let background;
  if (useGradient) {
    background = `linear-gradient(90deg, ${hexToRgba(color, alpha)} 0%, ${hexToRgba(color2, alpha)} 100%)`;
  } else {
    background = hexToRgba(color, alpha);
  }
  topBand.style.background = background;

  // 同步到 currentConfig
  if (!currentConfig) currentConfig = {};
  if (!currentConfig.theme) currentConfig.theme = {};
  if (!currentConfig.theme.statusBar) currentConfig.theme.statusBar = {};
  currentConfig.theme.statusBar.background = background;
  currentConfig.theme.statusBar.color = dom.toolbarStatusBarColor?.value || '';
}

// ==================== 背景工具栏 ====================
function showBackgroundToolbar() {
  const toolbar = dom.backgroundToolbar;
  if (!toolbar) return;
  toolbar.style.display = 'block';
  const toolbarWidth = toolbar.offsetWidth || 220;
  const toolbarHeight = toolbar.offsetHeight || 240;
  let left = 20;
  let top = 80;
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  if (left + toolbarWidth > vw) left = vw - toolbarWidth - 8;
  if (left < 8) left = 8;
  if (top + toolbarHeight > vh) top = vh - toolbarHeight - 8;
  if (top < 8) top = 8;
  toolbar.style.left = `${left}px`;
  toolbar.style.top = `${top}px`;
}

function hideBackgroundToolbar() {
  const toolbar = dom.backgroundToolbar;
  if (toolbar) toolbar.style.display = 'none';
}

function updateBackgroundToolbar() {
  const bgType = dom.toolbarBgType?.value || 'color';
  dom.bgColorPanel.style.display = bgType === 'color' ? 'block' : 'none';
  dom.bgGradientPanel.style.display = bgType === 'gradient' ? 'block' : 'none';
  dom.bgImagePanel.style.display = bgType === 'image' ? 'block' : 'none';

  if (!currentConfig) currentConfig = {};
  if (!currentConfig.theme) currentConfig.theme = {};
  const theme = currentConfig.theme;
  theme.backgroundType = bgType;

  if (bgType === 'color') {
    theme.backgroundColor = dom.toolbarBgColor?.value || '#1a1a1a';
  } else if (bgType === 'gradient') {
    if (!theme.backgroundGradient) theme.backgroundGradient = {};
    theme.backgroundGradient.start = dom.toolbarBgGradientStart?.value || '#1a1a1a';
    theme.backgroundGradient.end = dom.toolbarBgGradientEnd?.value || '#0b0e14';
    theme.backgroundGradient.angle = Number(dom.toolbarBgGradientAngle?.value || 135);
  } else if (bgType === 'image') {
    if (!theme.backgroundImageSettings) theme.backgroundImageSettings = {};
    theme.backgroundImageSettings.opacity = Number(dom.toolbarBgImageOpacity?.value || 100) / 100;
    theme.backgroundImageSettings.scaleX = Number(dom.toolbarBgImageScaleX?.value || 100);
    theme.backgroundImageSettings.scaleY = Number(dom.toolbarBgImageScaleY?.value || 100);
    theme.backgroundImageSettings.offsetX = Number(dom.toolbarBgImageOffsetX?.value || 0);
    theme.backgroundImageSettings.offsetY = Number(dom.toolbarBgImageOffsetY?.value || 0);
  }

  applyBackgroundToPreview(theme);
}

// ==================== 文本拖动 ====================
function bindTextDragAndEdit() {
  const preview = dom.timerPreview;
  if (!preview) return;

  let dragElement = null;
  let dragLayoutKey = null;
  let startX = 0;
  let startY = 0;
  let elStartX = 0;
  let elStartY = 0;

  preview.addEventListener('mousedown', (e) => {
    const editable = e.target.closest('[data-editable="text"]');
    if (!editable) return;
    if (isBackgroundEditMode) return; // 背景编辑模式下禁用文本编辑

    e.preventDefault();

    // 判断是点击还是拖动（根据移动距离）
    let isClick = true;
    const clickStartX = e.clientX;
    const clickStartY = e.clientY;

    dragElement = editable;
    dragLayoutKey = editable.getAttribute('data-layout-key');
    startX = e.clientX;
    startY = e.clientY;

    const transform = editable.style.transform;
    const match = transform.match(/translate\(([-\d.]+)px,\s*([-\d.]+)px\)/);
    elStartX = match ? parseFloat(match[1]) : 0;
    elStartY = match ? parseFloat(match[2]) : 0;

    let symElStartX = 0;
    let symElStartY = 0;
    const symKey = getSymmetricKey(dragLayoutKey);
    const symEl = symKey ? document.querySelector(`[data-layout-key="${symKey}"]`) : null;
    if (symEl) {
      const symTransform = symEl.style.transform;
      const symMatch = symTransform.match(/translate\(([\-\d.]+)px,\s*([\-\d.]+)px\)/);
      symElStartX = symMatch ? parseFloat(symMatch[1]) : 0;
      symElStartY = symMatch ? parseFloat(symMatch[2]) : 0;
    }

    editable.classList.add('dragging');

    function onMove(ev) {
      const dx = ev.clientX - startX;
      const dy = ev.clientY - startY;

      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
        isClick = false;
      }

      // 边界限制（按预览缩放比例折算为设计坐标）
      const scale = previewScale || 1;
      const wrapper = dom.editorPreviewWrapper;
      const wrapperRect = wrapper.getBoundingClientRect();
      const elRect = editable.getBoundingClientRect();

      let newX = elStartX + dx / scale;
      let newY = elStartY + dy / scale;

      const topBand = dom.previewTopBand;
      const isInStatusBar = topBand && topBand.contains(editable);

      if (isInStatusBar) {
        const bandRect = topBand.getBoundingClientRect();
        const minX = (-elRect.left + bandRect.left) / scale + elStartX;
        const maxX = (bandRect.right - elRect.right) / scale + elStartX;
        const minY = (-elRect.top + bandRect.top) / scale + elStartY;
        const maxY = (bandRect.bottom - elRect.bottom) / scale + elStartY;
        newX = Math.max(minX, Math.min(maxX, newX));
        newY = Math.max(minY, Math.min(maxY, newY));
      } else {
        const minX = (-elRect.left + wrapperRect.left) / scale + elStartX;
        const maxX = (wrapperRect.right - elRect.right) / scale + elStartX;
        const minY = (-elRect.top + wrapperRect.top) / scale + elStartY;
        const maxY = (wrapperRect.bottom - elRect.bottom) / scale + elStartY;
        newX = Math.max(minX, Math.min(maxX, newX));
        newY = Math.max(minY, Math.min(maxY, newY));
      }

      editable.style.transform = `translate(${newX}px, ${newY}px)`;

      // 对称移动：基于实际移动距离（考虑边界限制后）
      if (symEl) {
        // 实际水平位移 = 边界限制后的新位置 - 起始位置
        const actualDx = newX - elStartX;
        // 镜像移动：对称元素向相反方向移动相同距离
        const symNewX = symElStartX - actualDx;
        const symNewY = symElStartY + (newY - elStartY);
        symEl.style.transform = `translate(${symNewX}px, ${symNewY}px)`;
      }
    }

    function onUp(ev) {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      editable.classList.remove('dragging');

      if (isClick) {
        showTextToolbar(editable, dragLayoutKey);
      }

      dragElement = null;
      dragLayoutKey = null;
    }

    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  });
}

// ==================== 状态栏高度拖拽 ====================
function bindStatusBarResize() {
  const handle = dom.topBandResizeHandle;
  const topBand = dom.previewTopBand;
  if (!handle || !topBand) return;

  handle.addEventListener('mousedown', (e) => {
    e.preventDefault();
    e.stopPropagation();
    isResizingStatusBar = true;
    statusBarStartHeight = parseFloat(getComputedStyle(topBand).height);
    resizeStartY = e.clientY;
    dragLayoutKey = null;

    function onMove(ev) {
      if (!isResizingStatusBar) return;
      const scale = previewScale || 1;
      const dy = (ev.clientY - resizeStartY) / scale;
      const newHeight = Math.max(40, Math.min(200, statusBarStartHeight + dy));
      topBand.style.height = `${newHeight}px`;
    }

    function onUp() {
      isResizingStatusBar = false;
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    }

    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  });

  // 点击状态栏空白区域显示工具栏
  topBand.addEventListener('click', (e) => {
    if (e.target.closest('[data-editable="text"]') || e.target === handle) return;
    if (isBackgroundEditMode) return;
    showStatusBarToolbar();
  });
}

// ==================== 背景编辑模式 ====================
function bindBackgroundEditMode() {
  const btn = dom.editBackgroundBtn;
  const wrapper = dom.editorPreviewWrapper;
  if (!btn || !wrapper) return;

  btn.addEventListener('click', () => {
    isBackgroundEditMode = !isBackgroundEditMode;
    wrapper.classList.toggle('bg-edit-mode', isBackgroundEditMode);
    btn.textContent = isBackgroundEditMode ? '退出背景编辑' : '修改背景相关设置';

    if (isBackgroundEditMode) {
      showBackgroundToolbar();
      hideTextToolbar();
      hideStatusBarToolbar();
    } else {
      hideBackgroundToolbar();
    }
  });
}

// ==================== 工具栏拖动 ====================
function bindToolbarDrag(toolbarId, headerSelector) {
  const toolbar = document.getElementById(toolbarId);
  if (!toolbar) return;
  const header = toolbar.querySelector(headerSelector);
  if (!header) return;

  let isDragging = false;
  let dragStartX = 0;
  let dragStartY = 0;
  let toolbarStartX = 0;
  let toolbarStartY = 0;

  header.addEventListener('mousedown', (e) => {
    e.preventDefault();
    isDragging = true;
    dragStartX = e.clientX;
    dragStartY = e.clientY;
    const rect = toolbar.getBoundingClientRect();
    toolbarStartX = rect.left;
    toolbarStartY = rect.top;

    function onMove(ev) {
      if (!isDragging) return;
      const dx = ev.clientX - dragStartX;
      const dy = ev.clientY - dragStartY;
      toolbar.style.left = `${toolbarStartX + dx}px`;
      toolbar.style.top = `${toolbarStartY + dy}px`;
      toolbar.style.right = 'auto';
    }

    function onUp() {
      isDragging = false;
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    }

    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  });
}

// ==================== 初始化绑定 ====================
cacheDom();
initPreviewScale();
renderFonts();
loadConfig().then(showMigrationNoticeIfNeeded);
bindSegmentActions();
bindSegmentNavDragDrop();
bindTextDragAndEdit();
bindStatusBarResize();
bindBackgroundEditMode();

bindToolbarDrag('textEditToolbar', '.toolbar-header');
bindToolbarDrag('statusBarToolbar', '.toolbar-header');
bindToolbarDrag('backgroundToolbar', '.toolbar-header');

dom.textToolbarClose?.addEventListener('click', hideTextToolbar);
dom.statusBarToolbarClose?.addEventListener('click', hideStatusBarToolbar);
dom.bgToolbarClose?.addEventListener('click', hideBackgroundToolbar);
dom.migrationCloseBtn?.addEventListener('click', hideMigrationNotification);

dom.toolbarTextContent?.addEventListener('input', updateTextToolbar);
dom.toolbarFontFamily?.addEventListener('change', updateTextToolbar);
dom.toolbarFontSize?.addEventListener('input', updateTextToolbar);
dom.toolbarTextColor?.addEventListener('input', updateTextToolbar);

dom.toolbarStatusBarColor?.addEventListener('input', updateStatusBarToolbar);
dom.toolbarStatusBarOpacity?.addEventListener('input', updateStatusBarToolbar);
dom.toolbarStatusBarColor2?.addEventListener('input', updateStatusBarToolbar);
dom.toolbarStatusBarGradient?.addEventListener('change', updateStatusBarToolbar);

dom.toolbarBgType?.addEventListener('change', updateBackgroundToolbar);
dom.toolbarBgColor?.addEventListener('input', updateBackgroundToolbar);
dom.toolbarBgGradientStart?.addEventListener('input', updateBackgroundToolbar);
dom.toolbarBgGradientEnd?.addEventListener('input', updateBackgroundToolbar);
dom.toolbarBgGradientAngle?.addEventListener('input', updateBackgroundToolbar);
dom.toolbarBgImageOpacity?.addEventListener('input', updateBackgroundToolbar);
dom.toolbarBgImageScaleX?.addEventListener('input', updateBackgroundToolbar);
dom.toolbarBgImageScaleY?.addEventListener('input', updateBackgroundToolbar);
dom.toolbarBgImageOffsetX?.addEventListener('input', updateBackgroundToolbar);
dom.toolbarBgImageOffsetY?.addEventListener('input', updateBackgroundToolbar);

dom.previewSegmentSelect?.addEventListener('change', (event) => {
  const index = parseInt(event.target.value, 10);
  if (!Number.isNaN(index)) updatePreviewForSegment(index);
});

dom.toolbarBgImage?.addEventListener('change', (event) => {
  const file = event.target.files && event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    if (!currentConfig) currentConfig = {};
    if (!currentConfig.theme) currentConfig.theme = {};
    currentConfig.theme.backgroundImage = reader.result;
    // 新图片导入时自动铺满全屏
    if (!currentConfig.theme.backgroundImageSettings) currentConfig.theme.backgroundImageSettings = {};
    currentConfig.theme.backgroundImageSettings.scaleX = 100;
    currentConfig.theme.backgroundImageSettings.scaleY = 100;
    // 同步更新工具栏滑块
    const scaleXInput = dom.toolbarBgImageScaleX;
    const scaleYInput = dom.toolbarBgImageScaleY;
    if (scaleXInput) scaleXInput.value = 100;
    if (scaleYInput) scaleYInput.value = 100;
    applyBackgroundToPreview(currentConfig.theme);
  };
  reader.readAsDataURL(file);
});

// 点击空白处关闭工具栏
document.addEventListener('click', (e) => {
  if (!e.target.closest('#textEditToolbar') && !e.target.closest('[data-editable="text"]')) {
    hideTextToolbar();
  }
  if (!e.target.closest('#statusBarToolbar') && !e.target.closest('#previewTopBand')) {
    hideStatusBarToolbar();
  }
});

document.querySelectorAll('.editor-nav-item, .editor-tab').forEach((el) => {
  el.addEventListener('click', () => {
    const panel = el.getAttribute('data-panel');
    if (panel) switchPanel(panel);
  });
});

dom.saveBtn.addEventListener('click', saveConfig);
dom.resetBtn.addEventListener('click', resetConfig);
dom.importConfigBtn.addEventListener('click', async () => {
  log('info', '导入配置');
  const result = await window.electronAPI.importConfig();
  if (result?.ok) {
    log('info', `配置已导入: ${result.path}`);
    alert(`配置已导入：${result.path}`);
    await loadConfigFromImport(result.config);
  } else {
    log('warn', `导入配置失败: ${result?.error || '未知错误'}`);
    alert(`导入失败：${result?.error || '未知错误'}`);
  }
});

dom.exportConfigBtn.addEventListener('click', async () => {
  log('info', '导出配置');
  const result = await window.electronAPI.exportConfig(gatherConfig());
  if (result?.ok) {
    log('info', `配置已导出: ${result.path}`);
    alert(`配置已导出到：${result.path}`);
  }
});

const exportProgressOverlay = dom.exportProgressOverlay;
const exportProgressBar = dom.exportProgressBar;
const exportProgressText = dom.exportProgressText;

if (window.electronAPI?.onExportProgress) {
  window.electronAPI.onExportProgress(({ percent, message }) => {
    if (!exportProgressOverlay || !exportProgressBar || !exportProgressText) return;
    exportProgressBar.style.width = `${percent}%`;
    exportProgressText.textContent = message || '';
    if (percent >= 100) {
      setTimeout(() => exportProgressOverlay.classList.remove('active'), 400);
    }
  });
}

dom.exportTimerBtn.addEventListener('click', async () => {
  log('info', '导出独立计时器');
  if (exportProgressOverlay) {
    exportProgressBar.style.width = '0%';
    exportProgressText.textContent = '准备中...';
    exportProgressOverlay.classList.add('active');
  }
  try {
    const result = await window.electronAPI.exportStandalone(gatherConfig());
    if (result?.ok) {
      log('info', `独立计时器已导出: ${result.path}`);
      let changelogLine = '';
      try {
        const summary = await window.electronAPI.getLatestChangelog();
        if (summary) {
          const firstLine = summary.split(/\r?\n/)[0] || '';
          changelogLine = `\n\n最新更新日志：${firstLine}（可在顶部更新提示中查看完整摘要）`;
        }
      } catch (e) {
        log('warn', `获取最新更新日志失败: ${e.message}`);
      }
      alert(`独立计时器已导出到：${result.path}\n说明：这是一个 NSIS 安装程序，运行后会在本地安装并创建桌面和开始菜单快捷方式。${changelogLine}`);
    } else {
      log('error', `导出独立计时器失败: ${result?.error || '未知错误'}`);
      alert(`导出失败：${result?.error || '未知错误'}`);
    }
  } finally {
    if (exportProgressOverlay) {
      exportProgressOverlay.classList.remove('active');
    }
  }
});

dom.addNoneBtn.addEventListener('click', () => addSegmentPreset('none', '无计时', 0, undefined));
dom.addSpeechBtn.addEventListener('click', () => addSegmentPreset('single_speech', '陈词', 180, 'affirmative'));
dom.addQuestionBtn.addEventListener('click', () => addSegmentPreset('single_question', '质询', 60, 'affirmative'));
dom.addNeutralBtn.addEventListener('click', () => addSegmentPreset('neutral_timer', '中场暂停', 300, undefined));
dom.addDebateBtn.addEventListener('click', () => addSegmentPreset('dual_debate', '对辩', 120, 'affirmative'));
dom.addFreeDebateBtn.addEventListener('click', () => addSegmentPreset('dual_debate', '自由辩论', 240, 'affirmative'));
dom.openTimerBtn.addEventListener('click', () => window.electronAPI.openTimer());

const aboutOverlay = dom.aboutOverlay;
const aboutVersion = dom.aboutVersion;
const aboutCloseBtn = dom.aboutCloseBtn;
const aboutBtn = dom.aboutBtn;

async function showAbout() {
  if (!aboutOverlay || !aboutVersion) return;
  try {
    const version = await window.electronAPI.getAppVersion();
    aboutVersion.textContent = `版本号：${version}`;
  } catch (e) {
    aboutVersion.textContent = '版本号：未知';
  }
  aboutOverlay.classList.add('active');
}

function hideAbout() {
  if (aboutOverlay) aboutOverlay.classList.remove('active');
}

aboutBtn?.addEventListener('click', showAbout);
aboutCloseBtn?.addEventListener('click', hideAbout);
aboutOverlay?.addEventListener('click', (e) => {
  if (e.target === aboutOverlay) hideAbout();
});

// ==================== 自动更新提示 ====================
const updateNotification = dom.updateNotification;
const updateVersion = dom.updateVersion;
const updateChangelog = dom.updateChangelog;
const updateDownloadBtn = dom.updateDownloadBtn;
const updateRestartBtn = dom.updateRestartBtn;
const updateLaterBtn = dom.updateLaterBtn;
const updateSkipBtn = dom.updateSkipBtn;
const updateErrorText = dom.updateErrorText;

let pendingUpdateVersion = null;

function renderMarkdownToHtml(markdown) {
  if (!markdown) return '';
  const lines = markdown.trim().split(/\r?\n/);
  const out = [];
  let listItems = [];

  function flushList() {
    if (listItems.length === 0) return;
    out.push(`<ul style="margin:0;padding-left:16px;">${listItems.join('')}</ul>`);
    listItems = [];
  }

  for (const line of lines) {
    if (line.startsWith('- ')) {
      listItems.push(`<li>${line.slice(2).trim()}</li>`);
      continue;
    }
    flushList();
    if (line.startsWith('### ')) {
      out.push(`<strong>${line.slice(4).trim()}</strong>`);
    } else if (line.trim() === '') {
      out.push('<br>');
    } else {
      out.push(line);
    }
  }
  flushList();
  return out.join('<br>');
}

function showUpdateNotification(version) {
  if (!updateNotification || !updateVersion) return;
  pendingUpdateVersion = version;
  updateVersion.textContent = version;
  if (updateChangelog) updateChangelog.innerHTML = '正在加载更新日志...';
  if (updateErrorText) updateErrorText.textContent = '';
  if (updateDownloadBtn) {
    updateDownloadBtn.style.display = '';
    updateDownloadBtn.textContent = '立即更新';
    updateDownloadBtn.disabled = false;
  }
  if (updateLaterBtn) updateLaterBtn.style.display = '';
  if (updateRestartBtn) updateRestartBtn.style.display = 'none';
  if (updateSkipBtn) updateSkipBtn.style.display = '';
  updateNotification.style.display = 'block';

  if (window.electronAPI?.getLatestChangelog) {
    window.electronAPI.getLatestChangelog().then((summary) => {
      if (updateChangelog) {
        updateChangelog.innerHTML = summary ? renderMarkdownToHtml(summary) : '暂无更新日志摘要';
      }
    }).catch((e) => {
      log('error', `获取更新日志失败: ${e.message}`);
      if (updateChangelog) updateChangelog.textContent = '更新日志加载失败';
    });
  }
}

function hideUpdateNotification() {
  if (updateNotification) updateNotification.style.display = 'none';
}

if (window.electronAPI?.onUpdateAvailable) {
  window.electronAPI.onUpdateAvailable(({ version }) => {
    log('info', `收到可用更新: ${version}`);
    showUpdateNotification(version);
  });
}

if (window.electronAPI?.onUpdateDownloaded) {
  window.electronAPI.onUpdateDownloaded(() => {
    log('info', '更新已下载');
    if (updateDownloadBtn) updateDownloadBtn.style.display = 'none';
    if (updateLaterBtn) updateLaterBtn.style.display = 'none';
    if (updateSkipBtn) updateSkipBtn.style.display = 'none';
    if (updateRestartBtn) updateRestartBtn.style.display = '';
    if (updateErrorText) updateErrorText.textContent = '更新已下载，重启后安装';
  });
}

if (window.electronAPI?.onUpdateError) {
  window.electronAPI.onUpdateError(({ message }) => {
    log('error', `更新错误: ${message}`);
    if (updateErrorText) updateErrorText.textContent = `更新检查失败：${message}`;
  });
}

updateDownloadBtn?.addEventListener('click', async () => {
  if (!window.electronAPI?.startDownloadUpdate) return;
  updateDownloadBtn.textContent = '下载中...';
  updateDownloadBtn.disabled = true;
  try {
    await window.electronAPI.startDownloadUpdate();
  } catch (e) {
    log('error', `开始下载更新失败: ${e.message}`);
    if (updateErrorText) updateErrorText.textContent = `开始下载失败：${e.message}`;
    updateDownloadBtn.textContent = '立即更新';
    updateDownloadBtn.disabled = false;
  }
});

updateRestartBtn?.addEventListener('click', () => {
  if (!window.electronAPI?.quitAndInstall) return;
  window.electronAPI.quitAndInstall();
});

updateLaterBtn?.addEventListener('click', () => {
  hideUpdateNotification();
});

updateSkipBtn?.addEventListener('click', () => {
  if (window.electronAPI?.skipUpdate && pendingUpdateVersion) {
    window.electronAPI.skipUpdate(pendingUpdateVersion);
  }
  hideUpdateNotification();
});
