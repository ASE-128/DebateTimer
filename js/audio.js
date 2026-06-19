function log(level, message) {
  if (typeof window !== 'undefined' && window.electronAPI?.log) {
    window.electronAPI.log(level, message);
  }
}

class AudioPlayer {
  constructor() {
    this.audioCtx = null;
    this.gainNode = null;
  }

  ensureAudio() {
    if (!this.audioCtx) {
      this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      this.gainNode = this.audioCtx.createGain();
      this.gainNode.gain.value = 0.08;
      this.gainNode.connect(this.audioCtx.destination);
      log('debug', 'AudioContext 初始化完成');
    }
    if (this.audioCtx.state === 'suspended') this.audioCtx.resume();
  }

  playTone(durationMs, frequency = 1000, type = 'square', repeat = 1, intervalMs = 200) {
    this.ensureAudio();
    const now = this.audioCtx.currentTime;
    const durationSec = durationMs / 1000;
    const intervalSec = intervalMs / 1000;
    log('debug', `播放提示音: freq=${frequency}Hz, duration=${durationMs}ms, repeat=${repeat}`);
    for (let i = 0; i < repeat; i++) {
      const startAt = now + i * intervalSec;
      const osc = this.audioCtx.createOscillator();
      osc.type = type;
      osc.frequency.setValueAtTime(frequency, startAt);
      osc.connect(this.gainNode);
      osc.start(startAt);
      osc.stop(startAt + durationSec);
    }
  }

  play30() { this.playTone(200, 1000, 'square', 1); }
  play5() { this.playTone(180, 1000, 'square', 2, 400); }
  playEnd() { this.playTone(3000, 1000, 'square', 1); }
}

const audioPlayer = new AudioPlayer();
