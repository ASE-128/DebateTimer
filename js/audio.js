function log(level, message) {
  if (typeof window !== 'undefined' && window.electronAPI?.log) {
    window.electronAPI.log(level, message);
  }
}

class AudioPlayer {
  constructor() {
    this.audioCtx = null;
  }

  ensureAudio() {
    if (!this.audioCtx) {
      this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      log('debug', 'AudioContext 初始化完成');
    }
    if (this.audioCtx.state === 'suspended') this.audioCtx.resume();
  }

  /**
   * 创建一个带包络的 oscillator 音调。
   */
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

  /**
   * 创建一个简单的混响节点（卷积混响）。
   */
  createReverb(duration, decayFactor) {
    const rate = this.audioCtx.sampleRate;
    const length = Math.floor(rate * duration);
    const impulse = this.audioCtx.createBuffer(2, length, rate);
    for (let c = 0; c < 2; c++) {
      const channel = impulse.getChannelData(c);
      for (let i = 0; i < length; i++) {
        channel[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, decayFactor);
      }
    }
    const convolver = this.audioCtx.createConvolver();
    convolver.buffer = impulse;
    convolver.connect(this.audioCtx.destination);
    return convolver;
  }

  /**
   * 30 秒提示：单音 660Hz，标准金属风，1.0s，80% 音量，慢起快收。
   */
  play30() {
    this.ensureAudio();
    const now = this.audioCtx.currentTime;
    this.createTone({
      frequency: 660,
      type: 'triangle',
      startAt: now,
      duration: 1.0,
      volume: 0.8,
      attack: 0.3,
      decay: 0.7,
      outputNode: this.audioCtx.destination
    });
    log('debug', '播放 30 秒提示音');
  }

  /**
   * 5 秒提示：双音小三度 880Hz+1047Hz，标准金属风，两声间隔 0.15s，每声 0.6s，80% 音量。
   */
  play5() {
    this.ensureAudio();
    const now = this.audioCtx.currentTime;
    const freqs = [880, 1047];
    for (let i = 0; i < 2; i++) {
      const startAt = now + i * 0.15;
      freqs.forEach((freq) => {
        this.createTone({
          frequency: freq,
          type: 'triangle',
          startAt,
          duration: 0.6,
          volume: 0.8,
          attack: 0.01,
          decay: 0.59,
          outputNode: this.audioCtx.destination
        });
      });
    }
    log('debug', '播放 5 秒提示音');
  }

  /**
   * 时间到：大三和弦 880Hz+1109Hz+1319Hz，硬金属风，一声长音 1.5s 后断掉，100% 音量，带混响。
   */
  playEnd() {
    this.ensureAudio();
    const now = this.audioCtx.currentTime;

    // 轻微混响节点
    const reverbNode = this.createReverb(0.5, 2.5);
    const wetRatio = 0.3;
    const freqs = [880, 1109, 1319];

    freqs.forEach((freq) => {
      // 干声
      this.createTone({
        frequency: freq,
        type: 'sawtooth',
        startAt: now,
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
        startAt: now,
        duration: 1.5,
        volume: 1.0 * wetRatio,
        attack: 0.01,
        decay: 1.49,
        outputNode: reverbNode
      });
    });
    log('debug', '播放结束提示音');
  }
}

const audioPlayer = new AudioPlayer();
