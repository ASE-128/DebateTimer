const fonts = ['system-ui', 'SimSun', 'Microsoft YaHei', 'KaiTi', 'Segoe UI'];

function renderFonts() {
  const select = document.getElementById('fontFamily');
  fonts.forEach((font) => {
    const option = document.createElement('option');
    option.value = font;
    option.textContent = font;
    select.appendChild(option);
  });
}

async function loadConfigFromImport(config) {
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
  document.getElementById('titleColor').value = config.theme?.colors?.title || '#3498db';
  document.getElementById('fontFamily').value = config.theme?.fontFamily || 'system-ui';
  document.getElementById('fontSizeScale').value = config.theme?.fontSizeScale || 1;
  const customFontInput = document.getElementById('customFont');
  customFontInput.dataset.dataUrl = config.theme?.customFont || '';
  customFontInput.dataset.fileName = config.theme?.customFontName || '';
  renderSegments(config.segments || []);
}

async function loadConfig() {
  const config = await window.electronAPI.loadConfig();
  document.getElementById('eventName').value = config.eventName || '';
  document.getElementById('affirmativeTeam').value = config.teams?.affirmative || '';
  document.getElementById('negativeTeam').value = config.teams?.negative || '';
  document.getElementById('affirmativeTopic').value = config.topics?.affirmative || '';
  document.getElementById('negativeTopic').value = config.topics?.negative || '';
  document.getElementById('backgroundType').value = config.theme?.backgroundType || 'color';
  document.getElementById('backgroundColor').value = config.theme?.backgroundColor || '#1a1a1a';
  document.getElementById('affirmativeColor').value = config.theme?.colors?.affirmative || '#c0392b';
  document.getElementById('negativeColor').value = config.theme?.colors?.negative || '#2980b9';
  document.getElementById('titleColor').value = config.theme?.colors?.title || '#3498db';
  document.getElementById('fontFamily').value = config.theme?.fontFamily || 'system-ui';
  document.getElementById('fontSizeScale').value = config.theme?.fontSizeScale || 1;
  const customFontInput = document.getElementById('customFont');
  customFontInput.dataset.dataUrl = config.theme?.customFont || '';
  customFontInput.dataset.fileName = config.theme?.customFontName || '';
  renderSegments(config.segments || []);
}

function renderSegments(segments) {
  const root = document.getElementById('segments');
  root.innerHTML = '';
  segments.forEach((segment, index) => {
    const card = document.createElement('article');
    card.className = 'segment-card';
    card.innerHTML = `
      <div class="row segment-name-row"><strong>${index + 1}</strong><input data-field="name" value="${segment.name || ''}" /></div>
      <div class="row"><select data-field="type"><option value="none" ${segment.type === 'none' ? 'selected' : ''}>无计时</option><option value="single_speech" ${segment.type === 'single_speech' ? 'selected' : ''}>单边计时</option><option value="single_question" ${segment.type === 'single_question' ? 'selected' : ''}>单边发问</option><option value="dual_debate" ${segment.type === 'dual_debate' ? 'selected' : ''}>双边对辩</option></select></div>
      <div class="row name-template-row">
        <select data-name-side class="name-template"></select>
        <select data-name-position class="name-template"></select>
        <select data-name-template class="name-template"></select>
        <select data-name-option2 class="name-template"></select>
        <button type="button" data-action="apply-name">确认名称</button>
      </div>
      <div class="row duration-row" ${segment.type === 'none' ? 'style="display:none"' : ''}><input data-field="duration" type="number" value="${segment.duration || 0}" min="0" step="5" /></div>
      <div class="row side-row" ${segment.type === 'none' ? 'style="display:none"' : ''}><select data-field="side"><option value="" ${!segment.side ? 'selected' : ''}>默认</option><option value="affirmative" ${segment.side === 'affirmative' ? 'selected' : ''}>正方</option><option value="negative" ${segment.side === 'negative' ? 'selected' : ''}>反方</option></select><button data-action="up">上移</button><button data-action="down">下移</button><button data-action="del">删除</button></div>
    `;
    root.appendChild(card);
    updateNameTemplateSelect(card, segment.type || 'single_speech');
  });
}

