'use strict';

/**
 * 主题风格预设数据模块
 *
 * 提供 4 个风格方向：classic（经典，与历史默认一致）、broadcast（广播竞技）、
 * restrained（专业克制）、vibrant（活力校园）。每个预设含 dark/light 两个色彩变体
 * 与一组形态 token。CSS 侧通过在 .timer-shell / #timerPreview 上设置
 * data-preset-active="<preset>" 属性触发对应覆盖规则；classic 不触发任何覆盖，
 * 因此经典风格渲染与历史完全一致。
 */

const VALID_PRESETS = ['classic', 'broadcast', 'restrained', 'vibrant'];
const VALID_COLOR_MODES = ['dark', 'light'];

const DEFAULT_TOKENS = {
  radius: '16px',
  progressHeight: '4px',
  progressStyle: 'solid',
  controlStyle: 'default',
  motionEnabled: true,
  statusBarStyle: 'block',
  fwDisplay: 700,
  fwTitle: 900,
  fwBody: 700,
  fwCap: 600,
  fsCap: '11px',
  capTransform: 'uppercase',
  capSpacing: '2px',
  shadowLevel: 'default',
  timerFontFamily: "'JetBrains Mono', 'SF Mono', 'Courier New', Consolas, monospace"
};

const THEME_PRESETS = {
  // 经典：与 defaultConfig 历史值完全一致，不触发任何 CSS 覆盖
  classic: {
    label: '经典',
    dark: {
      colors: {
        affirmative: '#c0392b',
        negative: '#2980b9',
        title: '#3498db',
        text: '#ffffff',
        neutral: '#ffffff'
      },
      backgroundColor: '#1a1a1a',
      statusBar: {
        background: 'linear-gradient(90deg, rgba(231, 76, 60, 0.25) 0%, rgba(52, 152, 219, 0.25) 100%)',
        color: ''
      }
    },
    light: {
      colors: {
        affirmative: '#c0392b',
        negative: '#2980b9',
        title: '#2980b9',
        text: '#1a1d24',
        neutral: '#1a1d24'
      },
      backgroundColor: '#f5f6f8',
      statusBar: {
        background: 'linear-gradient(90deg, rgba(192, 57, 43, 0.12) 0%, rgba(41, 128, 185, 0.12) 100%)',
        color: ''
      }
    },
    tokens: { ...DEFAULT_TOKENS }
  },

  // 广播竞技风：锐利、克制、电竞转播图形语言
  broadcast: {
    label: '广播竞技',
    dark: {
      colors: {
        affirmative: '#e74c3c',
        negative: '#2563eb',
        title: '#5dade2',
        text: '#ffffff',
        neutral: '#ffffff'
      },
      backgroundColor: '#0b0e14',
      statusBar: {
        background: 'linear-gradient(90deg, rgba(231, 76, 60, 0.25) 0%, rgba(37, 99, 235, 0.25) 100%)',
        color: ''
      }
    },
    light: {
      colors: {
        affirmative: '#e74c3c',
        negative: '#2563eb',
        title: '#5dade2',
        text: '#1a1d24',
        neutral: '#1a1d24'
      },
      backgroundColor: '#f5f6f8',
      statusBar: {
        background: 'linear-gradient(90deg, rgba(231, 76, 60, 0.15) 0%, rgba(37, 99, 235, 0.15) 100%)',
        color: ''
      }
    },
    tokens: {
      ...DEFAULT_TOKENS,
      radius: '4px',
      progressHeight: '5px',
      progressStyle: 'solid',
      controlStyle: 'capsule',
      motionEnabled: false,
      statusBarStyle: 'block',
      fwDisplay: 900,
      fwTitle: 900,
      fwBody: 700,
      fwCap: 700,
      shadowLevel: 'light'
    }
  },

  // 专业克制风：学术辩论、AV 控台、细线分隔、无动效
  restrained: {
    label: '专业克制',
    dark: {
      colors: {
        affirmative: '#e74c3c',
        negative: '#2563eb',
        title: '#e8ecf3',
        text: '#e8ecf3',
        neutral: '#8a90a0'
      },
      backgroundColor: '#1a1d24',
      statusBar: {
        background: 'transparent',
        color: '#4a4f5a'
      }
    },
    light: {
      colors: {
        affirmative: '#c43a2c',
        negative: '#1d4ed8',
        title: '#1a1d24',
        text: '#1a1d24',
        neutral: '#6b7280'
      },
      backgroundColor: '#f5f6f8',
      statusBar: {
        background: 'transparent',
        color: '#e3e6ec'
      }
    },
    tokens: {
      ...DEFAULT_TOKENS,
      radius: '2px',
      progressHeight: '2px',
      progressStyle: 'line',
      controlStyle: 'text',
      motionEnabled: false,
      statusBarStyle: 'line',
      fwDisplay: 500,
      fwTitle: 600,
      fwBody: 600,
      fwCap: 400,
      capTransform: 'none',
      capSpacing: '1px',
      shadowLevel: 'none'
    }
  },

  // 活力校园风：明快对比、大圆角、圆润几何、明显动效
  vibrant: {
    label: '活力校园',
    dark: {
      colors: {
        affirmative: '#e74c3c',
        negative: '#2563eb',
        title: '#ffd93d',
        text: '#ffffff',
        neutral: '#ffffff'
      },
      backgroundColor: '#1a1d24',
      statusBar: {
        background: 'rgba(255, 255, 255, 0.08)',
        color: ''
      }
    },
    light: {
      colors: {
        affirmative: '#e74c3c',
        negative: '#2563eb',
        title: '#f59e0b',
        text: '#1a1d24',
        neutral: '#1a1d24'
      },
      backgroundColor: '#fff8f0',
      statusBar: {
        background: 'rgba(0, 0, 0, 0.05)',
        color: ''
      }
    },
    tokens: {
      ...DEFAULT_TOKENS,
      radius: '20px',
      progressHeight: '12px',
      progressStyle: 'gradient',
      controlStyle: 'round-icon',
      motionEnabled: true,
      statusBarStyle: 'pill',
      fwDisplay: 900,
      fwTitle: 800,
      fwBody: 700,
      fwCap: 600,
      capTransform: 'none',
      capSpacing: '1px',
      shadowLevel: 'layered'
    }
  }
};

/**
 * 根据预设名和色彩模式返回解析后的主题覆盖值。
 * 返回 { colors, backgroundColor, statusBar, tokens }；preset 非法时回退 classic。
 * 不包含 backgroundType / backgroundImage / fontFamily 等用户自定义字段。
 */
function resolvePreset(preset, colorMode) {
  const key = VALID_PRESETS.includes(preset) ? preset : 'classic';
  const mode = VALID_COLOR_MODES.includes(colorMode) ? colorMode : 'dark';
  const p = THEME_PRESETS[key];
  const variant = p[mode];
  return {
    colors: { ...variant.colors },
    backgroundColor: variant.backgroundColor,
    statusBar: { ...variant.statusBar },
    tokens: { ...p.tokens }
  };
}

module.exports = {
  THEME_PRESETS,
  VALID_PRESETS,
  VALID_COLOR_MODES,
  DEFAULT_TOKENS,
  resolvePreset
};
