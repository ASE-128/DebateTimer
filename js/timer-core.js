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
  }

  pause() {
    this.cancelAnimationFrame();
    this.isRunning = false;
    this.isPaused = true;
    this.lastTimestamp = null;
    this.render();
  }

  stop() {
    this.cancelAnimationFrame();
    this.isRunning = false;
    this.isPaused = true;
    this.lastTimestamp = null;
    this.render();
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
      return;
    }
    if (currentRemaining <= 5 && previousRemaining > 5 && !this.alertState.last5) {
      this.alertState.last5 = true;
      audioPlayer?.play5?.();
      return;
    }
    if (currentRemaining <= 30 && previousRemaining > 30 && !this.alertState.last30) {
      this.alertState.last30 = true;
      audioPlayer?.play30?.();
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
    }
  }

  nextSegment() {
    const nextIndex = (this.currentIndex + 1) % this.segments.length;
    this.currentIndex = nextIndex;
    this.resetCurrentSegment();
  }

  prevSegment() {
    const prevIndex = (this.currentIndex - 1 + this.segments.length) % this.segments.length;
    this.currentIndex = prevIndex;
    this.resetCurrentSegment();
  }

  jumpToSegment(index) {
    if (!this.segments.length) return;
    this.currentIndex = Math.max(0, Math.min(index, this.segments.length - 1));
    this.resetCurrentSegment();
  }

  setRemaining(seconds) {
    this.pause();
    const value = Math.max(0, Number(seconds) || 0);
    this.remaining = value;
    this.remainingOpposite = value;
    this.alertState = { last30: false, last5: false, lastEnd: false };
    this.lastRenderedSecond = -1;
    this.render();
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
