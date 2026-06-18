let config = null;
let engine = null;
const isStandalone = !!window.__STANDALONE_CONFIG__;
const eventNameEl = document.getElementById('eventName');
const segmentNameEl = document.getElementById('segmentName');
const timerDisplayEl = document.getElementById('timerDisplay');
const sideLabelEl = document.getElementById('sideLabel');
const statusTextEl = document.getElementById('statusText');
const startBtnEl = document.getElementById('startBtn');
const affirmativeTeamNameEl = document.getElementById('affirmativeTeamName');
const negativeTeamNameEl = document.getElementById('negativeTeamName');
const affirmativeTopicEl = document.getElementById('affirmativeTopic');
const negativeTopicEl = document.getElementById('negativeTopic');
const eventTitleEl = document.getElementById('eventTitle');

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
  document.documentElement.style.setProperty('--accent-title', theme.colors?.title || '#5dade2');
  document.documentElement.style.setProperty('--text-color', theme.colors?.text || '#f0f2f5');
  document.documentElement.style.setProperty('--bg-color', theme.backgroundColor || '#0b0e14');
  document.body.style.backgroundImage = theme.backgroundType === 'image' && theme.backgroundImage ? `url(${theme.backgroundImage})` : 'none';
  document.body.style.backgroundSize = 'cover';
  document.body.style.backgroundPosition = 'center';
  const baseFont = theme.fontFamily || 'system-ui';
  document.body.style.fontFamily = baseFont;
  document.documentElement.style.setProperty('--font-family', baseFont);
  document.documentElement.style.setProperty('--font-scale', theme.fontSizeScale || 1);
  applyCustomFont(theme);
}

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

function setStatus(text) {
  statusTextEl.textContent = `状态：${text}`;
}

function updateControlLabel(state) {
  const btnLabel = startBtnEl.querySelector('.btn-label');
  if (!btnLabel) {
    startBtnEl.textContent = state.isRunning ? '暂停' : '启动';
    return;
  }
  if (config?.segments?.[engine?.currentIndex]?.type === 'dual_debate') {
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
  if (eventTitleEl) eventTitleEl.textContent = config.eventName || '赛事名称';
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
  if (totalDuration <= 0) return;
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

function syncUi(actionLabel) {
  const state = engine.getState();
  render(state);
  if (actionLabel) setStatus(actionLabel);
}

function render(state) {
  const segment = state.currentSegment || {};
  const isNoTimer = segment.type === 'none';
  eventNameEl.textContent = config.eventName || '赛事名称';
  segmentNameEl.textContent = segment.name || '开场';
  segmentNameEl.classList.toggle('segment-name-large', isNoTimer);
  sideLabelEl.textContent = isNoTimer ? '' : (state.activeSide === 'affirmative' ? '正方发言中' : '反方发言中');
  sideLabelEl.classList.toggle('affirmative', !isNoTimer && state.activeSide === 'affirmative');
  sideLabelEl.classList.toggle('negative', !isNoTimer && state.activeSide === 'negative');
  sideLabelEl.style.display = isNoTimer ? 'none' : '';
  document.documentElement.style.setProperty('--font-family', config.theme?.fontFamily || 'system-ui');
  document.documentElement.style.setProperty('--font-scale', String(config.theme?.fontSizeScale || 1));
  updateControlLabel(state);
  updateTeamDisplay(state);
  updateProgress(state);

  if (isNoTimer) {
    singleTimerEl.style.display = 'none';
    dualTimerEl.style.display = 'none';
    timerDisplayEl.style.display = 'none';
    return;
  }

  timerDisplayEl.style.display = '';
  if (segment.type === 'dual_debate') {
    singleTimerEl.style.display = 'none';
    dualTimerEl.style.display = 'flex';
    affirmativeTimeEl.textContent = formatTime(state.remaining);
    negativeTimeEl.textContent = formatTime(state.remainingOpposite);
    singleTimerEl.classList.remove('affirmative', 'negative');
  } else {
    singleTimerEl.style.display = '';
    dualTimerEl.style.display = 'none';
    singleTimerEl.textContent = formatTime(state.remaining);
    singleTimerEl.classList.toggle('affirmative', state.activeSide === 'affirmative');
    singleTimerEl.classList.toggle('negative', state.activeSide === 'negative');
  }
}

async function initTimerApp() {
  config = window.__STANDALONE_CONFIG__ || (await window.electronAPI.loadConfig());
  engine = new TimerEngine(config, render);
  applyTheme(config.theme || {});
  finishInit();
  if (isStandalone) {
    openStandaloneSetup();
  }
}

function finishInit() {
  setStatus('已加载配置');
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
    setStatus('队伍信息已更新');
  });
  if (engine?.isRunning) engine.pause();
}

async function refreshFromConfig(nextConfig) {
  config = nextConfig || (await window.electronAPI.loadConfig());
  applyTheme(config.theme || {});
  engine.segments = config.segments || [];
  engine.currentIndex = 0;
  engine.remaining = engine.getCurrentDuration();
  engine.remainingOpposite = engine.getCurrentDuration();
  engine.activeSide = engine.segments[0]?.side || 'affirmative';
  engine.isRunning = false;
  engine.isPaused = true;
  engine.lastTimestamp = null;
  engine.cancelAnimationFrame?.();
  setStatus('配置已同步');
  render(engine.getState());
}

