let config = null;
let engine = null;
const isStandalone = !!window.__STANDALONE_CONFIG__;

function log(level, message) {
  if (window.electronAPI?.log) {
    window.electronAPI.log(level, message);
  }
}

const eventNameEl = document.getElementById('eventName');
const segmentNameEl = document.getElementById('segmentName');
const timerDisplayEl = document.getElementById('timerDisplay');
const sideLabelEl = document.getElementById('sideLabel');
const startBtnEl = document.getElementById('startBtn');
const affirmativeTeamNameEl = document.getElementById('affirmativeTeamName');
const negativeTeamNameEl = document.getElementById('negativeTeamName');
const affirmativeTopicEl = document.getElementById('affirmativeTopic');
const negativeTopicEl = document.getElementById('negativeTopic');

const singleTimerEl = document.getElementById('singleTimer');
const dualTimerEl = document.getElementById('dualTimer');
const affirmativeTimeEl = document.getElementById('affirmativeTime');
const negativeTimeEl = document.getElementById('negativeTime');
const timerProgressEl = document.getElementById('timerProgress');
const timerProgressBarEl = document.getElementById('timerProgressBar');

function formatTime(seconds) {
  const total = Math.max(0, Math.floor(seconds));
  const min = String(Math.floor(total / 60)).padStart(2, '0');
  const sec = String(total % 60).padStart(2, '0');
  return `${min}:${sec}`;
}

function applyTheme(theme = config.theme || {}) {
  document.documentElement.style.setProperty('--accent-affirmative', theme.colors?.affirmative || '#e74c3c');
  document.documentElement.style.setProperty('--accent-negative', theme.colors?.negative || '#3498db');
  document.documentElement.style.setProperty('--accent-neutral', theme.colors?.neutral || '#ffffff');
  document.documentElement.style.setProperty('--accent-title', theme.colors?.title || '#5dade2');
  document.documentElement.style.setProperty('--text-color', theme.colors?.text || '#f0f2f5');
  document.documentElement.style.setProperty('--bg-color', theme.backgroundColor || '#0b0e14');

  const bgType = theme.backgroundType || 'color';
  const bgImageSettings = theme.backgroundImageSettings || { opacity: 1, scaleX: 100, scaleY: 100, offsetX: 0, offsetY: 0 };

  const timerShell = document.querySelector('.timer-shell');
  const bgLayer = timerShell ? timerShell.querySelector('.bg-layer') : null;

  // 清除 body 和 .timer-shell 的背景，由独立背景层渲染
  document.body.style.background = 'transparent';
  if (timerShell) {
    timerShell.style.background = 'transparent';
  }

  if (bgType === 'image' && theme.backgroundImage && bgLayer) {
    bgLayer.style.backgroundImage = `url(${theme.backgroundImage})`;
    bgLayer.style.backgroundSize = `${bgImageSettings.scaleX || 100}% ${bgImageSettings.scaleY || 100}%`;
    bgLayer.style.backgroundPosition = `calc(50% + ${bgImageSettings.offsetX || 0}%) calc(50% + ${bgImageSettings.offsetY || 0}%)`;
    bgLayer.style.backgroundRepeat = 'no-repeat';
    bgLayer.style.backgroundColor = theme.backgroundColor || '#0b0e14';
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
    bgLayer.style.backgroundImage = 'none';
    bgLayer.style.background = theme.backgroundColor || '#0b0e14';
    bgLayer.style.backgroundSize = '';
    bgLayer.style.backgroundPosition = '';
    bgLayer.style.backgroundRepeat = '';
    bgLayer.style.opacity = 1;
  }

  const baseFont = theme.fontFamily || 'system-ui';
  document.body.style.fontFamily = baseFont;
  document.documentElement.style.setProperty('--font-family', baseFont);
  document.documentElement.style.setProperty('--font-scale', theme.fontSizeScale || 1);

  // 应用状态栏设置
  const topBand = document.querySelector('.top-band');
  if (topBand && theme.statusBar) {
    const sb = theme.statusBar;
    if (sb.height) topBand.style.height = `${sb.height}px`;
    if (sb.background) topBand.style.background = sb.background;
    if (sb.color) topBand.style.color = sb.color;
  }

  // 应用布局设置（布局数据保存在 config.layout）
  const layout = config?.layout;
  if (layout) {
    const layoutMap = {
      affirmativeTeamName: 'affirmativeTeamName',
      negativeTeamName: 'negativeTeamName',
      affirmativeTopic: 'affirmativeTopic',
      negativeTopic: 'negativeTopic',
      eventName: 'eventName',
      segmentName: 'segmentName',
      sideLabel: 'sideLabel',
      watermark: 'watermark',
      designBy: 'designBy'
    };
    Object.entries(layoutMap).forEach(([key, id]) => {
      const el = document.getElementById(id);
      const settings = layout[key];
      if (el && settings) {
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
      }
    });
  }

  applyCustomFont(theme);
  log('debug', `应用主题: 背景=${theme.backgroundType}, 字体=${baseFont}, 缩放=${theme.fontSizeScale || 1}`);
}

