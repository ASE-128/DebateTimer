function log(level, message) {
  if (typeof window !== 'undefined' && window.electronAPI?.log) {
    window.electronAPI.log(level, message);
  }
}

class AudioPlayer {
  constructor() {
    this.audioCtx = null;
    this.reverbNode = null;
  }

  ensureAudio() {
    if (!this.audioCtx) {
      this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      log('debug', 'AudioContext 初始化完成');
    }
    if (this.audioCtx.state === 'suspended') this.audioCtx.resume();
    this.ensureReverb();
  }

  ensureReverb() {
    if (this.reverbNode && this.reverbNode.context === this.audioCtx) return;
    this.reverbNode = this.audioCtx.createConvolver();
    this.reverbNode.buffer = this.createReverbBuffer(0.5, 2.5);
    this.reverbNode.connect(this.audioCtx.destination);
  }

  createReverbBuffer(duration, decayFactor) {
    const rate = this.audioCtx.sampleRate;
    const length = Math.floor(rate * duration);
    const impulse = this.audioCtx.createBuffer(2, length, rate);
    for (let c = 0; c < 2; c++) {
      const channel = impulse.getChannelData(c);
      for (let i = 0; i < length; i++) {
        channel[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, decayFactor);
      }
    }
    return impulse;
  }

  createTone({ frequency, type = 'sine', startAt, duration, volume, attack, decay, outputNode }) {
    const osc = this.audioCtx.createOscillator();
    osc.type = type;
    osc.frequency.setValueAtTime(frequency, startAt);

    const gain = this.audioCtx.createGain();
    gain.gain.setValueAtTime(0, startAt);
    gain.gain.linearRampToValueAtTime(volume, startAt + attack);
    // 指数衰减目标不能为 0，使用 0.001 避免 -Infinity
    gain.gain.exponentialRampToValueAtTime(0.001, startAt + attack + decay);

    osc.connect(gain);
    gain.connect(outputNode);

    osc.start(startAt);
    osc.stop(startAt + duration);
  }

  _playEndRing({ startAt }) {
    const wetRatio = 0.3;
    const freqs = [880, 1109, 1319];

    freqs.forEach((freq) => {
      // 干声
      this.createTone({
        frequency: freq,
        type: 'sawtooth',
        startAt,
        duration: 1.5,
        volume: 1.0,
        attack: 0.01,
        decay: 1.49,
        outputNode: this.audioCtx.destination
      });

      // 湿声（进入混响）
      this.createTone({
        frequency: freq,
        type: 'sawtooth',
        startAt,
        duration: 1.5,
        volume: 1.0 * wetRatio,
        attack: 0.01,
        decay: 1.49,
        outputNode: this.reverbNode
      });
    });
  }

  play30() {
    this.ensureAudio();
    const now = this.audioCtx.currentTime;
    this._playEndRing({ startAt: now });
    log('debug', '播放 30 秒提示音（时间到铃声 ×1）');
  }

  play5() {
    this.ensureAudio();
    const now = this.audioCtx.currentTime;
    this._playEndRing({ startAt: now });
    this._playEndRing({ startAt: now + 0.15 });
    log('debug', '播放 5 秒提示音（时间到铃声 ×2）');
  }

  playEnd() {
    this.ensureAudio();
    const now = this.audioCtx.currentTime;
    this._playEndRing({ startAt: now });
    this._playEndRing({ startAt: now + 0.3 });
    this._playEndRing({ startAt: now + 0.6 });
    log('debug', '播放结束提示音');
  }
}

const audioPlayer = new AudioPlayer();
