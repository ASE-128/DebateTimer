import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import exportModule from '../js/main/export.js';

const {
  getTemplatesDirectory,
  ensureTemplatesDirectory,
  getCustomTemplatesDir,
  readCustomTemplates,
  saveTemplate,
  deleteTemplate,
  saveCustomTemplate,
  deleteCustomTemplate,
  getAllTemplates,
  getBuiltInTemplates
} = exportModule;

function makeTempDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'debate-timer-templates-'));
}

describe('自定义模板', () => {
  let tempDir;

  beforeEach(() => {
    tempDir = makeTempDir();
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('getCustomTemplatesDir 返回用户数据目录下的 templates 路径', () => {
    const dir = getCustomTemplatesDir(tempDir);
    expect(dir).toBe(path.join(tempDir, 'templates'));
  });

  it('getTemplatesDirectory 返回用户数据目录下的 templates 路径', () => {
    const dir = getTemplatesDirectory(tempDir);
    expect(dir).toBe(path.join(tempDir, 'templates'));
  });

  it('ensureTemplatesDirectory 确保 templates 目录存在', () => {
    expect(fs.existsSync(path.join(tempDir, 'templates'))).toBe(false);
    const dir = ensureTemplatesDirectory(tempDir);
    expect(fs.existsSync(dir)).toBe(true);
    expect(dir).toBe(path.join(tempDir, 'templates'));
  });

  it('readCustomTemplates 在目录不存在时创建并返回空数组', () => {
    const dir = getCustomTemplatesDir(tempDir);
    expect(fs.existsSync(dir)).toBe(false);
    const templates = readCustomTemplates(tempDir);
    expect(fs.existsSync(dir)).toBe(true);
    expect(templates).toEqual([]);
  });

  it('保存后可以通过 readCustomTemplates 读取自定义模板', () => {
    const config = { eventName: '测试赛事', segments: [] };
    const result = saveCustomTemplate('我的模板', config, tempDir);
    expect(result.ok).toBe(true);
    expect(typeof result.id).toBe('string');
    expect(result.overwritten).toBe(false);

    const templates = readCustomTemplates(tempDir);
    expect(templates.length).toBe(1);
    expect(templates[0].id).toBe(result.id);
    expect(templates[0].name).toBe('我的模板');
    expect(templates[0].builtin).toBe(false);
    expect(templates[0].config).toBeDefined();
    expect(templates[0].config.version).toBe(3);
  });

  it('保存同名模板会覆盖并返回 overwritten: true', () => {
    const config = { eventName: '首次保存', segments: [] };
    saveCustomTemplate('覆盖测试', config, tempDir);

    const updated = { eventName: '覆盖保存', segments: [] };
    const result = saveCustomTemplate('覆盖测试', updated, tempDir);
    expect(result.ok).toBe(true);
    expect(result.overwritten).toBe(true);

    const templates = readCustomTemplates(tempDir);
    expect(templates.length).toBe(1);
    expect(templates[0].config.eventName).toBe('覆盖保存');
  });

  it('自定义模板在重新实例化读取函数后仍然保留', () => {
    const config = { eventName: '持久化测试', segments: [] };
    saveCustomTemplate('持久模板', config, tempDir);

    const templates = readCustomTemplates(tempDir);
    expect(templates.length).toBe(1);
    expect(templates[0].name).toBe('持久模板');
    expect(templates[0].config.eventName).toBe('持久化测试');
  });

  it('deleteCustomTemplate 删除对应模板', () => {
    const config = { eventName: '删除测试', segments: [] };
    saveCustomTemplate('待删除', config, tempDir);

    let templates = readCustomTemplates(tempDir);
    expect(templates.length).toBe(1);

    const result = deleteCustomTemplate('待删除', tempDir);
    expect(result.ok).toBe(true);

    templates = readCustomTemplates(tempDir);
    expect(templates.length).toBe(0);
  });

  it('deleteCustomTemplate 可以通过 id 删除模板', () => {
    const config = { eventName: 'id 删除测试', segments: [] };
    const { id } = saveCustomTemplate('id删除', config, tempDir);

    let templates = readCustomTemplates(tempDir);
    expect(templates.length).toBe(1);

    const result = deleteCustomTemplate(id, tempDir);
    expect(result.ok).toBe(true);

    templates = readCustomTemplates(tempDir);
    expect(templates.length).toBe(0);
  });

  it('getAllTemplates 合并内置和自定义模板为单一数组', () => {
    const config = { eventName: '合并测试', segments: [] };
    saveCustomTemplate('合并模板', config, tempDir);

    const all = getAllTemplates(tempDir);
    expect(Array.isArray(all)).toBe(true);
    const builtInCount = getBuiltInTemplates().length;
    expect(all.length).toBe(builtInCount + 1);
    const custom = all.filter((t) => !t.builtin);
    expect(custom[0].name).toBe('合并模板');
    expect(custom[0].builtin).toBe(false);
  });
});

describe('saveTemplate / deleteTemplate CRUD', () => {
  let tempDir;

  beforeEach(() => {
    tempDir = makeTempDir();
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('可以保存并读取自定义模板', () => {
    const config = { eventName: 'CRUD 测试赛', segments: [] };
    const result = saveTemplate('crud-test', 'CRUD 模板', '测试描述', config, tempDir);
    expect(result.ok).toBe(true);
    expect(result.overwritten).toBe(false);

    const all = getAllTemplates(tempDir);
    const template = all.find((t) => t.id === 'crud-test');
    expect(template).toBeDefined();
    expect(template.name).toBe('CRUD 模板');
    expect(template.description).toBe('测试描述');
    expect(template.builtin).toBe(false);
    expect(template.overridden).toBe(false);
    expect(template.config.eventName).toBe('CRUD 测试赛');
  });

  it('覆盖同名自定义模板并返回 overwritten: true', () => {
    const config = { eventName: '首次', segments: [] };
    saveTemplate('override-test', '覆盖测试', '', config, tempDir);

    const updated = { eventName: '覆盖', segments: [] };
    const result = saveTemplate('override-test', '覆盖测试', '', updated, tempDir);
    expect(result.ok).toBe(true);
    expect(result.overwritten).toBe(true);

    const templates = readCustomTemplates(tempDir);
    expect(templates.length).toBe(1);
    expect(templates[0].config.eventName).toBe('覆盖');
  });

  it('deleteTemplate 删除自定义模板并返回 restored: false', () => {
    const config = { eventName: '删除测试', segments: [] };
    saveTemplate('delete-test', '待删除', '', config, tempDir);

    let templates = readCustomTemplates(tempDir);
    expect(templates.length).toBe(1);

    const result = deleteTemplate('delete-test', tempDir);
    expect(result.ok).toBe(true);
    expect(result.restored).toBe(false);

    templates = readCustomTemplates(tempDir);
    expect(templates.length).toBe(0);
  });

  it('删除不存在的非内置模板返回错误', () => {
    const result = deleteTemplate('not-exist', tempDir);
    expect(result.ok).toBe(false);
    expect(result.error).toBe('模板不存在');
  });

  it('删除不存在的内置模板返回 ok 且 restored: false', () => {
    const result = deleteTemplate('chinese-standard', tempDir);
    expect(result.ok).toBe(true);
    expect(result.restored).toBe(false);
  });
});