let lastRenderCache = {
  eventName: null,
  segmentName: null,
  isNoTimer: null,
  activeSide: null,
  segmentType: null,
  singleTimerText: null,
  affirmativeTimeText: null,
  negativeTimeText: null,
  progressPct: null,
  progressClass: null
};

function applyCustomFont(theme) {
  const customFontUrl = theme?.customFont;
  const customFontName = theme?.customFontName || 'CustomFont';
  const baseFont = theme?.fontFamily || 'system-ui';
  let style = document.getElementById('custom-font-face');
  if (!style) {
    style = document.createElement('style');
    style.id = 'custom-font-face';
    document.head.appendChild(style);
  }
  if (customFontUrl) {
    style.textContent = `@font-face { font-family: '${customFontName}'; src: url('${customFontUrl}'); }`;
    document.documentElement.style.setProperty('--text-font-family', `'${customFontName}', ${baseFont}`);
  } else {
    style.textContent = '';
    document.documentElement.style.setProperty('--text-font-family', baseFont);
  }
}

function updateControlLabel(state) {
  const btnLabel = startBtnEl.querySelector('.btn-label');
  if (!btnLabel) {
    startBtnEl.textContent = state.isRunning ? '暂停' : '启动';
    return;
  }
  const segType = config?.segments?.[engine?.currentIndex]?.type;
  if (segType === 'dual_debate') {
    btnLabel.textContent = state.isRunning ? '切换' : '开始';
  } else {
    btnLabel.textContent = state.isRunning ? '暂停' : '启动';
  }
}

function updateTeamDisplay(state) {
  affirmativeTeamNameEl.textContent = config?.teams?.affirmative || '正方队';
  negativeTeamNameEl.textContent = config?.teams?.negative || '反方队';
  affirmativeTopicEl.textContent = config?.topics?.affirmative || '正方辩题';
  negativeTopicEl.textContent = config?.topics?.negative || '反方辩题';
  if (eventNameEl) eventNameEl.textContent = config.eventName || '赛事名称';
}

function updateProgress(state) {
  if (!timerProgressBarEl || !timerProgressEl) return;
  const segment = state.currentSegment || {};
  const isNoTimer = segment.type === 'none';
  if (isNoTimer) {
    timerProgressEl.style.display = 'none';
    return;
  }
  timerProgressEl.style.display = '';
  const totalDuration = Number(segment.duration || 0);
  if (totalDuration <= 0) {
    timerProgressEl.style.display = 'none';
    return;
  }
  timerProgressEl.style.display = '';
  let remaining = 0;
  if (segment.type === 'dual_debate') {
    remaining = state.activeSide === 'affirmative' ? state.remaining : state.remainingOpposite;
  } else {
    remaining = state.remaining;
  }
  const pct = Math.max(0, Math.min(100, (remaining / totalDuration) * 100));
  timerProgressBarEl.style.width = `${pct}%`;
  timerProgressBarEl.classList.remove('urgent', 'critical');
  if (remaining <= 5) {
    timerProgressBarEl.classList.add('critical');
  } else if (remaining <= 30) {
    timerProgressBarEl.classList.add('urgent');
  }
}