function updateNameTemplateSelect(card, type) {
  const sideSelect = card.querySelector('[data-name-side]');
  const positionSelect = card.querySelector('[data-name-position]');
  const templateSelect = card.querySelector('[data-name-template]');
  const option2Select = card.querySelector('[data-name-option2]');
  const durationRow = card.querySelector('.duration-row');
  const sideRow = card.querySelector('.side-row');
  if (durationRow) durationRow.style.display = type === 'none' ? 'none' : '';
  if (sideRow) sideRow.style.display = type === 'none' ? 'none' : '';

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
    none: [['无计时', '无计时'], ['请选择模板', '']],
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
      ['提问', '提问'],
      ['追问', '追问'],
      ['盘问', '盘问']
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

  sideSelect.innerHTML = sideOptions.map(([label, value]) => `<option value="${value}">${label}</option>`).join('');
  sideSelect.value = '';
  positionSelect.innerHTML = positionOptions.map(([label, value]) => `<option value="${value}">${label}</option>`).join('');
  positionSelect.value = '';
  templateSelect.innerHTML = (templateOptions[type] || templateOptions.single_speech).map(([label, value]) => `<option value="${value}">${label}</option>`).join('');
  templateSelect.value = type === 'none' ? '无计时' : '';
  option2Select.innerHTML = option2Options.map(([label, value]) => `<option value="${value}">${label}</option>`).join('');
  option2Select.value = '';
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
        title: document.getElementById('titleColor').value,
        text: '#ffffff'
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
  await window.electronAPI.saveConfig(gatherConfig());
  saveBtn.textContent = '已保存';
  await window.electronAPI.openTimer();
  setTimeout(() => { saveBtn.textContent = '保存配置'; }, 1200);
}

async function resetConfig() {
  await window.electronAPI.resetConfig();
  await loadConfig();
  alert('已重置为默认配置');
}

function bindSegmentActions() {
  document.getElementById('segments').addEventListener('click', async (event) => {
    const action = event.target.getAttribute('data-action');
    if (!action) return;
    const cards = Array.from(document.querySelectorAll('.segment-card'));
    const index = cards.indexOf(event.target.closest('.segment-card'));
    if (index < 0) return;
    if (action === 'up' && index > 0) {
      [cards[index - 1], cards[index]] = [cards[index], cards[index - 1]];
      renderSegments(cards.map((card) => ({
        id: cards.indexOf(card) + 1,
        name: card.querySelector('[data-field="name"]').value,
        type: card.querySelector('[data-field="type"]').value,
        duration: Number(card.querySelector('[data-field="duration"]').value || 0),
        side: card.querySelector('[data-field="side"]').value || undefined
      })));
    }
    if (action === 'down' && index < cards.length - 1) {
      [cards[index], cards[index + 1]] = [cards[index + 1], cards[index]];
      renderSegments(cards.map((card) => ({
        id: cards.indexOf(card) + 1,
        name: card.querySelector('[data-field="name"]').value,
        type: card.querySelector('[data-field="type"]').value,
        duration: Number(card.querySelector('[data-field="duration"]').value || 0),
        side: card.querySelector('[data-field="side"]').value || undefined
      })));
    }
    if (action === 'del') {
      cards.splice(index, 1);
      renderSegments(cards.map((card) => ({
        id: cards.indexOf(card) + 1,
        name: card.querySelector('[data-field="name"]').value,
        type: card.querySelector('[data-field="type"]').value,
        duration: Number(card.querySelector('[data-field="duration"]').value || 0),
        side: card.querySelector('[data-field="side"]').value || undefined
      })));
    }
    if (action === 'apply-name') {
      const card = event.target.closest('.segment-card');
      const side = card.querySelector('[data-name-side]').value;
      const position = card.querySelector('[data-name-position]').value;
      const template = card.querySelector('[data-name-template]').value;
      const option2 = card.querySelector('[data-name-option2]').value;
      const nameInput = card.querySelector('[data-field="name"]');

      const prefixParts = [side, position].filter(Boolean);
      const prefix = prefixParts.join('');
      let name = '';
      if (template) {
        name = prefix ? `${prefix}·${template}` : template;
        if (option2) {
          name = `${name}（${option2}）`;
        }
      }
      nameInput.value = name || nameInput.value || '新环节';
    }
  });

  document.getElementById('segments').addEventListener('input', (event) => {
    const card = event.target.closest('.segment-card');
    if (!card) return;
    if (event.target.matches('[data-field="type"]')) {
      updateNameTemplateSelect(card, event.target.value);
    }
  });
}

