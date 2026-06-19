function log(level, message) {
  if (typeof window !== 'undefined' && window.electronAPI?.log) {
    window.electronAPI.log(level, message);
  }
}

class TimerEngine {
  constructor(config, onRender) {
    this.config = config;
    this.onRender = onRender;
    this.segments = config.segments || [];
    this.currentIndex = this.findFirstTimedSegment();
    this.isRunning = false;
    this.isPaused = true;
    this.activeSide = 'affirmative';
    this.remaining = this.getCurrentDuration();
    this.remainingOpposite = this.getCurrentDuration();
    this.lastTimestamp = null;
    this.animationFrame = null;
    this.alertState = { last30: false, last5: false, lastEnd: false };
    this.lastRenderedSecond = -1;
    log('info', `TimerEngine 初始化，首环节索引=${this.currentIndex}`);
  }

  findFirstTimedSegment() {
    const index = this.segments.findIndex((segment) => Number(segment.duration || 0) > 0);
    return index >= 0 ? index : 0;
  }

  getCurrentDuration() {
    const segment = this.segments[this.currentIndex] || {};
    return Number(segment.duration || 0);
  }

  resetCurrentSegment() {
    const segment = this.segments[this.currentIndex] || {};
    this.remaining = Number(segment.duration || 0);
    this.remainingOpposite = Number(segment.duration || 0);
    this.activeSide = segment.side || 'affirmative';
    this.isPaused = true;
    this.isRunning = false;
    this.lastTimestamp = null;
    this.cancelAnimationFrame();
    this.alertState = { last30: false, last5: false, lastEnd: false };
    this.lastRenderedSecond = -1;
    this.render();
    log('info', `重置环节: ${segment.name || ('第' + (this.currentIndex + 1) + '环节')}`);
  }

