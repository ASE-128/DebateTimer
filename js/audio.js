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
   * 播放一次时间到铃声，可指定起始时间和共用混响节点。
   */
  _playEndRing({ startAt, reverbNode }) {
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
        outputNode: reverbNode
      });
    });
  }

  /**
   * 30 秒提示：统一使用时间到铃声，响 1 次。
   */
  play30() {
    this.ensureAudio();
    const now = this.audioCtx.currentTime;
    const reverbNode = this.createReverb(0.5, 2.5);
    this._playEndRing({ startAt: now, reverbNode });
    log('debug', '播放 30 秒提示音（时间到铃声 ×1）');
  }

  /**
   * 5 秒提示：统一使用时间到铃声，响 2 次。
   */
  play5() {
    this.ensureAudio();
    const now = this.audioCtx.currentTime;
    const reverbNode = this.createReverb(0.5, 2.5);
    this._playEndRing({ startAt: now, reverbNode });
    this._playEndRing({ startAt: now + 0.15, reverbNode });
    log('debug', '播放 5 秒提示音（时间到铃声 ×2）');
  }

  /**
   * 时间到：统一使用时间到铃声，响 3 次。
   */
  playEnd() {
    this.ensureAudio();
    const now = this.audioCtx.currentTime;
    const reverbNode = this.createReverb(0.5, 2.5);
    this._playEndRing({ startAt: now, reverbNode });
    this._playEndRing({ startAt: now + 0.3, reverbNode });
    this._playEndRing({ startAt: now + 0.6, reverbNode });
    log('debug', '播放结束提示音');
  }
}

const audioPlayer = new AudioPlayer();