function adjustSegmentNameFontSize() {
  if (!segmentNameEl) return;
  const parent = segmentNameEl.parentElement;
  if (!parent) return;

  const parentStyle = window.getComputedStyle(parent);
  const parentWidth = parent.clientWidth
    - parseFloat(parentStyle.paddingLeft || 0)
    - parseFloat(parentStyle.paddingRight || 0);
  if (parentWidth <= 0) return;

  const maxFontSize = Math.min(Math.max(window.innerWidth * 0.14, 48), 180);
  const minFontSize = 32;

  segmentNameEl.style.fontSize = `${maxFontSize}px`;
  if (segmentNameEl.scrollWidth <= parentWidth) {
    return;
  }

  let low = minFontSize;
  let high = maxFontSize;
  let best = minFontSize;
  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    segmentNameEl.style.fontSize = `${mid}px`;
    if (segmentNameEl.scrollWidth <= parentWidth) {
      best = mid;
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }
  segmentNameEl.style.fontSize = `${best}px`;
}

function syncUi(actionLabel) {
  const state = engine.getState();
  render(state);
}

function render(state) {
  const segment = state.currentSegment || {};
  const isNoTimer = segment.type === 'none';
  const eventName = config.eventName || '赛事名称';
  if (lastRenderCache.eventName !== eventName) {
    eventNameEl.textContent = eventName;
    lastRenderCache.eventName = eventName;
  }
  const segmentName = segment.name || '开场';
  if (lastRenderCache.segmentName !== segmentName) {
    segmentNameEl.textContent = segmentName;
    lastRenderCache.segmentName = segmentName;
  }
  if (lastRenderCache.isNoTimer !== isNoTimer) {
    segmentNameEl.classList.toggle('segment-name-large', isNoTimer);
    if (!isNoTimer) {
      segmentNameEl.style.fontSize = '';
    }
    lastRenderCache.isNoTimer = isNoTimer;
  }
  if (isNoTimer) {
    adjustSegmentNameFontSize();
  }
  const sideLabelText = isNoTimer ? '' : (state.activeSide === 'neutral' ? '中立计时中' : (state.activeSide === 'affirmative' ? '正方发言中' : '反方发言中'));
  if (sideLabelEl.textContent !== sideLabelText) {
    sideLabelEl.textContent = sideLabelText;
  }
  const sideLabelAffirmative = !isNoTimer && state.activeSide === 'affirmative';
  const sideLabelNegative = !isNoTimer && state.activeSide === 'negative';
  const sideLabelNeutral = !isNoTimer && state.activeSide === 'neutral';
  if (sideLabelEl.classList.contains('affirmative') !== sideLabelAffirmative) {
    sideLabelEl.classList.toggle('affirmative', sideLabelAffirmative);
  }
  if (sideLabelEl.classList.contains('negative') !== sideLabelNegative) {
    sideLabelEl.classList.toggle('negative', sideLabelNegative);
  }
  if (sideLabelEl.classList.contains('neutral') !== sideLabelNeutral) {
    sideLabelEl.classList.toggle('neutral', sideLabelNeutral);
  }
  const sideLabelDisplay = isNoTimer ? 'none' : '';
  if (sideLabelEl.style.display !== sideLabelDisplay) {
    sideLabelEl.style.display = sideLabelDisplay;
  }
  updateControlLabel(state);
  updateTeamDisplay(state);
  updateProgress(state);

  if (isNoTimer) {
    if (lastRenderCache.segmentType !== 'none') {
      singleTimerEl.style.display = 'none';
      dualTimerEl.style.display = 'none';
      timerDisplayEl.style.display = 'none';
      lastRenderCache.segmentType = 'none';
    }
    return;
  }

  timerDisplayEl.style.display = '';
  if (segment.type === 'dual_debate') {
    if (lastRenderCache.segmentType !== 'dual_debate') {
      singleTimerEl.style.display = 'none';
      dualTimerEl.style.display = 'flex';
      singleTimerEl.classList.remove('affirmative', 'negative');
      lastRenderCache.segmentType = 'dual_debate';
    }
    const affTime = formatTime(state.remaining);
    const negTime = formatTime(state.remainingOpposite);
    if (lastRenderCache.affirmativeTimeText !== affTime) {
      affirmativeTimeEl.textContent = affTime;
      lastRenderCache.affirmativeTimeText = affTime;
    }
    if (lastRenderCache.negativeTimeText !== negTime) {
      negativeTimeEl.textContent = negTime;
      lastRenderCache.negativeTimeText = negTime;
    }
  } else {
    if (lastRenderCache.segmentType !== 'single') {
      singleTimerEl.style.display = '';
      dualTimerEl.style.display = 'none';
      lastRenderCache.segmentType = 'single';
    }
    const timerText = formatTime(state.remaining);
    if (lastRenderCache.singleTimerText !== timerText) {
      singleTimerEl.textContent = timerText;
      lastRenderCache.singleTimerText = timerText;
    }
    const singleAffirmative = state.activeSide === 'affirmative';
    const singleNegative = state.activeSide === 'negative';
    const singleNeutral = state.activeSide === 'neutral';
    if (singleTimerEl.classList.contains('affirmative') !== singleAffirmative) {
      singleTimerEl.classList.toggle('affirmative', singleAffirmative);
    }
    if (singleTimerEl.classList.contains('negative') !== singleNegative) {
      singleTimerEl.classList.toggle('negative', singleNegative);
    }
    if (singleTimerEl.classList.contains('neutral') !== singleNeutral) {
      singleTimerEl.classList.toggle('neutral', singleNeutral);
    }
  }
}

