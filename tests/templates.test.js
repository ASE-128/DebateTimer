import { describe, it, expect } from 'vitest';
import exportModule from '../js/main/export.js';

const { getBuiltInTemplates, validateConfig } = exportModule;
const VALID_SEGMENT_TYPES = ['none', 'single_speech', 'single_question', 'dual_debate', 'neutral_timer'];

describe('内置模板', () => {
  const templates = getBuiltInTemplates();

  it('至少返回 7 个模板', () => {
    expect(templates.length).toBeGreaterThanOrEqual(7);
  });

  it('包含 xinguobian、xinguobian-hs、wdc、chd 模板', () => {
    const ids = templates.map((t) => t.id);
    expect(ids).toContain('xinguobian');
    expect(ids).toContain('xinguobian-hs');
    expect(ids).toContain('wdc');
    expect(ids).toContain('chd');
  });

  it.each(templates)('$name 包含必要的模板字段', (template) => {
    expect(typeof template.id).toBe('string');
    expect(template.id.length).toBeGreaterThan(0);
    expect(typeof template.name).toBe('string');
    expect(template.name.length).toBeGreaterThan(0);
    expect(typeof template.description).toBe('string');
    expect(template.description.length).toBeGreaterThan(0);
    expect(template.builtin).toBe(true);
    expect(template.config).toBeDefined();
  });

  it.each(templates)('$name 的 config 为合法 version 3 配置', (template) => {
    const config = validateConfig(template.config);

    expect(config.version).toBe(3);
    expect(typeof config.eventName).toBe('string');
    expect(config.eventName.length).toBeGreaterThan(0);

    expect(config.teams).toBeDefined();
    expect(typeof config.teams.affirmative).toBe('string');
    expect(config.teams.affirmative.length).toBeGreaterThan(0);
    expect(typeof config.teams.negative).toBe('string');
    expect(config.teams.negative.length).toBeGreaterThan(0);

    expect(config.topics).toBeDefined();
    expect(typeof config.topics.affirmative).toBe('string');
    expect(typeof config.topics.negative).toBe('string');

    expect(Array.isArray(config.segments)).toBe(true);
    expect(config.segments.length).toBeGreaterThan(0);

    for (const segment of config.segments) {
      expect(VALID_SEGMENT_TYPES).toContain(segment.type);
      expect(typeof segment.name).toBe('string');
      expect(segment.name.length).toBeGreaterThan(0);
      expect(typeof segment.duration).toBe('number');
      expect(segment.duration).toBeGreaterThanOrEqual(0);
    }
  });

  it.each(templates)('$name 的 segment 名称体现持方或辩位', (template) => {
    const config = validateConfig(template.config);
    const sideKeywords = ['正方', '反方', '政府', '反对党', 'Proposition', 'Opposition', 'OG', 'OO', 'CG', 'CO'];
    for (const segment of config.segments) {
      if (segment.type === 'none' || segment.type === 'neutral_timer') continue;
      const hasKeyword = sideKeywords.some((kw) => segment.name.includes(kw));
      expect(hasKeyword, `segment "${segment.name}" 未体现持方或辩位`).toBe(true);
    }
  });

  it.each([
    { id: 'xinguobian', keywords: ['正方一辩', '反方四辩', '自由辩论'] },
    { id: 'xinguobian-hs', keywords: ['正方一辩', '反方四辩', '战术暂停'] },
    { id: 'wdc', keywords: ['正方一辩', '反方四辩', '自由辩论'] },
    { id: 'chd', keywords: ['正方一辩', '反方四辩', '自由辩论'] }
  ])('$id 新模板 config 合法且 segment 名称包含辩位/持方关键字', ({ id, keywords }) => {
    const template = templates.find((t) => t.id === id);
    expect(template).toBeDefined();
    const config = validateConfig(template.config);
    expect(config.version).toBe(3);
    expect(config.segments.length).toBeGreaterThan(0);
    const names = config.segments.map((s) => s.name).join('|');
    for (const keyword of keywords) {
      expect(names).toContain(keyword);
    }
  });
});
