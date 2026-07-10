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
    watermark: { x: 0, y: 0, fontSize: 0, fontFamily: '', color: '' },
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
  const preview = document.getElementById('timerPreview');
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
  const topBand = document.getElementById('previewTopBand');
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
  const preview = document.getElementById('timerPreview');
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
  const preview = document.getElementById('timerPreview');
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
}

function fillEditorUI(config) {
  if (!config) return;
  currentConfig = config;

  // 填充预览文本内容
  document.getElementById('previewEventName').textContent = config.eventName || '赛事名称';
  document.getElementById('previewAffirmativeTeamName').textContent = config.teams?.affirmative || '正方队';
  document.getElementById('previewNegativeTeamName').textContent = config.teams?.negative || '反方队';
  document.getElementById('previewAffirmativeTopic').textContent = config.topics?.affirmative || '正方辩题';
  document.getElementById('previewNegativeTopic').textContent = config.topics?.negative || '反方辩题';

  // 应用主题
  applyThemeToPreview(config.theme || {});
  applyLayoutToPreview(config.layout || defaultLayout());

  // 初始化背景工具栏值
  const theme = config.theme || {};
  const bgType = theme.backgroundType || 'color';
  const bgImageSettings = theme.backgroundImageSettings || defaultBackgroundImageSettings();
  document.getElementById('toolbarBgType').value = bgType;
  document.getElementById('toolbarBgColor').value = theme.backgroundColor || '#1a1a1a';
  if (theme.backgroundGradient) {
    document.getElementById('toolbarBgGradientStart').value = theme.backgroundGradient.start || '#1a1a1a';
    document.getElementById('toolbarBgGradientEnd').value = theme.backgroundGradient.end || '#0b0e14';
    document.getElementById('toolbarBgGradientAngle').value = theme.backgroundGradient.angle || 135;
  }
  document.getElementById('toolbarBgImageOpacity').value = Math.round((bgImageSettings.opacity !== undefined ? bgImageSettings.opacity : 1) * 100);
  document.getElementById('toolbarBgImageScaleX').value = bgImageSettings.scaleX || 100;
  document.getElementById('toolbarBgImageScaleY').value = bgImageSettings.scaleY || 100;
  document.getElementById('toolbarBgImageOffsetX').value = bgImageSettings.offsetX || 0;
  document.getElementById('toolbarBgImageOffsetY').value = bgImageSettings.offsetY || 0;
  
  // 切换面板显示
  document.getElementById('bgColorPanel').style.display = bgType === 'color' ? 'block' : 'none';
  document.getElementById('bgGradientPanel').style.display = bgType === 'gradient' ? 'block' : 'none';
  document.getElementById('bgImagePanel').style.display = bgType === 'image' ? 'block' : 'none';

  renderSegments(config.segments || []);
  renderSegmentNav();
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
    const notification = document.getElementById('migrationNotification');
    const backupPathEl = document.getElementById('migrationBackupPath');
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
  const notification = document.getElementById('migrationNotification');
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
  const root = document.getElementById('segments');
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
}

function moveSegmentCard(index, direction) {
  const root = document.getElementById('segments');
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
  const navContainer = document.getElementById('segmentNav');
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
  const navContainer = document.getElementById('segmentNav');
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
      const root = document.getElementById('segments');
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

  // 控制各 select 的显示/隐藏
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

  // 从预览中收集最新布局数据
  const preview = document.getElementById('timerPreview');
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
    });
  }

  // 收集状态栏高度
  const topBand = document.getElementById('previewTopBand');
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
    eventName: document.getElementById('previewEventName')?.textContent || '新建辩论赛事',
    teams: {
      affirmative: document.getElementById('previewAffirmativeTeamName')?.textContent || '正方',
      negative: document.getElementById('previewNegativeTeamName')?.textContent || '反方'
    },
    topics: {
      affirmative: document.getElementById('previewAffirmativeTopic')?.textContent || '正方辩题',
      negative: document.getElementById('previewNegativeTopic')?.textContent || '反方辩题'
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
  const saveBtn = document.getElementById('saveBtn');
  saveBtn.textContent = '保存中...';
  log('info', '保存配置');
  await window.electronAPI.saveConfig(gatherConfig());
  saveBtn.textContent = '已保存';
  await window.electronAPI.openTimer();
  setTimeout(() => { saveBtn.textContent = '保存配置'; }, 1200);
}

async function resetConfig() {
  log('info', '重置配置');
  await window.electronAPI.resetConfig();
  await loadConfig();
  showToast('已重置为默认配置', 'info');
}

