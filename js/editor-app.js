function log(level, message) {
  if (window.electronAPI?.log) {
    window.electronAPI.log(level, message);
  }
}

const fonts = ['system-ui', 'SimSun', 'Microsoft YaHei', 'KaiTi', 'Segoe UI', 'Inter', 'Noto Sans SC'];

function renderFonts() {
  const select = document.getElementById('fontFamily');
  select.innerHTML = '';
  fonts.forEach((font) => {
    const option = document.createElement('option');
    option.value = font;
    option.textContent = font;
    select.appendChild(option);
  });
}

function fillEditorUI(config) {
  if (!config) return;
  document.getElementById('eventName').value = config.eventName || '';
  document.getElementById('affirmativeTeam').value = config.teams?.affirmative || '';
  document.getElementById('negativeTeam').value = config.teams?.negative || '';
  document.getElementById('affirmativeTopic').value = config.topics?.affirmative || '';
  document.getElementById('negativeTopic').value = config.topics?.negative || '';
  document.getElementById('backgroundType').value = config.theme?.backgroundType || 'color';
  document.getElementById('backgroundColor').value = config.theme?.backgroundColor || '#1a1a1a';
  document.getElementById('affirmativeColor').value = config.theme?.colors?.affirmative || '#c0392b';
  document.getElementById('negativeColor').value = config.theme?.colors?.negative || '#2980b9';
  document.getElementById('neutralColor').value = config.theme?.colors?.neutral || '#ffffff';
  document.getElementById('titleColor').value = config.theme?.colors?.title || '#3498db';
  document.getElementById('textColor').value = config.theme?.colors?.text || '#ffffff';
  document.getElementById('fontFamily').value = config.theme?.fontFamily || 'system-ui';
  document.getElementById('fontSizeScale').value = config.theme?.fontSizeScale || 1;
  const customFontInput = document.getElementById('customFont');
  customFontInput.dataset.dataUrl = config.theme?.customFont || '';
  customFontInput.dataset.fileName = config.theme?.customFontName || '';
  renderSegments(config.segments || []);
  renderSegmentNav();
  updatePreview();
}

async function loadConfig() {
  const config = await window.electronAPI.loadConfig();
  fillEditorUI(config);
}

async function loadConfigFromImport(config) {
  fillEditorUI(config);
}

