import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TimerEngine } from '../js/timer-core.js';

let pendingFrame = null;
let mockedNow = 10000;

function polyfillBrowserGlobals() {
  global.audioPlayer = {
    play30: vi.fn(),
    play5: vi.fn(),
    playEnd: vi.fn()
  };

  global.requestAnimationFrame = (callback) => {
    pendingFrame = callback;
    return 1;
  };

  global.cancelAnimationFrame = () => {
    pendingFrame = null;
  };

  vi.spyOn(performance, 'now').mockImplementation(() => mockedNow);
}

function resetPolyfills() {
  pendingFrame = null;
  mockedNow = 10000;
  vi.restoreAllMocks();
}

function advanceTime(ms) {
  mockedNow += ms;
  if (pendingFrame) {
    const callback = pendingFrame;
    pendingFrame = null;
    callback(mockedNow);
  }
}

function createConfig(segments) {
  return {
    version: 3,
    eventName: '测试赛事',
    teams: { affirmative: '正方', negative: '反方' },
    topics: { affirmative: '正', negative: '反' },
    theme: {},
    layout: {},
    segments
  };
}

describe('TimerEngine', () => {
  beforeEach(() => {
    polyfillBrowserGlobals();
  });

  afterEach(() => {
    resetPolyfills();
  });

  describe('初始化', () => {
    it('初始化后总时间、当前环节、剩余时间正确', () => {
      const config = createConfig([
        { id: 1, name: '陈词', type: 'single_speech', duration: 180, side: 'affirmative' },
        { id: 2, name: '质询', type: 'single_question', duration: 60, side: 'negative' }
      ]);
      const engine = new TimerEngine(config, () => {});
      const state = engine.getState();

      expect(engine.segments).toHaveLength(2);
      expect(engine.currentIndex).toBe(0);
      expect(engine.remaining).toBe(180);
      expect(engine.remainingOpposite).toBe(180);
      expect(engine.activeSide).toBe('affirmative');
      expect(engine.isRunning).toBe(false);
      expect(engine.isPaused).toBe(true);
      expect(state.currentSegment.name).toBe('陈词');
      expect(state.remaining).toBe(180);
    });

    it('中立计时环节初始化 activeSide 为 neutral', () => {
      const config = createConfig([{ id: 1, name: '中场休息', type: 'neutral_timer', duration: 300 }]);
      const engine = new TimerEngine(config, () => {});
      expect(engine.activeSide).toBe('neutral');
    });

    it('无计时环节剩余时间为 0', () => {
      const config = createConfig([{ id: 1, name: '开场', type: 'none', duration: 0 }]);
      const engine = new TimerEngine(config, () => {});
      expect(engine.remaining).toBe(0);
      expect(engine.isPaused).toBe(true);
    });
  });

  describe('启动与暂停', () => {
    it('启动后状态变化正确', () => {
      const config = createConfig([{ id: 1, name: '陈词', type: 'single_speech', duration: 180, side: 'affirmative' }]);
      const engine = new TimerEngine(config, () => {});
      engine.start();
      expect(engine.isRunning).toBe(true);
      expect(engine.isPaused).toBe(false);
    });

    it('暂停后状态变化正确', () => {
      const config = createConfig([{ id: 1, name: '陈词', type: 'single_speech', duration: 180, side: 'affirmative' }]);
      const engine = new TimerEngine(config, () => {});
      engine.start();
      engine.pause();
      expect(engine.isRunning).toBe(false);
      expect(engine.isPaused).toBe(true);
    });

    it('toggle 在启动与暂停间切换', () => {
      const config = createConfig([{ id: 1, name: '陈词', type: 'single_speech', duration: 180, side: 'affirmative' }]);
      const engine = new TimerEngine(config, () => {});
      engine.toggle();
      expect(engine.isRunning).toBe(true);
      engine.toggle();
      expect(engine.isRunning).toBe(false);
      expect(engine.isPaused).toBe(true);
    });

    it('时间归零后再次开始无事发生', () => {
      const config = createConfig([{ id: 1, name: '陈词', type: 'single_speech', duration: 1, side: 'affirmative' }]);
      const engine = new TimerEngine(config, () => {});
      engine.start();
      advanceTime(1500);
      expect(engine.remaining).toBe(0);
      engine.start();
      expect(engine.isRunning).toBe(false);
    });

    it('暂停后继续计时保持剩余时间', () => {
      const config = createConfig([{ id: 1, name: '陈词', type: 'single_speech', duration: 60, side: 'affirmative' }]);
      const engine = new TimerEngine(config, () => {});
      engine.start();
      advanceTime(5000);
      expect(engine.remaining).toBeCloseTo(55, 1);
      engine.pause();
      expect(engine.isRunning).toBe(false);
      engine.start();
      expect(engine.isRunning).toBe(true);
      advanceTime(2000);
      expect(engine.remaining).toBeCloseTo(53, 1);
    });
  });

  describe('加时与手动设置', () => {
    it('setRemaining 可加时并暂停当前计时', () => {
      const config = createConfig([{ id: 1, name: '陈词', type: 'single_speech', duration: 60, side: 'affirmative' }]);
      const engine = new TimerEngine(config, () => {});
      engine.start();
      advanceTime(10000);
      engine.setRemaining(90);
      expect(engine.isRunning).toBe(false);
      expect(engine.isPaused).toBe(true);
      expect(engine.remaining).toBe(90);
      expect(engine.remainingOpposite).toBe(90);
    });

    it('setRemaining 传入负数按 0 处理', () => {
      const config = createConfig([{ id: 1, name: '陈词', type: 'single_speech', duration: 60, side: 'affirmative' }]);
      const engine = new TimerEngine(config, () => {});
      engine.setRemaining(-10);
      expect(engine.remaining).toBe(0);
      expect(engine.remainingOpposite).toBe(0);
    });
  });

  describe('时间递减', () => {
    it('single_speech 运行一段时间后 remaining 正确减少', () => {
      const config = createConfig([{ id: 1, name: '陈词', type: 'single_speech', duration: 60, side: 'affirmative' }]);
      const engine = new TimerEngine(config, () => {});
      engine.start();
      advanceTime(5000);
      expect(engine.remaining).toBeCloseTo(55, 1);
      advanceTime(10000);
      expect(engine.remaining).toBeCloseTo(45, 1);
    });

    it('single_question 运行一段时间后 remaining 正确减少', () => {
      const config = createConfig([{ id: 1, name: '质询', type: 'single_question', duration: 60, side: 'negative' }]);
      const engine = new TimerEngine(config, () => {});
      engine.start();
      advanceTime(10000);
      expect(engine.remaining).toBeCloseTo(50, 1);
      expect(engine.activeSide).toBe('negative');
    });

    it('neutral_timer 运行一段时间后 remaining 正确减少', () => {
      const config = createConfig([{ id: 1, name: '中场休息', type: 'neutral_timer', duration: 60 }]);
      const engine = new TimerEngine(config, () => {});
      engine.start();
      advanceTime(15000);
      expect(engine.remaining).toBeCloseTo(45, 1);
      expect(engine.activeSide).toBe('neutral');
    });

    it('none 类型 remaining 保持为 0', () => {
      const config = createConfig([{ id: 1, name: '开场', type: 'none', duration: 0 }]);
      const engine = new TimerEngine(config, () => {});
      engine.start();
      advanceTime(1000);
      expect(engine.remaining).toBe(0);
      expect(engine.isRunning).toBe(false);
    });

    it('剩余时间不会减到负数', () => {
      const config = createConfig([{ id: 1, name: '短环节', type: 'single_speech', duration: 2, side: 'affirmative' }]);
      const engine = new TimerEngine(config, () => {});
      engine.start();
      advanceTime(5000);
      expect(engine.remaining).toBe(0);
      expect(engine.isRunning).toBe(false);
    });
  });

  describe('环节切换', () => {
    it('nextSegment 切换到下一环节并重置状态', () => {
      const config = createConfig([
        { id: 1, name: '陈词', type: 'single_speech', duration: 180, side: 'affirmative' },
        { id: 2, name: '质询', type: 'single_question', duration: 60, side: 'negative' }
      ]);
      const engine = new TimerEngine(config, () => {});
      engine.start();
      advanceTime(5000);
      engine.nextSegment();
      expect(engine.currentIndex).toBe(1);
      expect(engine.remaining).toBe(60);
      expect(engine.activeSide).toBe('negative');
      expect(engine.isRunning).toBe(false);
    });

    it('prevSegment 切换到上一环节', () => {
      const config = createConfig([
        { id: 1, name: '陈词', type: 'single_speech', duration: 180, side: 'affirmative' },
        { id: 2, name: '质询', type: 'single_question', duration: 60, side: 'negative' }
      ]);
      const engine = new TimerEngine(config, () => {});
      engine.nextSegment();
      expect(engine.currentIndex).toBe(1);
      engine.prevSegment();
      expect(engine.currentIndex).toBe(0);
      expect(engine.remaining).toBe(180);
    });

    it('环节切换循环到开头', () => {
      const config = createConfig([{ id: 1, name: '陈词', type: 'single_speech', duration: 180, side: 'affirmative' }]);
      const engine = new TimerEngine(config, () => {});
      engine.nextSegment();
      expect(engine.currentIndex).toBe(0);
    });

    it('jumpToSegment 跳转到指定环节', () => {
      const config = createConfig([
        { id: 1, name: '一', type: 'single_speech', duration: 10 },
        { id: 2, name: '二', type: 'single_speech', duration: 20 },
        { id: 3, name: '三', type: 'single_speech', duration: 30 }
      ]);
      const engine = new TimerEngine(config, () => {});
      engine.jumpToSegment(2);
      expect(engine.currentIndex).toBe(2);
      expect(engine.remaining).toBe(30);
    });
  });

  describe('dual_debate 双边对辩', () => {
    it('一方时间耗尽后另一侧可继续计时', () => {
      const config = createConfig([{ id: 1, name: '对辩', type: 'dual_debate', duration: 2, side: 'affirmative' }]);
      const engine = new TimerEngine(config, () => {});
      engine.start();
      expect(engine.activeSide).toBe('affirmative');
      advanceTime(2500);
      expect(engine.remaining).toBe(0);
      expect(engine.isRunning).toBe(false);

      engine.start();
      expect(engine.activeSide).toBe('negative');
      expect(engine.isRunning).toBe(true);
      advanceTime(1000);
      expect(engine.remainingOpposite).toBeCloseTo(1, 1);
    });

    it('切换发言方后对方时间继续减少', () => {
      const config = createConfig([
        { id: 1, name: '自由辩论', type: 'dual_debate', duration: 10, side: 'affirmative' }
      ]);
      const engine = new TimerEngine(config, () => {});
      engine.start();
      advanceTime(2000);
      expect(engine.remaining).toBeCloseTo(8, 1);

      engine.switchSide();
      expect(engine.activeSide).toBe('negative');
      expect(engine.isRunning).toBe(true);
      advanceTime(1000);
      expect(engine.remainingOpposite).toBeCloseTo(9, 1);
      expect(engine.remaining).toBeCloseTo(8, 1);
    });

    it('双方时间均耗尽后停止', () => {
      const config = createConfig([{ id: 1, name: '对辩', type: 'dual_debate', duration: 1, side: 'affirmative' }]);
      const engine = new TimerEngine(config, () => {});
      engine.start();
      advanceTime(1500);
      engine.start();
      advanceTime(1500);
      expect(engine.remaining).toBe(0);
      expect(engine.remainingOpposite).toBe(0);
      expect(engine.isRunning).toBe(false);
    });
  });

  describe('导入导出', () => {
    it('将配置 export 后再 import，数据保持一致', () => {
      const originalConfig = createConfig([
        { id: 1, name: '陈词', type: 'single_speech', duration: 180, side: 'affirmative' },
        { id: 2, name: '对辩', type: 'dual_debate', duration: 120, side: 'affirmative' }
      ]);
      const exported = JSON.stringify(originalConfig);
      const importedConfig = JSON.parse(exported);

      const engine1 = new TimerEngine(originalConfig, () => {});
      const engine2 = new TimerEngine(importedConfig, () => {});

      expect(engine2.segments).toEqual(engine1.segments);
      expect(engine2.currentIndex).toBe(engine1.currentIndex);
      expect(engine2.remaining).toBe(engine1.remaining);
      expect(engine2.remainingOpposite).toBe(engine1.remainingOpposite);
      expect(engine2.activeSide).toBe(engine1.activeSide);
    });
  });
});
