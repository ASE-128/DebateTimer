import { describe, it, expect } from 'vitest';
import exportModule from '../js/main/export.js';

const { defaultConfig, validateConfig, validateConfigWithWarnings, parseConfig } = exportModule;

describe('配置校验与警告', () => {
  it('缺失字段时使用默认值并生成 warning', () => {
    const { config, warnings } = validateConfigWithWarnings({});
    const def = defaultConfig();

    expect(config.eventName).toBe(def.eventName);
    expect(config.teams).toEqual(def.teams);
    expect(config.topics).toEqual(def.topics);
    expect(config.segments).toEqual(def.segments);

    expect(warnings).toContain('缺少 eventName，已使用默认赛事名称');
    expect(warnings).toContain('缺少 teams，已使用默认队伍名称');
    expect(warnings).toContain('缺少 topics，已使用默认辩题');
    expect(warnings).toContain('缺少 segments，已使用默认环节列表');
  });

  it('非法 segment type 回退为 none 并生成 warning', () => {
    const input = {
      eventName: '测试赛',
      teams: { affirmative: '正方', negative: '反方' },
      topics: { affirmative: '正', negative: '反' },
      segments: [{ id: 1, name: '坏环节', type: 'unknown_type', duration: 10, side: 'affirmative' }]
    };
    const { config, warnings } = validateConfigWithWarnings(input);

    expect(config.segments[0].type).toBe('none');
    expect(warnings).toContain('第 1 个环节 type 非法，已重置为 none');
  });

  it('非法或负 segment duration 回退为 0 并生成 warning', () => {
    const input = {
      eventName: '测试赛',
      teams: { affirmative: '正方', negative: '反方' },
      topics: { affirmative: '正', negative: '反' },
      segments: [
        { id: 1, name: '负时长', type: 'single_speech', duration: -10, side: 'affirmative' },
        { id: 2, name: '非法时长', type: 'single_speech', duration: 'abc', side: 'affirmative' }
      ]
    };
    const { config, warnings } = validateConfigWithWarnings(input);

    expect(config.segments[0].duration).toBe(0);
    expect(config.segments[1].duration).toBe(0);
    expect(warnings).toContain('第 1 个环节 duration 非法，已重置为 0');
    expect(warnings).toContain('第 2 个环节 duration 非法，已重置为 0');
  });

  it('非法 segment side 回退为空并生成 warning', () => {
    const input = {
      eventName: '测试赛',
      teams: { affirmative: '正方', negative: '反方' },
      topics: { affirmative: '正', negative: '反' },
      segments: [
        { id: 1, name: '坏 side', type: 'single_speech', duration: 10, side: 'neutral' },
        { id: 2, name: '空 side', type: 'single_speech', duration: 10, side: '' }
      ]
    };
    const { config, warnings } = validateConfigWithWarnings(input);

    expect(config.segments[0].side).toBe('');
    expect(config.segments[1].side).toBe('');
    expect(warnings).toContain('第 1 个环节 side 非法，已重置为空');
    expect(warnings).not.toContain('第 2 个环节 side 非法，已重置为空');
  });

  it('合法 segment 各字段保持原值且无 warning', () => {
    const input = {
      eventName: '测试赛',
      teams: { affirmative: '正方', negative: '反方' },
      topics: { affirmative: '正', negative: '反' },
      segments: [
        { id: 1, name: '开场', type: 'none', duration: 0 },
        { id: 2, name: '正方陈词', type: 'single_speech', duration: 180, side: 'affirmative' },
        { id: 3, name: '反方陈词', type: 'single_speech', duration: 180, side: 'negative' },
        { id: 4, name: '质询', type: 'single_question', duration: 120, side: '' },
        { id: 5, name: '自由辩论', type: 'dual_debate', duration: 240, side: 'affirmative' },
        { id: 6, name: '中场休息', type: 'neutral_timer', duration: 60 }
      ]
    };
    const { config, warnings } = validateConfigWithWarnings(input);

    expect(config.segments.length).toBe(input.segments.length);
    for (let i = 0; i < input.segments.length; i++) {
      expect(config.segments[i].type).toBe(input.segments[i].type);
      expect(config.segments[i].duration).toBe(input.segments[i].duration);
      expect(config.segments[i].side).toBe(input.segments[i].side ?? '');
    }
    expect(warnings).toEqual([]);
  });

  it('parseConfig 返回 { config, warnings } 且合法 JSON 无警告', () => {
    const input = {
      eventName: 'JSON 测试赛',
      teams: { affirmative: '正方', negative: '反方' },
      topics: { affirmative: '正', negative: '反' },
      segments: [{ id: 1, name: '陈词', type: 'single_speech', duration: 180, side: 'affirmative' }]
    };
    const { config, warnings } = parseConfig(JSON.stringify(input), 'config.json');
    expect(config.eventName).toBe('JSON 测试赛');
    expect(config.segments[0].type).toBe('single_speech');
    expect(warnings).toEqual([]);
  });

  it('parseConfig 对非法字段返回 warnings', () => {
    const input = {
      segments: [{ id: 1, name: '坏环节', type: 'bad', duration: -5, side: 'bad_side' }]
    };
    const { config, warnings } = parseConfig(JSON.stringify(input), 'config.json');
    expect(config.segments[0].type).toBe('none');
    expect(config.segments[0].duration).toBe(0);
    expect(config.segments[0].side).toBe('');
    expect(warnings.length).toBeGreaterThan(0);
    expect(warnings.some((w) => w.includes('type 非法'))).toBe(true);
    expect(warnings.some((w) => w.includes('duration 非法'))).toBe(true);
    expect(warnings.some((w) => w.includes('side 非法'))).toBe(true);
  });

  it('validateConfig 保留 schedule 数组并填充缺失字段', () => {
    const input = {
      eventName: '测试赛',
      teams: { affirmative: '正方', negative: '反方' },
      topics: { affirmative: '正', negative: '反' },
      segments: [],
      schedule: [
        {
          id: 'match-1',
          name: '初赛',
          affirmativeTeam: 'A队',
          negativeTeam: 'B队',
          affirmativeTopic: '正方辩题',
          negativeTopic: '反方辩题'
        },
        {
          name: '复赛',
          affirmativeTeam: 'C队'
        }
      ]
    };
    const config = validateConfig(input);

    expect(config.schedule).toHaveLength(2);
    expect(config.schedule[0]).toEqual({
      id: 'match-1',
      name: '初赛',
      affirmativeTeam: 'A队',
      negativeTeam: 'B队',
      affirmativeTopic: '正方辩题',
      negativeTopic: '反方辩题',
      affirmativeLogo: '',
      negativeLogo: ''
    });
    expect(config.schedule[1]).toEqual({
      id: 'schedule-2',
      name: '复赛',
      affirmativeTeam: 'C队',
      negativeTeam: '',
      affirmativeTopic: '',
      negativeTopic: '',
      affirmativeLogo: '',
      negativeLogo: ''
    });
  });

  it('validateConfig 对非数组 schedule 返回空数组', () => {
    const input = {
      eventName: '测试赛',
      teams: { affirmative: '正方', negative: '反方' },
      topics: { affirmative: '正', negative: '反' },
      segments: [],
      schedule: 'not-an-array'
    };
    const config = validateConfig(input);
    expect(config.schedule).toEqual([]);
  });

  it('validateConfigWithWarnings 对非数组 schedule 生成警告', () => {
    const input = {
      eventName: '测试赛',
      teams: { affirmative: '正方', negative: '反方' },
      topics: { affirmative: '正', negative: '反' },
      segments: [],
      schedule: { invalid: true }
    };
    const { config, warnings } = validateConfigWithWarnings(input);
    expect(config.schedule).toEqual([]);
    expect(warnings).toContain('schedule 字段不是数组，已重置为空数组');
  });

  it('validateConfig 默认 logos 为空字符串', () => {
    const config = validateConfig({});
    expect(config.logos).toEqual({ affirmative: '', negative: '' });
  });

  it('validateConfig 保留输入的 logos', () => {
    const input = {
      logos: { affirmative: 'data:image/png;base64,abc', negative: 'path/to/neg.png' }
    };
    const config = validateConfig(input);
    expect(config.logos).toEqual({
      affirmative: 'data:image/png;base64,abc',
      negative: 'path/to/neg.png'
    });
  });

  it('validateConfig schedule 项包含 affirmativeLogo / negativeLogo', () => {
    const input = {
      schedule: [{ affirmativeLogo: 'aff-logo', negativeLogo: 'neg-logo' }]
    };
    const config = validateConfig(input);
    expect(config.schedule[0].affirmativeLogo).toBe('aff-logo');
    expect(config.schedule[0].negativeLogo).toBe('neg-logo');
  });
});