function addSegmentPreset(type, name, duration, side) {
  const root = document.getElementById('segments');
  const card = document.createElement('article');
  card.className = 'segment-card';
  card.innerHTML = `
    <div class="row segment-name-row"><strong>${root.children.length + 1}</strong><input data-field="name" value="${name}" /></div>
    <div class="row"><select data-field="type"><option value="none" ${type === 'none' ? 'selected' : ''}>无计时</option><option value="single_speech" ${type === 'single_speech' ? 'selected' : ''}>单边计时</option><option value="single_question" ${type === 'single_question' ? 'selected' : ''}>单边发问</option><option value="dual_debate" ${type === 'dual_debate' ? 'selected' : ''}>双边对辩</option></select></div>
    <div class="row name-template-row">
      <select data-name-side class="name-template"></select>
      <select data-name-position class="name-template"></select>
      <select data-name-template class="name-template"></select>
      <select data-name-option2 class="name-template"></select>
      <button type="button" data-action="apply-name">确认名称</button>
    </div>
    <div class="row duration-row" ${type === 'none' ? 'style="display:none"' : ''}><input data-field="duration" type="number" value="${duration}" min="0" step="5" /></div>
    <div class="row side-row" ${type === 'none' ? 'style="display:none"' : ''}><select data-field="side"><option value="" ${!side ? 'selected' : ''}>默认</option><option value="affirmative" ${side === 'affirmative' ? 'selected' : ''}>正方</option><option value="negative" ${side === 'negative' ? 'selected' : ''}>反方</option></select><button data-action="up">上移</button><button data-action="down">下移</button><button data-action="del">删除</button></div>
  `;
  root.appendChild(card);
  updateNameTemplateSelect(card, type);
}

renderFonts();
loadConfig();
bindSegmentActions();

document.getElementById('backgroundImage').addEventListener('change', (event) => {
  const file = event.target.files && event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    event.target.dataset.dataUrl = reader.result;
    document.body.style.backgroundImage = `url(${reader.result})`;
  };
  reader.readAsDataURL(file);
});

document.getElementById('saveBtn').addEventListener('click', saveConfig);
document.getElementById('resetBtn').addEventListener('click', resetConfig);
document.getElementById('importConfigBtn').addEventListener('click', async () => {
  const result = await window.electronAPI.importConfig();
  if (result?.ok) {
    alert(`配置已导入：${result.path}`);
    await loadConfigFromImport(result.config);
  } else {
    alert(`导入失败：${result?.error || '未知错误'}`);
  }
});

document.getElementById('exportConfigBtn').addEventListener('click', async () => {
  const result = await window.electronAPI.exportConfig(gatherConfig());
  if (result?.ok) alert(`配置已导出到：${result.path}`);
});
document.getElementById('exportTimerBtn').addEventListener('click', async () => {
  const result = await window.electronAPI.exportStandalone(gatherConfig());
  if (result?.ok) {
    alert(`独立计时器已导出到：${result.path}\n说明：该 exe 会自解压到临时目录并启动 Electron 计时器。`);
  } else {
    alert(`导出失败：${result?.error || '未知错误'}`);
  }
});
document.getElementById('addNoneBtn').addEventListener('click', () => addSegmentPreset('none', '无计时', 0, undefined));
document.getElementById('addSpeechBtn').addEventListener('click', () => addSegmentPreset('single_speech', '陈词', 180, 'affirmative'));
document.getElementById('addQuestionBtn').addEventListener('click', () => addSegmentPreset('single_question', '质询', 60, 'affirmative'));
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
