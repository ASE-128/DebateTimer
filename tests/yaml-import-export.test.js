import { describe, it, expect } from 'vitest';
import exportModule from '../js/main/export.js';

const { defaultConfig, validateConfig, serializeConfig, parseConfig } = exportModule;

function makeSampleConfig() {
  const config = defaultConfig();
  config.eventName = 'YAML 导入导出测试赛';
  config.teams.affirmative = '正方队伍';
  config.teams.negative = '反方队伍';
  config.topics.affirmative = '人工智能利大于弊';
  config.topics.negative = '人工智能弊大于利';
  config.theme.backgroundColor = '#2c3e50';
  config.segments = [
    { id: 1, name: '开场', type: 'none', duration: 0 },
    { id: 2, name: '正方一辩', type: 'single_speech', duration: 180, side: 'affirmative' },
    { id: 3, name: '反方一辩', type: 'single_speech', duration: 180, side: 'negative' }
  ];
  config.logos = {
    affirmative: 'data:image/png;base64,affirmative-logo',
    negative: 'data:image/png;base64,negative-logo'
  };
  config.schedule = [
    {
      id: 'round-1',
      name: '初赛第一场',
      affirmativeTeam: '甲队',
      negativeTeam: '乙队',
      affirmativeTopic: '人工智能利大于弊',
      negativeTopic: '人工智能弊大于利',
      affirmativeLogo: 'data:image/png;base64,aff-match-logo',
      negativeLogo: 'data:image/png;base64,neg-match-logo'
    }
  ];
  return config;
}

describe('配置 JSON/YAML 序列化与反序列化', () => {
  it('JSON 文件往返保持配置一致', () => {
    const config = validateConfig(makeSampleConfig());
    const serialized = serializeConfig(config, 'config.json');
    const { config: parsed, warnings } = parseConfig(serialized, 'config.json');
    expect(warnings).toEqual([]);
    const validated = validateConfig(parsed);
    expect(validated).toEqual(config);
  });

  it('YAML 文件（.yaml）往返保持配置一致', () => {
    const config = validateConfig(makeSampleConfig());
    const serialized = serializeConfig(config, 'config.yaml');
    expect(serialized).toContain('eventName:');
    const { config: parsed, warnings } = parseConfig(serialized, 'config.yaml');
    expect(warnings).toEqual([]);
    const validated = validateConfig(parsed);
    expect(validated).toEqual(config);
  });

  it('YAML 文件（.yml）往返保持配置一致', () => {
    const config = validateConfig(makeSampleConfig());
    const serialized = serializeConfig(config, 'config.yml');
    expect(serialized).toContain('teams:');
    const { config: parsed, warnings } = parseConfig(serialized, 'config.yml');
    expect(warnings).toEqual([]);
    const validated = validateConfig(parsed);
    expect(validated).toEqual(config);
  });

  it('YAML 大写扩展名也能正确识别', () => {
    const config = validateConfig(makeSampleConfig());
    const serialized = serializeConfig(config, 'config.YAML');
    const { config: parsed, warnings } = parseConfig(serialized, 'config.YAML');
    expect(warnings).toEqual([]);
    const validated = validateConfig(parsed);
    expect(validated).toEqual(config);
  });

  it('非法 YAML 抛出明确的 YAML 解析错误', () => {
    expect(() => parseConfig('eventName: "未闭合', 'broken.yaml')).toThrow('YAML 解析失败');
  });

  it('非法 JSON 抛出明确的 JSON 解析错误', () => {
    expect(() => parseConfig('{ invalid json }', 'broken.json')).toThrow('JSON 解析失败');
  });

  it('schedule 数组在 YAML 往返后不被丢失', () => {
    const config = validateConfig(makeSampleConfig());
    const serialized = serializeConfig(config, 'config.yaml');
    const { config: parsed, warnings } = parseConfig(serialized, 'config.yaml');
    expect(warnings).toEqual([]);
    expect(parsed.schedule).toEqual(config.schedule);
  });

  it('logos 与 schedule logo 在 YAML 往返后不被丢失', () => {
    const config = validateConfig(makeSampleConfig());
    const serialized = serializeConfig(config, 'config.yaml');
    const { config: parsed, warnings } = parseConfig(serialized, 'config.yaml');
    expect(warnings).toEqual([]);
    expect(parsed.logos).toEqual(config.logos);
    expect(parsed.schedule[0].affirmativeLogo).toBe(config.schedule[0].affirmativeLogo);
    expect(parsed.schedule[0].negativeLogo).toBe(config.schedule[0].negativeLogo);
  });
});