  cancelAnimationFrame() {
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
      this.animationFrame = null;
    }
  }

  ensureCurrentSegment() {
    if (!this.segments.length) return;
    if (Number(this.segments[this.currentIndex]?.duration || 0) <= 0) {
      const nextIndex = this.findFirstTimedSegment();
      if (nextIndex >= 0 && nextIndex !== this.currentIndex) {
        this.currentIndex = nextIndex;
      }
    }
  }

  start() {
    if (!this.segments.length) return;
    this.ensureCurrentSegment();
    const segment = this.segments[this.currentIndex] || {};
    const duration = Number(segment.duration || 0);
    let didReset = false;
    if (this.segments[this.currentIndex]?.type === 'dual_debate') {
      if (this.remaining <= 0) {
        this.remaining = duration;
        didReset = true;
      }
      if (this.remainingOpposite <= 0) {
        this.remainingOpposite = duration;
        didReset = true;
      }
    } else {
      if (this.remaining <= 0) {
        this.remaining = duration;
        didReset = true;
      }
      this.remainingOpposite = duration;
    }
    if (didReset) {
      this.alertState = { last30: false, last5: false, lastEnd: false };
    }
    this.isRunning = true;
    this.isPaused = false;
    this.lastTimestamp = performance.now();
    this.render();
    this.scheduleTick();
    log('info', `计时开始: ${segment.name || '环节'}，时长=${duration}秒，类型=${segment.type}`);
  }

  pause() {
    this.cancelAnimationFrame();
    this.isRunning = false;
    this.isPaused = true;
    this.lastTimestamp = null;
    this.render();
    log('info', '计时暂停');
  }

  stop() {
    this.cancelAnimationFrame();
    this.isRunning = false;
    this.isPaused = true;
    this.lastTimestamp = null;
    this.render();
    log('info', '计时停止');
  }

  toggle() {
    if (this.segments[this.currentIndex]?.type === 'dual_debate') {
      if (this.isRunning) {
        this.switchSide();
      } else {
        this.start();
      }
      return;
    }

    if (this.isRunning) this.pause();
    else this.start();
  }

  scheduleTick() {
    this.cancelAnimationFrame();
    this.animationFrame = requestAnimationFrame(this.tick);
  }

  tick = () => {
    if (!this.isRunning) return;
    const now = performance.now();
    const delta = (now - (this.lastTimestamp || now)) / 1000;
    this.lastTimestamp = now;

    if (this.segments[this.currentIndex]?.type === 'dual_debate') {
      const previousRemaining = this.activeSide === 'affirmative' ? this.remaining : this.remainingOpposite;
      if (this.activeSide === 'affirmative') {
        this.remaining = Math.max(0, this.remaining - delta);
      } else {
        this.remainingOpposite = Math.max(0, this.remainingOpposite - delta);
      }
      const currentRemaining = this.activeSide === 'affirmative' ? this.remaining : this.remainingOpposite;
      this.playAlertForRemaining(previousRemaining, currentRemaining);
      if (this.remaining === 0 && this.remainingOpposite === 0) {
        this.stop();
        return;
      }
      if (this.remaining === 0 || this.remainingOpposite === 0) {
        this.stop();
        return;
      }
    } else {
      const previousRemaining = this.remaining;
      this.remaining = Math.max(0, this.remaining - delta);
      this.playAlertForRemaining(previousRemaining, this.remaining);
      if (this.remaining === 0) {
        this.pause();
        return;
      }
    }

    const displayRemaining = this.segments[this.currentIndex]?.type === 'dual_debate'
      ? (this.activeSide === 'affirmative' ? this.remaining : this.remainingOpposite)
      : this.remaining;
    const currentSecond = Math.floor(displayRemaining);
    if (currentSecond !== this.lastRenderedSecond) {
      this.render();
    }
    if (this.isRunning) this.scheduleTick();
  };

  playAlertForRemaining(previousRemaining, currentRemaining) {
    if (currentRemaining <= 0 && !this.alertState.lastEnd) {
      this.alertState.lastEnd = true;
      audioPlayer?.playEnd?.();
      log('debug', '触发结束提示音');
      return;
    }
    if (currentRemaining <= 5 && previousRemaining > 5 && !this.alertState.last5) {
      this.alertState.last5 = true;
      audioPlayer?.play5?.();
      log('debug', '触发5秒提示音');
      return;
    }
    if (currentRemaining <= 30 && previousRemaining > 30 && !this.alertState.last30) {
      this.alertState.last30 = true;
      audioPlayer?.play30?.();
      log('debug', '触发30秒提示音');
    }
  }

  switchSide() {
    if (this.segments[this.currentIndex]?.type === 'dual_debate') {
      this.cancelAnimationFrame();
      this.activeSide = this.activeSide === 'affirmative' ? 'negative' : 'affirmative';
      this.lastTimestamp = performance.now();
      this.isRunning = true;
      this.isPaused = false;
      this.lastRenderedSecond = -1;
      this.render();
      this.scheduleTick();
      log('info', `切换发言方 → ${this.activeSide === 'affirmative' ? '正方' : '反方'}`);
    }
  }

  nextSegment() {
    const nextIndex = (this.currentIndex + 1) % this.segments.length;
    this.currentIndex = nextIndex;
    this.resetCurrentSegment();
    log('info', `切换到下一环节: 第${nextIndex + 1}环节`);
  }

  prevSegment() {
    const prevIndex = (this.currentIndex - 1 + this.segments.length) % this.segments.length;
    this.currentIndex = prevIndex;
    this.resetCurrentSegment();
    log('info', `切换到上一环节: 第${prevIndex + 1}环节`);
  }

  jumpToSegment(index) {
    if (!this.segments.length) return;
    this.currentIndex = Math.max(0, Math.min(index, this.segments.length - 1));
    this.resetCurrentSegment();
    log('info', `跳转环节: 第${this.currentIndex + 1}环节`);
  }

  setRemaining(seconds) {
    this.pause();
    const value = Math.max(0, Number(seconds) || 0);
    this.remaining = value;
    this.remainingOpposite = value;
    this.alertState = { last30: false, last5: false, lastEnd: false };
    this.lastRenderedSecond = -1;
    this.render();
    log('info', `设置剩余时间: ${value}秒`);
  }

  getState() {
    return {
      currentSegment: this.segments[this.currentIndex],
      remaining: this.remaining,
      remainingOpposite: this.remainingOpposite,
      activeSide: this.activeSide,
      isRunning: this.isRunning,
      isPaused: this.isPaused,
      currentIndex: this.currentIndex
    };
  }

  render() {
    this.onRender?.(this.getState());
  }
}
