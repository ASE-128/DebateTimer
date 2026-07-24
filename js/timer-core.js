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
    this.currentIndex = 0;
    this.isRunning = false;
    this.isPaused = true;
    const firstSegment = this.segments[0] || {};
    this.activeSide = firstSegment.type === 'neutral_timer' ? 'neutral' : (firstSegment.side || 'affirmative');
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
    this.activeSide = segment.type === 'neutral_timer' ? 'neutral' : (segment.side || 'affirmative');
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
    if (!this.segments.length || this.isRunning) return;
    this.ensureCurrentSegment();
    const segment = this.segments[this.currentIndex] || {};

    // 时间归零后点击开始无事发生（非对辩），避免再次触发结束提示音；
    // 对辩中一方归零后，点击开始会自动切换到另一方并继续计时。
    // 切换发言方后重置提示音状态，确保另一方的时间到提示音能正常播放。
    if (segment.type === 'dual_debate') {
      if (this.remaining === 0 && this.remainingOpposite === 0) return;
      if (this.activeSide === 'affirmative' && this.remaining === 0) {
        this.activeSide = 'negative';
        this.alertState = { last30: false, last5: false, lastEnd: false };
      } else if (this.activeSide === 'negative' && this.remainingOpposite === 0) {
        this.activeSide = 'affirmative';
        this.alertState = { last30: false, last5: false, lastEnd: false };
      }
    } else if (this.remaining === 0) {
      return;
    }

    this.isRunning = true;
    this.isPaused = false;
    this.lastTimestamp = performance.now();
    this.render();
    this.scheduleTick();
    log('info', `计时开始: ${segment.name || '环节'}，类型=${segment.type}，持方=${this.activeSide}`);
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
      if (this.activeSide === 'affirmative' && this.remaining === 0) {
        this.stop();
        return;
      }
      if (this.activeSide === 'negative' && this.remainingOpposite === 0) {
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
      this.alertState = { last30: false, last5: false, lastEnd: false };
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