function updatePreview() {
  const preview = document.getElementById('themePreview');
  if (!preview) return;
  const affirmativeColor = document.getElementById('affirmativeColor').value;
  const negativeColor = document.getElementById('negativeColor').value;
  const neutralColor = document.getElementById('neutralColor').value;
  const titleColor = document.getElementById('titleColor').value;
  const textColor = document.getElementById('textColor').value;
  const fontFamily = document.getElementById('fontFamily').value;
  const fontSizeScale = document.getElementById('fontSizeScale').value;
  const eventName = document.getElementById('eventName').value || '赛事名称';
  const bgColor = document.getElementById('backgroundColor').value;
  const bgType = document.getElementById('backgroundType').value;
  const bgImage = document.getElementById('backgroundImage').dataset.dataUrl;

  if (bgType === 'image' && bgImage) {
    preview.style.background = `url(${bgImage})`;
    preview.style.backgroundSize = 'cover';
    preview.style.backgroundPosition = 'center';
  } else {
    preview.style.background = bgColor;
  }

  preview.style.fontFamily = fontFamily;
  preview.style.fontSize = `${parseFloat(fontSizeScale)}em`;

  const pEventName = document.getElementById('previewEventName');
  const pSegmentName = document.getElementById('previewSegmentName');
  const pTimer = document.getElementById('previewTimer');
  const pSideLabel = document.getElementById('previewSideLabel');
  const pNeutralLabel = document.getElementById('previewNeutralLabel');

  if (pEventName) {
    pEventName.style.color = titleColor;
    pEventName.textContent = eventName;
  }
  if (pSegmentName) pSegmentName.style.color = textColor;
  if (pTimer) {
    pTimer.style.color = affirmativeColor;
    pTimer.style.textShadow = `0 0 30px ${affirmativeColor}40`;
  }
  if (pSideLabel) pSideLabel.style.color = affirmativeColor;
  if (pNeutralLabel) pNeutralLabel.style.color = neutralColor;
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
  return {
    eventName: document.getElementById('eventName').value,
    teams: {
      affirmative: document.getElementById('affirmativeTeam').value,
      negative: document.getElementById('negativeTeam').value
    },
    topics: {
      affirmative: document.getElementById('affirmativeTopic').value,
      negative: document.getElementById('negativeTopic').value
    },
    theme: {
      backgroundType: document.getElementById('backgroundType').value || 'color',
      backgroundImage: document.getElementById('backgroundImage').dataset.dataUrl || '',
      backgroundColor: document.getElementById('backgroundColor').value,
      fontFamily: document.getElementById('fontFamily').value,
      fontSizeScale: Number(document.getElementById('fontSizeScale').value),
      customFont: document.getElementById('customFont').dataset.dataUrl || '',
      customFontName: document.getElementById('customFont').dataset.fileName || '',
      colors: {
        affirmative: document.getElementById('affirmativeColor').value,
        negative: document.getElementById('negativeColor').value,
        neutral: document.getElementById('neutralColor').value,
        title: document.getElementById('titleColor').value,
        text: document.getElementById('textColor').value
      }
    },
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

renderFonts();
loadConfig();
bindSegmentActions();
bindSegmentNavDragDrop();

document.getElementById('backgroundImage').addEventListener('change', (event) => {
  const file = event.target.files && event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    event.target.dataset.dataUrl = reader.result;
    document.body.style.backgroundImage = `url(${reader.result})`;
    updatePreview();
  };
  reader.readAsDataURL(file);
});

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
document.getElementById('exportTimerBtn').addEventListener('click', async () => {
  log('info', '导出独立计时器');
  const result = await window.electronAPI.exportStandalone(gatherConfig());
  if (result?.ok) {
    log('info', `独立计时器已导出: ${result.path}`);
    alert(`独立计时器已导出到：${result.path}\n说明：该 exe 会自解压到临时目录并启动 Electron 计时器。`);
  } else {
    log('error', `导出独立计时器失败: ${result?.error || '未知错误'}`);
    alert(`导出失败：${result?.error || '未知错误'}`);
  }
});
document.getElementById('addNoneBtn').addEventListener('click', () => addSegmentPreset('none', '无计时', 0, undefined));
document.getElementById('addSpeechBtn').addEventListener('click', () => addSegmentPreset('single_speech', '陈词', 180, 'affirmative'));
document.getElementById('addQuestionBtn').addEventListener('click', () => addSegmentPreset('single_question', '质询', 60, 'affirmative'));
document.getElementById('addNeutralBtn').addEventListener('click', () => addSegmentPreset('neutral_timer', '中场暂停', 300, undefined));
document.getElementById('addDebateBtn').addEventListener('click', () => addSegmentPreset('dual_debate', '对辩', 120, 'affirmative'));
document.getElementById('addFreeDebateBtn').addEventListener('click', () => addSegmentPreset('dual_debate', '自由辩论', 240, 'affirmative'));
document.getElementById('openTimerBtn').addEventListener('click', () => window.electronAPI.openTimer());

document.getElementById('customFont').addEventListener('change', (event) => {
  const file = event.target.files && event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    event.target.dataset.dataUrl = reader.result;
    event.target.dataset.fileName = file.name;
  };
  reader.readAsDataURL(file);
});

// 导航切换
  document.querySelectorAll('.editor-nav-item, .editor-tab').forEach((el) => {
    el.addEventListener('click', () => {
      const panel = el.getAttribute('data-panel');
      if (panel) switchPanel(panel);
    });
  });

  // 实时预览事件绑定
  ['eventName', 'affirmativeColor', 'negativeColor', 'neutralColor', 'titleColor', 'textColor', 'fontFamily', 'fontSizeScale', 'backgroundColor', 'backgroundType'].forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('input', updatePreview);
  });