function bindShortcuts() {
  document.addEventListener('keydown', (event) => {
    const isTyping = event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA' || event.target.isContentEditable;
    if (isTyping) return;
    if (event.code === 'Space') {
      event.preventDefault();
      engine.toggle();
    }
    if (event.key.toLowerCase() === 'p') engine.pause();
    if (event.key.toLowerCase() === 'q') audioPlayer.play30();
    if (event.key.toLowerCase() === 'w') audioPlayer.play5();
    if (event.key.toLowerCase() === 'e') audioPlayer.playEnd();
    if (event.key.toLowerCase() === 'f') window.electronAPI.toggleFullscreen();
    if (event.key.toLowerCase() === 'b') {
      if (isStandalone) openStandaloneSetup();
      else window.electronAPI.openEditor();
    }
    if (event.key === 'ArrowRight') engine.nextSegment();
    if (event.key === 'ArrowLeft') engine.prevSegment();
    if (event.key.toLowerCase() === 'c') engine.switchSide();
  });
}

function bindControlButtons() {
  const backBtnLabel = document.querySelector('#backBtn .btn-label');
  if (backBtnLabel) backBtnLabel.textContent = isStandalone ? '队伍设置' : '返回编辑页';
  else document.getElementById('backBtn').textContent = isStandalone ? '队伍设置(B)' : '返回编辑页(B)';
  document.getElementById('startBtn').addEventListener('click', () => {
    if (!engine) return;
    const wasRunning = engine.isRunning;
    engine.toggle();
    const isDual = config?.segments?.[engine.currentIndex]?.type === 'dual_debate';
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
    engine.resetCurrentSegment();
    syncUi('已重置当前环节');
    document.getElementById('resetBtn').classList.add('pulse');
    setTimeout(() => document.getElementById('resetBtn').classList.remove('pulse'), 180);
  });
  document.getElementById('prevBtn').addEventListener('click', () => {
    if (!engine) return;
    engine.prevSegment();
    syncUi('已切换到上一个环节');
    document.getElementById('prevBtn').classList.add('pulse');
    setTimeout(() => document.getElementById('prevBtn').classList.remove('pulse'), 180);
  });
  document.getElementById('nextBtn').addEventListener('click', () => {
    if (!engine) return;
    engine.nextSegment();
    syncUi('已切换到下一个环节');
    document.getElementById('nextBtn').classList.add('pulse');
    setTimeout(() => document.getElementById('nextBtn').classList.remove('pulse'), 180);
  });
  document.getElementById('stopBtn').addEventListener('click', () => {
    if (!engine) return;
    engine.stop();
    syncUi('已停止所有计时');
    document.getElementById('stopBtn').classList.add('pulse');
    setTimeout(() => document.getElementById('stopBtn').classList.remove('pulse'), 180);
  });
  document.getElementById('test30Btn').addEventListener('click', () => { audioPlayer.play30(); setStatus('已播放 30 秒提示音'); });
  document.getElementById('test5Btn').addEventListener('click', () => { audioPlayer.play5(); setStatus('已播放 5 秒提示音'); });
  document.getElementById('testEndBtn').addEventListener('click', () => { audioPlayer.playEnd(); setStatus('已播放时间到提示音'); });
  document.getElementById('fullscreenBtn').addEventListener('click', async () => { await window.electronAPI.toggleFullscreen(); setStatus('已切换全屏状态'); });
  document.getElementById('backBtn').addEventListener('click', async () => {
    if (isStandalone) {
      openStandaloneSetup();
      setStatus('已打开队伍设置');
    } else {
      await window.electronAPI.openEditor();
      setStatus('已返回编辑页');
    }
  });
  document.getElementById('jumpBtn').addEventListener('click', () => {
    if (!engine) return;
    openJumpModal();
  });
  document.getElementById('setTimeBtn').addEventListener('click', () => {
    if (!engine) return;
    openSetTimeModal();
  });
  document.getElementById('jumpCancelBtn').addEventListener('click', closeJumpModal);
  document.getElementById('setTimeCancelBtn').addEventListener('click', closeSetTimeModal);
  document.getElementById('setTimeConfirmBtn').addEventListener('click', () => {
    if (!engine) return;
    const min = parseInt(document.getElementById('setTimeMin').value, 10) || 0;
    const sec = parseInt(document.getElementById('setTimeSec').value, 10) || 0;
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
    btn.textContent = `${index + 1}. ${segment.name || '未命名环节'}${segment.type === 'dual_debate' ? ' [双计时]' : ''}`;
    btn.addEventListener('click', () => {
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
}

function closeSetTimeModal() {
  document.getElementById('setTimeModal').classList.remove('active');
}

if (!window.__STANDALONE_CONFIG__) {
  initTimerApp().catch((error) => {
    console.error('Timer app init failed:', error);
    setStatus('初始化失败，请重试');
  });
}

window.electronAPI.onConfigUpdated(async (nextConfig) => {
  await refreshFromConfig(nextConfig);
});
