/**
 * 主题风格预设数据（浏览器端版本）
 * 从 js/main/theme-presets.js 移植，将 CommonJS 导出改为全局变量。
 */
(function () {
  'use strict';

  var DEFAULT_TOKENS = {
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

  window.__THEME_PRESETS__ = {
    classic: {
      label: '经典',
      dark: {
        colors: { affirmative: '#c0392b', negative: '#2980b9', title: '#3498db', text: '#ffffff', neutral: '#ffffff' },
        backgroundColor: '#1a1a1a',
        statusBar: {
          background: 'linear-gradient(90deg, rgba(231, 76, 60, 0.25) 0%, rgba(52, 152, 219, 0.25) 100%)',
          color: ''
        }
      },
      light: {
        colors: { affirmative: '#c0392b', negative: '#2980b9', title: '#2980b9', text: '#1a1d24', neutral: '#1a1d24' },
        backgroundColor: '#f5f6f8',
        statusBar: {
          background: 'linear-gradient(90deg, rgba(192, 57, 43, 0.12) 0%, rgba(41, 128, 185, 0.12) 100%)',
          color: ''
        }
      },
      tokens: Object.assign({}, DEFAULT_TOKENS)
    },
    broadcast: {
      label: '广播竞技',
      dark: {
        colors: { affirmative: '#e74c3c', negative: '#2563eb', title: '#5dade2', text: '#ffffff', neutral: '#ffffff' },
        backgroundColor: '#0b0e14',
        statusBar: {
          background: 'linear-gradient(90deg, rgba(231, 76, 60, 0.25) 0%, rgba(37, 99, 235, 0.25) 100%)',
          color: ''
        }
      },
      light: {
        colors: { affirmative: '#e74c3c', negative: '#2563eb', title: '#5dade2', text: '#1a1d24', neutral: '#1a1d24' },
        backgroundColor: '#f5f6f8',
        statusBar: {
          background: 'linear-gradient(90deg, rgba(231, 76, 60, 0.15) 0%, rgba(37, 99, 235, 0.15) 100%)',
          color: ''
        }
      },
      tokens: Object.assign({}, DEFAULT_TOKENS, {
        radius: '4px', progressHeight: '5px', progressStyle: 'solid',
        controlStyle: 'capsule', motionEnabled: false, statusBarStyle: 'block',
        fwDisplay: 900, fwTitle: 900, fwBody: 700, fwCap: 700, shadowLevel: 'light'
      })
    },
    restrained: {
      label: '专业克制',
      dark: {
        colors: { affirmative: '#e74c3c', negative: '#2563eb', title: '#e8ecf3', text: '#e8ecf3', neutral: '#8a90a0' },
        backgroundColor: '#1a1d24',
        statusBar: { background: 'transparent', color: '#4a4f5a' }
      },
      light: {
        colors: { affirmative: '#c43a2c', negative: '#1d4ed8', title: '#1a1d24', text: '#1a1d24', neutral: '#6b7280' },
        backgroundColor: '#f5f6f8',
        statusBar: { background: 'transparent', color: '#e3e6ec' }
      },
      tokens: Object.assign({}, DEFAULT_TOKENS, {
        radius: '2px', progressHeight: '2px', progressStyle: 'line',
        controlStyle: 'text', motionEnabled: false, statusBarStyle: 'line',
        fwDisplay: 500, fwTitle: 600, fwBody: 600, fwCap: 400, fsCap: '11px',
        capTransform: 'none', capSpacing: '1px', shadowLevel: 'none'
      })
    },
    vibrant: {
      label: '活力校园',
      dark: {
        colors: { affirmative: '#e74c3c', negative: '#2563eb', title: '#ffd93d', text: '#ffffff', neutral: '#ffffff' },
        backgroundColor: '#1a1d24',
        statusBar: { background: 'rgba(255, 255, 255, 0.08)', color: '' }
      },
      light: {
        colors: { affirmative: '#e74c3c', negative: '#2563eb', title: '#f59e0b', text: '#1a1d24', neutral: '#1a1d24' },
        backgroundColor: '#fff8f0',
        statusBar: { background: 'rgba(0, 0, 0, 0.05)', color: '' }
      },
      tokens: Object.assign({}, DEFAULT_TOKENS, {
        radius: '20px', progressHeight: '12px', progressStyle: 'gradient',
        controlStyle: 'round-icon', motionEnabled: true, statusBarStyle: 'pill',
        fwDisplay: 900, fwTitle: 800, fwBody: 700, fwCap: 600,
        capTransform: 'none', capSpacing: '1px', shadowLevel: 'layered'
      })
    }
  };
})();