async function initTimerApp() {
  config = window.__STANDALONE_CONFIG__ || (await window.electronAPI.loadConfig());
  log('info', `计时页初始化，${isStandalone ? '独立模式' : '编辑页模式'}`);
  engine = new TimerEngine(config, render);
  applyTheme(config.theme || {});
  finishInit();
  if (isStandalone) {
    openStandaloneSetup();
  }
}

function finishInit() {
  log('info', `计时页初始化完成，共 ${config?.segments?.length || 0} 个环节`);
  engine.render();
  bindShortcuts();
  bindControlButtons();
}

function openStandaloneSetup() {
  const modal = document.getElementById('standaloneSetup');
  if (!modal) return finishInit();
  if (engine?.isRunning) engine.pause();
  document.getElementById('ssAffirmativeTeam').value = config.teams?.affirmative || '';
  document.getElementById('ssAffirmativeTopic').value = config.topics?.affirmative || '';
  document.getElementById('ssNegativeTeam').value = config.teams?.negative || '';
  document.getElementById('ssNegativeTopic').value = config.topics?.negative || '';
  modal.classList.add('active');
  const startBtn = document.getElementById('ssStartBtn');
  const newStartBtn = startBtn.cloneNode(true);
  startBtn.parentNode.replaceChild(newStartBtn, startBtn);
  newStartBtn.addEventListener('click', () => {
    config.teams.affirmative = document.getElementById('ssAffirmativeTeam').value || config.teams.affirmative;
    config.teams.negative = document.getElementById('ssNegativeTeam').value || config.teams.negative;
    config.topics.affirmative = document.getElementById('ssAffirmativeTopic').value || config.topics.affirmative;
    config.topics.negative = document.getElementById('ssNegativeTopic').value || config.topics.negative;
    modal.classList.remove('active');
    render(engine.getState());
  });
  if (engine?.isRunning) engine.pause();
}

async function refreshFromConfig(nextConfig) {
  config = nextConfig || (await window.electronAPI.loadConfig());
  log('info', '配置已同步，刷新计时页');
  applyTheme(config.theme || {});
  engine.segments = config.segments || [];
  engine.currentIndex = 0;
  engine.remaining = engine.getCurrentDuration();
  engine.remainingOpposite = engine.getCurrentDuration();
  engine.activeSide = engine.segments[0]?.type === 'neutral_timer' ? 'neutral' : (engine.segments[0]?.side || 'affirmative');
  engine.isRunning = false;
  engine.isPaused = true;
  engine.lastTimestamp = null;
  engine.cancelAnimationFrame?.();
  render(engine.getState());
}

