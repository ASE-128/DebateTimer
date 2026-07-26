import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import exportModule from '../js/main/export.js';

const {
  getTemplatesDirectory,
  ensureTemplatesDirectory,
  readCustomTemplates,
  saveTemplate,
  deleteTemplate,
  saveCustomTemplate,
  deleteCustomTemplate,
  getAllTemplates,
  getBuiltInTemplates
} = exportModule;

function makeTempDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'debate-timer-storage-'));
}

describe('模板存储与加载', () => {
  let tempDir;

  beforeEach(() => {
    tempDir = makeTempDir();
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
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

  it('saveCustomTemplate 将模板保存为 JSON 文件并返回 overwritten: false', () => {
    const config = { eventName: '存储测试', segments: [] };
    const result = saveCustomTemplate('我的模板', config, tempDir);

    expect(result.ok).toBe(true);
    expect(result.overwritten).toBe(false);
    expect(fs.existsSync(path.join(tempDir, 'templates', `${result.id}.json`))).toBe(true);
  });

  it('readCustomTemplates 读取所有 .json 模板文件', () => {
    const config = { eventName: '读取测试', segments: [] };
    saveCustomTemplate('模板一', config, tempDir);
    saveCustomTemplate('模板二', config, tempDir);

    const templates = readCustomTemplates(tempDir);
    expect(templates.length).toBe(2);
    expect(templates[0]).toHaveProperty('id');
    expect(templates[0]).toHaveProperty('name');
    expect(templates[0]).toHaveProperty('description');
    expect(templates[0]).toHaveProperty('builtin', false);
    expect(templates[0]).toHaveProperty('config');
  });

  it('saveCustomTemplate 覆盖同名模板并返回 overwritten: true', () => {
    const first = { eventName: '首次', segments: [] };
    saveCustomTemplate('同名模板', first, tempDir);

    const second = { eventName: '覆盖', segments: [] };
    const result = saveCustomTemplate('同名模板', second, tempDir);

    expect(result.overwritten).toBe(true);

    const templates = readCustomTemplates(tempDir);
    expect(templates.length).toBe(1);
    expect(templates[0].config.eventName).toBe('覆盖');
  });

  it('deleteCustomTemplate 删除对应模板文件', () => {
    const config = { eventName: '删除测试', segments: [] };
    saveCustomTemplate('将被删除', config, tempDir);

    let templates = readCustomTemplates(tempDir);
    expect(templates.length).toBe(1);

    const result = deleteCustomTemplate('将被删除', tempDir);
    expect(result.ok).toBe(true);

    templates = readCustomTemplates(tempDir);
    expect(templates.length).toBe(0);
  });

  it('getAllTemplates 合并内置模板与自定义模板为完整列表', () => {
    const config = { eventName: '合并测试', segments: [] };
    saveCustomTemplate('自定义一', config, tempDir);

    const all = getAllTemplates(tempDir);
    expect(Array.isArray(all)).toBe(true);

    const builtInCount = getBuiltInTemplates().length;
    expect(all.length).toBe(builtInCount + 1);

    const custom = all.filter((t) => t.builtin === false);
    expect(custom.length).toBe(1);
    expect(custom[0].name).toBe('自定义一');
  });

  it('非法字符在文件名中被安全处理', () => {
    const config = { eventName: '安全名称测试', segments: [] };
    const result = saveCustomTemplate('模板 / \\ : * ? " < > | 测试', config, tempDir);

    const templatesDir = path.join(tempDir, 'templates');
    const files = fs.readdirSync(templatesDir);
    expect(files.length).toBe(1);
    expect(files[0]).toBe(`${result.id}.json`);
    expect(files[0]).not.toContain('/');
    expect(files[0]).not.toContain('\\');
  });

  it('saveTemplate 使用空 id 返回错误', () => {
    const config = { eventName: '空 id 测试', segments: [] };
    expect(saveTemplate('', '名称', '', config, tempDir)).toEqual({
      ok: false,
      error: '模板 ID 不能为空'
    });
    expect(saveTemplate(null, '名称', '', config, tempDir)).toEqual({
      ok: false,
      error: '模板 ID 不能为空'
    });
  });

  it('保存同名覆盖文件后，内置模板标记 overridden 且 config 为覆盖值', () => {
    const builtIn = getBuiltInTemplates().find((t) => t.id === 'chinese-standard');
    expect(builtIn).toBeDefined();

    const overrideConfig = {
      ...builtIn.config,
      eventName: '覆盖后的标准赛'
    };
    const saveResult = saveTemplate(builtIn.id, builtIn.name, builtIn.description, overrideConfig, tempDir);
    expect(saveResult.ok).toBe(true);
    expect(saveResult.overwritten).toBe(false);

    const all = getAllTemplates(tempDir);
    const template = all.find((t) => t.id === builtIn.id);
    expect(template).toBeDefined();
    expect(template.builtin).toBe(true);
    expect(template.overridden).toBe(true);
    expect(template.config.eventName).toBe('覆盖后的标准赛');
  });

  it('删除覆盖文件后，内置模板恢复原始配置', () => {
    const builtIn = getBuiltInTemplates().find((t) => t.id === 'chinese-standard');
    expect(builtIn).toBeDefined();

    const overrideConfig = {
      ...builtIn.config,
      eventName: '临时的覆盖'
    };
    saveTemplate(builtIn.id, builtIn.name, builtIn.description, overrideConfig, tempDir);

    let all = getAllTemplates(tempDir);
    let template = all.find((t) => t.id === builtIn.id);
    expect(template.overridden).toBe(true);

    const deleteResult = deleteTemplate(builtIn.id, tempDir);
    expect(deleteResult.ok).toBe(true);
    expect(deleteResult.restored).toBe(true);

    all = getAllTemplates(tempDir);
    template = all.find((t) => t.id === builtIn.id);
    expect(template.builtin).toBe(true);
    expect(template.overridden).toBe(false);
    expect(template.config.eventName).toBe(builtIn.config.eventName);
  });
});