function bindSegmentActions() {
  document.getElementById('segments').addEventListener('click', async (event) => {
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

  document.getElementById('segments').addEventListener('input', (event) => {
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
  const root = document.getElementById('segments');
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
  const toolbar = document.getElementById('textEditToolbar');
  if (!toolbar) return;

  editingElement = element;
  editingLayoutKey = layoutKey;

  // 填充当前值
  const contentInput = document.getElementById('toolbarTextContent');
  const fontSelect = document.getElementById('toolbarFontFamily');
  const sizeInput = document.getElementById('toolbarFontSize');
  const colorInput = document.getElementById('toolbarTextColor');

  if (contentInput) contentInput.value = element.textContent || '';
  if (fontSelect) fontSelect.value = element.style.fontFamily || currentConfig?.theme?.fontFamily || 'system-ui';

  const computedSize = parseFloat(element.style.fontSize) || parseFloat(getComputedStyle(element).fontSize);
  if (sizeInput) sizeInput.value = Math.round(computedSize);

  const rgb = getComputedStyle(element).color;
  const hex = rgbToHex(rgb);
  if (colorInput) colorInput.value = hex;

  // 定位工具栏
  const rect = element.getBoundingClientRect();
  toolbar.style.left = `${rect.left}px`;
  toolbar.style.top = `${rect.bottom + 8}px`;
  toolbar.style.display = 'block';

  element.classList.add('editing');
}

function hideTextToolbar() {
  const toolbar = document.getElementById('textEditToolbar');
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
  const content = document.getElementById('toolbarTextContent')?.value;
  const font = document.getElementById('toolbarFontFamily')?.value;
  const size = document.getElementById('toolbarFontSize')?.value;
  const color = document.getElementById('toolbarTextColor')?.value;

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
  const toolbar = document.getElementById('statusBarToolbar');
  if (!toolbar) return;
  const topBand = document.getElementById('previewTopBand');
  if (!topBand) return;

  const rect = topBand.getBoundingClientRect();
  toolbar.style.left = `${rect.left + 20}px`;
  toolbar.style.top = `${rect.bottom + 8}px`;
  toolbar.style.display = 'block';
}

function hideStatusBarToolbar() {
  const toolbar = document.getElementById('statusBarToolbar');
  if (toolbar) toolbar.style.display = 'none';
}

function updateStatusBarToolbar() {
  const topBand = document.getElementById('previewTopBand');
  if (!topBand) return;
  const color = document.getElementById('toolbarStatusBarColor')?.value || '#e74c3c';
  const color2 = document.getElementById('toolbarStatusBarColor2')?.value || '#3498db';
  const opacity = document.getElementById('toolbarStatusBarOpacity')?.value || 25;
  const useGradient = document.getElementById('toolbarStatusBarGradient')?.checked;

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
  currentConfig.theme.statusBar.color = document.getElementById('toolbarStatusBarColor')?.value || '';
}

// ==================== 背景工具栏 ====================
function showBackgroundToolbar() {
  const toolbar = document.getElementById('backgroundToolbar');
  if (!toolbar) return;
  toolbar.style.left = '20px';
  toolbar.style.top = '80px';
  toolbar.style.display = 'block';
}

function hideBackgroundToolbar() {
  const toolbar = document.getElementById('backgroundToolbar');
  if (toolbar) toolbar.style.display = 'none';
}

function updateBackgroundToolbar() {
  const bgType = document.getElementById('toolbarBgType')?.value || 'color';
  document.getElementById('bgColorPanel').style.display = bgType === 'color' ? 'block' : 'none';
  document.getElementById('bgGradientPanel').style.display = bgType === 'gradient' ? 'block' : 'none';
  document.getElementById('bgImagePanel').style.display = bgType === 'image' ? 'block' : 'none';

  if (!currentConfig) currentConfig = {};
  if (!currentConfig.theme) currentConfig.theme = {};
  const theme = currentConfig.theme;
  theme.backgroundType = bgType;

  if (bgType === 'color') {
    theme.backgroundColor = document.getElementById('toolbarBgColor')?.value || '#1a1a1a';
  } else if (bgType === 'gradient') {
    if (!theme.backgroundGradient) theme.backgroundGradient = {};
    theme.backgroundGradient.start = document.getElementById('toolbarBgGradientStart')?.value || '#1a1a1a';
    theme.backgroundGradient.end = document.getElementById('toolbarBgGradientEnd')?.value || '#0b0e14';
    theme.backgroundGradient.angle = Number(document.getElementById('toolbarBgGradientAngle')?.value || 135);
  } else if (bgType === 'image') {
    if (!theme.backgroundImageSettings) theme.backgroundImageSettings = {};
    theme.backgroundImageSettings.opacity = Number(document.getElementById('toolbarBgImageOpacity')?.value || 100) / 100;
    theme.backgroundImageSettings.scaleX = Number(document.getElementById('toolbarBgImageScaleX')?.value || 100);
    theme.backgroundImageSettings.scaleY = Number(document.getElementById('toolbarBgImageScaleY')?.value || 100);
    theme.backgroundImageSettings.offsetX = Number(document.getElementById('toolbarBgImageOffsetX')?.value || 0);
    theme.backgroundImageSettings.offsetY = Number(document.getElementById('toolbarBgImageOffsetY')?.value || 0);
  }

  applyBackgroundToPreview(theme);
}

// ==================== 文本拖动 ====================
function bindTextDragAndEdit() {
  const preview = document.getElementById('timerPreview');
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

      // 边界限制
      const wrapper = document.getElementById('editorPreviewWrapper');
      const wrapperRect = wrapper.getBoundingClientRect();
      const elRect = editable.getBoundingClientRect();

      let newX = elStartX + dx;
      let newY = elStartY + dy;

      // 判断元素是否在状态栏内
      const topBand = document.getElementById('previewTopBand');
      const isInStatusBar = topBand && topBand.contains(editable);

      if (isInStatusBar) {
        // 状态栏内元素：限制在状态栏区域内
        const bandRect = topBand.getBoundingClientRect();
        const minX = -elRect.left + bandRect.left + elStartX;
        const maxX = bandRect.right - elRect.right + elStartX;
        const minY = -elRect.top + bandRect.top + elStartY;
        const maxY = bandRect.bottom - elRect.bottom + elStartY;
        newX = Math.max(minX, Math.min(maxX, newX));
        newY = Math.max(minY, Math.min(maxY, newY));
      } else {
        // 其他元素：限制在预览容器内
        const minX = -elRect.left + wrapperRect.left + elStartX;
        const maxX = wrapperRect.right - elRect.right + elStartX;
        const minY = -elRect.top + wrapperRect.top + elStartY;
        const maxY = wrapperRect.bottom - elRect.bottom + elStartY;
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
        // 点击 - 显示编辑工具栏
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
  const handle = document.getElementById('topBandResizeHandle');
  const topBand = document.getElementById('previewTopBand');
  if (!handle || !topBand) return;

  handle.addEventListener('mousedown', (e) => {
    e.preventDefault();
    e.stopPropagation();
    isResizingStatusBar = true;
    statusBarStartHeight = parseFloat(getComputedStyle(topBand).height);
    resizeStartY = e.clientY;
      dragLayoutKey = null;
    resizeStartY = e.clientY;

    function onMove(ev) {
      if (!isResizingStatusBar) return;
      const dy = ev.clientY - resizeStartY;
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
  const btn = document.getElementById('editBackgroundBtn');
  const wrapper = document.getElementById('editorPreviewWrapper');
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
renderFonts();
loadConfig().then(showMigrationNoticeIfNeeded);
bindSegmentActions();
bindSegmentNavDragDrop();
bindTextDragAndEdit();
bindStatusBarResize();
bindBackgroundEditMode();

// 工具栏拖动
bindToolbarDrag('textEditToolbar', '.toolbar-header');
bindToolbarDrag('statusBarToolbar', '.toolbar-header');
bindToolbarDrag('backgroundToolbar', '.toolbar-header');

// 工具栏关闭按钮
document.getElementById('textToolbarClose')?.addEventListener('click', hideTextToolbar);
document.getElementById('statusBarToolbarClose')?.addEventListener('click', hideStatusBarToolbar);
document.getElementById('bgToolbarClose')?.addEventListener('click', hideBackgroundToolbar);
document.getElementById('migrationCloseBtn')?.addEventListener('click', hideMigrationNotification);

// 工具栏输入事件
document.getElementById('toolbarTextContent')?.addEventListener('input', updateTextToolbar);
document.getElementById('toolbarFontFamily')?.addEventListener('change', updateTextToolbar);
document.getElementById('toolbarFontSize')?.addEventListener('input', updateTextToolbar);
document.getElementById('toolbarTextColor')?.addEventListener('input', updateTextToolbar);

document.getElementById('toolbarStatusBarColor')?.addEventListener('input', updateStatusBarToolbar);
document.getElementById('toolbarStatusBarOpacity')?.addEventListener('input', updateStatusBarToolbar);
document.getElementById('toolbarStatusBarColor2')?.addEventListener('input', updateStatusBarToolbar);
document.getElementById('toolbarStatusBarGradient')?.addEventListener('change', updateStatusBarToolbar);

document.getElementById('toolbarBgType')?.addEventListener('change', updateBackgroundToolbar);
document.getElementById('toolbarBgColor')?.addEventListener('input', updateBackgroundToolbar);
document.getElementById('toolbarBgGradientStart')?.addEventListener('input', updateBackgroundToolbar);
document.getElementById('toolbarBgGradientEnd')?.addEventListener('input', updateBackgroundToolbar);
document.getElementById('toolbarBgGradientAngle')?.addEventListener('input', updateBackgroundToolbar);
document.getElementById('toolbarBgImageOpacity')?.addEventListener('input', updateBackgroundToolbar);
document.getElementById('toolbarBgImageScaleX')?.addEventListener('input', updateBackgroundToolbar);
document.getElementById('toolbarBgImageScaleY')?.addEventListener('input', updateBackgroundToolbar);
document.getElementById('toolbarBgImageOffsetX')?.addEventListener('input', updateBackgroundToolbar);
document.getElementById('toolbarBgImageOffsetY')?.addEventListener('input', updateBackgroundToolbar);

document.getElementById('toolbarBgImage')?.addEventListener('change', (event) => {
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
    const scaleXInput = document.getElementById('toolbarBgImageScaleX');
    const scaleYInput = document.getElementById('toolbarBgImageScaleY');
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

// 导航切换
document.querySelectorAll('.editor-nav-item, .editor-tab').forEach((el) => {
  el.addEventListener('click', () => {
    const panel = el.getAttribute('data-panel');
    if (panel) switchPanel(panel);
  });
});

// 原有按钮事件
document.getElementById('saveBtn').addEventListener('click', saveConfig);
document.getElementById('resetBtn').addEventListener('click', resetConfig);
document.getElementById('importConfigBtn').addEventListener('click', async () => {
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

document.getElementById('exportConfigBtn').addEventListener('click', async () => {
  log('info', '导出配置');
  const result = await window.electronAPI.exportConfig(gatherConfig());
  if (result?.ok) {
    log('info', `配置已导出: ${result.path}`);
    alert(`配置已导出到：${result.path}`);
  }
});

const exportProgressOverlay = document.getElementById('exportProgressOverlay');
const exportProgressBar = document.getElementById('exportProgressBar');
const exportProgressText = document.getElementById('exportProgressText');

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

document.getElementById('exportTimerBtn').addEventListener('click', async () => {
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

document.getElementById('addNoneBtn').addEventListener('click', () => addSegmentPreset('none', '无计时', 0, undefined));
document.getElementById('addSpeechBtn').addEventListener('click', () => addSegmentPreset('single_speech', '陈词', 180, 'affirmative'));
document.getElementById('addQuestionBtn').addEventListener('click', () => addSegmentPreset('single_question', '质询', 60, 'affirmative'));
document.getElementById('addNeutralBtn').addEventListener('click', () => addSegmentPreset('neutral_timer', '中场暂停', 300, undefined));
document.getElementById('addDebateBtn').addEventListener('click', () => addSegmentPreset('dual_debate', '对辩', 120, 'affirmative'));
document.getElementById('addFreeDebateBtn').addEventListener('click', () => addSegmentPreset('dual_debate', '自由辩论', 240, 'affirmative'));
document.getElementById('openTimerBtn').addEventListener('click', () => window.electronAPI.openTimer());

const aboutOverlay = document.getElementById('aboutOverlay');
const aboutVersion = document.getElementById('aboutVersion');
const aboutCloseBtn = document.getElementById('aboutCloseBtn');
const aboutBtn = document.getElementById('aboutBtn');

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
const updateNotification = document.getElementById('updateNotification');
const updateVersion = document.getElementById('updateVersion');
const updateChangelog = document.getElementById('updateChangelog');
const updateDownloadBtn = document.getElementById('updateDownloadBtn');
const updateRestartBtn = document.getElementById('updateRestartBtn');
const updateLaterBtn = document.getElementById('updateLaterBtn');
const updateSkipBtn = document.getElementById('updateSkipBtn');
const updateErrorText = document.getElementById('updateErrorText');

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