function bindShortcuts() {
  window.addEventListener('resize', () => {
    if (config?.segments?.[engine?.currentIndex]?.type === 'none') {
      requestAnimationFrame(() => adjustSegmentNameFontSize());
    }
  });

  document.addEventListener('keydown', (event) => {
    const isTyping = event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA' || event.target.isContentEditable;
    if (isTyping) return;
    const key = event.key.toLowerCase();
    if (event.code === 'Space') {
      event.preventDefault();
      log('debug', '快捷键：Space 切换计时');
      engine.toggle();
    }
    if (key === 'p') { log('debug', '快捷键：P 暂停'); engine.pause(); }
    if (key === 'q') { log('debug', '快捷键：Q 试播30秒提示音'); audioPlayer.play30(); }
    if (key === 'w') { log('debug', '快捷键：W 试播5秒提示音'); audioPlayer.play5(); }
    if (key === 'e') { log('debug', '快捷键：E 试播结束提示音'); audioPlayer.playEnd(); }
    if (key === 'f') { log('debug', '快捷键：F 切换全屏'); window.electronAPI.toggleFullscreen(); }
    if (key === 'b') {
      log('debug', '快捷键：B 返回');
      if (isStandalone) openStandaloneSetup();
      else window.electronAPI.openEditor();
    }
    if (event.key === 'ArrowRight') { log('debug', '快捷键：→ 下一环节'); engine.nextSegment(); }
    if (event.key === 'ArrowLeft') { log('debug', '快捷键：← 上一环节'); engine.prevSegment(); }
    if (key === 'c') { log('debug', '快捷键：C 切换持方'); engine.switchSide(); }
  });
}

function bindControlButtons() {
  const backBtnLabel = document.querySelector('#backBtn .btn-label');
  if (backBtnLabel) backBtnLabel.textContent = isStandalone ? '队伍设置' : '返回编辑页';
  else document.getElementById('backBtn').textContent = isStandalone ? '队伍设置(B)' : '返回编辑页(B)';
  document.getElementById('startBtn').addEventListener('click', () => {
    if (!engine) return;
    const wasRunning = engine.isRunning;
    const isDual = config?.segments?.[engine.currentIndex]?.type === 'dual_debate';
    log('info', `点击启动按钮，${isDual ? '双边模式' : '单边模式'}，${wasRunning ? '切换' : '启动'}`);
    engine.toggle();
    if (isDual) {
      syncUi(wasRunning ? '已切换发言方' : '计时已开始');
    } else {
      syncUi(engine.isRunning ? '计时已启动' : '计时已暂停');
    }
    startBtnEl.classList.add('pulse');
    setTimeout(() => startBtnEl.classList.remove('pulse'), 180);
  });
  document.getElementById('resetBtn').addEventListener('click', () => {
    if (!engine) return;
    log('info', '点击重置按钮');
    engine.resetCurrentSegment();
    syncUi('已重置当前环节');
    document.getElementById('resetBtn').classList.add('pulse');
    setTimeout(() => document.getElementById('resetBtn').classList.remove('pulse'), 180);
  });
  document.getElementById('prevBtn').addEventListener('click', () => {
    if (!engine) return;
    log('info', '点击上一环节按钮');
    engine.prevSegment();
    syncUi('已切换到上一个环节');
    document.getElementById('prevBtn').classList.add('pulse');
    setTimeout(() => document.getElementById('prevBtn').classList.remove('pulse'), 180);
  });
  document.getElementById('nextBtn').addEventListener('click', () => {
    if (!engine) return;
    log('info', '点击下一环节按钮');
    engine.nextSegment();
    syncUi('已切换到下一个环节');
    document.getElementById('nextBtn').classList.add('pulse');
    setTimeout(() => document.getElementById('nextBtn').classList.remove('pulse'), 180);
  });
  document.getElementById('stopBtn').addEventListener('click', () => {
    if (!engine) return;
    log('info', '点击停止按钮');
    engine.stop();
    syncUi('已停止所有计时');
    document.getElementById('stopBtn').classList.add('pulse');
    setTimeout(() => document.getElementById('stopBtn').classList.remove('pulse'), 180);
  });
  document.getElementById('test30Btn').addEventListener('click', () => { log('debug', '试播30秒提示音'); audioPlayer.play30(); });
  document.getElementById('test5Btn').addEventListener('click', () => { log('debug', '试播5秒提示音'); audioPlayer.play5(); });
  document.getElementById('testEndBtn').addEventListener('click', () => { log('debug', '试播结束提示音'); audioPlayer.playEnd(); });
  document.getElementById('fullscreenBtn').addEventListener('click', async () => { log('info', '切换全屏'); await window.electronAPI.toggleFullscreen(); });
  document.getElementById('backBtn').addEventListener('click', async () => {
    if (isStandalone) {
      log('info', '打开独立计时器队伍设置');
      openStandaloneSetup();
    } else {
      log('info', '返回编辑页');
      await window.electronAPI.openEditor();
    }
  });
  document.getElementById('jumpBtn').addEventListener('click', () => {
    if (!engine) return;
    log('info', '打开环节跳转模态框');
    openJumpModal();
  });
  document.getElementById('setTimeBtn').addEventListener('click', () => {
    if (!engine) return;
    log('info', '打开设置时间模态框');
    openSetTimeModal();
  });
  document.getElementById('jumpCancelBtn').addEventListener('click', closeJumpModal);
  document.getElementById('setTimeCancelBtn').addEventListener('click', closeSetTimeModal);
  document.getElementById('setTimeConfirmBtn').addEventListener('click', () => {
    if (!engine) return;
    const min = parseInt(document.getElementById('setTimeMin').value, 10) || 0;
    const sec = parseInt(document.getElementById('setTimeSec').value, 10) || 0;
    log('info', `设置剩余时间: ${min}分${sec}秒`);
    engine.setRemaining(min * 60 + sec);
    closeSetTimeModal();
    syncUi('已设置剩余时间');
  });
}

function openJumpModal() {
  if (engine?.isRunning) engine.pause();
  const modal = document.getElementById('jumpModal');
  const list = document.getElementById('jumpSegmentList');
  list.innerHTML = '';
  (config?.segments || []).forEach((segment, index) => {
    const btn = document.createElement('button');
    btn.className = 'segment-jump-btn';
    btn.textContent = `${index + 1}. ${segment.name || '未命名环节'}${segment.type === 'dual_debate' ? ' [双计时]' : segment.type === 'neutral_timer' ? ' [中立计时]' : ''}`;
    btn.addEventListener('click', () => {
      log('info', `跳转到环节: ${segment.name || ('第' + (index + 1) + '环节')}`);
      engine.jumpToSegment(index);
      closeJumpModal();
      syncUi(`已跳转到${segment.name || '第' + (index + 1) + '环节'}`);
    });
    list.appendChild(btn);
  });
  modal.classList.add('active');
}

function closeJumpModal() {
  document.getElementById('jumpModal').classList.remove('active');
}

function openSetTimeModal() {
  if (engine?.isRunning) engine.pause();
  const modal = document.getElementById('setTimeModal');
  const state = engine.getState();
  const total = Math.max(0, Math.floor(state.remaining));
  document.getElementById('setTimeMin').value = Math.floor(total / 60);
  document.getElementById('setTimeSec').value = total % 60;
  modal.classList.add('active');
  log('debug', `打开设置时间模态框，当前剩余=${total}秒`);
}

function closeSetTimeModal() {
  document.getElementById('setTimeModal').classList.remove('active');
}

if (window.__STANDALONE_CONFIG__) {
  // 独立模式：直接初始化
  initTimerApp().catch((error) => {
    log('error', `计时页初始化失败: ${error.message}`);
  });
} else {
  // 编辑页模式：等待主进程发送配置
  initTimerApp().catch((error) => {
    log('error', `计时页初始化失败: ${error.message}`);
  });
}

window.electronAPI.onConfigUpdated(async (nextConfig) => {
  await refreshFromConfig(nextConfig);
});
