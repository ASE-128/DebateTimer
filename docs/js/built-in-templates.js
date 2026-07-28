/**
 * 内置赛制模板（浏览器端版本）
 * 从 js/main/built-in-templates.js 移植，将 CommonJS 导出改为全局函数。
 */
(function () {
  'use strict';

  window.builtInTemplates = function builtInTemplates(getDefaultConfig) {
    var defaultConfig = getDefaultConfig();

    return [
      {
        id: 'chinese-standard',
        name: '华语辩论标准赛制',
        description: '常见的华语辩论赛制，包含陈词、攻辩、自由辩论与总结陈词。',
        builtin: true,
        config: Object.assign({}, defaultConfig, {
          eventName: '华语辩论标准赛',
          teams: { affirmative: '正方', negative: '反方' },
          topics: { affirmative: '正方辩题', negative: '反方辩题' },
          segments: [
            { id: 1, name: '开场', type: 'none', duration: 0 },
            { id: 2, name: '正方一辩·开篇陈词', type: 'single_speech', duration: 180, side: 'affirmative' },
            { id: 3, name: '反方一辩·开篇陈词', type: 'single_speech', duration: 180, side: 'negative' },
            { id: 4, name: '正方二辩·攻辩', type: 'single_question', duration: 120, side: 'affirmative' },
            { id: 5, name: '反方二辩·攻辩', type: 'single_question', duration: 120, side: 'negative' },
            { id: 6, name: '自由辩论·正方先开始', type: 'dual_debate', duration: 240, side: 'affirmative' },
            { id: 7, name: '反方四辩·总结陈词', type: 'single_speech', duration: 180, side: 'negative' },
            { id: 8, name: '正方四辩·总结陈词', type: 'single_speech', duration: 180, side: 'affirmative' }
          ]
        })
      },
      {
        id: 'bp',
        name: 'BP 赛制',
        description: '英国议会制（BP）两队伍模拟模板，通过环节名称体现 OG/OO/CG/CO 辩位。',
        builtin: true,
        config: Object.assign({}, defaultConfig, {
          eventName: 'BP 制辩论赛',
          teams: { affirmative: '政府方', negative: '反对方' },
          topics: { affirmative: '政府方辩题', negative: '反对方辩题' },
          segments: [
            { id: 1, name: '上院首相 (OG)', type: 'single_speech', duration: 420, side: 'affirmative' },
            { id: 2, name: '上院领袖 (OO)', type: 'single_speech', duration: 420, side: 'negative' },
            { id: 3, name: '上院副首相 (OG)', type: 'single_speech', duration: 420, side: 'affirmative' },
            { id: 4, name: '上院副领袖 (OO)', type: 'single_speech', duration: 420, side: 'negative' },
            { id: 5, name: '下院成员 (CG)', type: 'single_speech', duration: 420, side: 'affirmative' },
            { id: 6, name: '下院成员 (CO)', type: 'single_speech', duration: 420, side: 'negative' },
            { id: 7, name: '下院党鞭 (CG)', type: 'single_speech', duration: 420, side: 'affirmative' },
            { id: 8, name: '下院党鞭 (CO)', type: 'single_speech', duration: 420, side: 'negative' }
          ]
        })
      },
      {
        id: 'parliamentary',
        name: '议会制赛制',
        description: '议会制辩论模板，包含首相、副首相、成员、党鞭及政府总结环节。',
        builtin: true,
        config: Object.assign({}, defaultConfig, {
          eventName: '议会制辩论赛',
          teams: { affirmative: '政府', negative: '反对党' },
          topics: { affirmative: '政府辩题', negative: '反对党辩题' },
          segments: [
            { id: 1, name: '开场', type: 'none', duration: 0 },
            { id: 2, name: '政府·首相陈词', type: 'single_speech', duration: 420, side: 'affirmative' },
            { id: 3, name: '反对党领袖陈词', type: 'single_speech', duration: 420, side: 'negative' },
            { id: 4, name: '副首相/政府阁员陈词', type: 'single_speech', duration: 420, side: 'affirmative' },
            { id: 5, name: '反对党阁员陈词', type: 'single_speech', duration: 420, side: 'negative' },
            { id: 6, name: '政府成员陈词', type: 'single_speech', duration: 420, side: 'affirmative' },
            { id: 7, name: '反对党成员陈词', type: 'single_speech', duration: 420, side: 'negative' },
            { id: 8, name: '政府党鞭陈词', type: 'single_speech', duration: 420, side: 'affirmative' },
            { id: 9, name: '反对党党鞭陈词', type: 'single_speech', duration: 420, side: 'negative' },
            { id: 10, name: '政府总结陈词', type: 'single_speech', duration: 300, side: 'affirmative' }
          ]
        })
      },
      {
        id: 'xinguobian',
        name: '新国辩（国际华语辩论邀请赛）',
        description: '17 分钟共同计时赛制：陈词1/2、质询、小结、自由辩论、总结陈词。',
        builtin: true,
        config: Object.assign({}, defaultConfig, {
          eventName: '新国辩',
          teams: { affirmative: '正方', negative: '反方' },
          topics: { affirmative: '正方辩题', negative: '反方辩题' },
          segments: [
            { id: 1, name: '开场', type: 'none', duration: 0 },
            { id: 2, name: '正方一辩·陈词1', type: 'single_speech', duration: 210, side: 'affirmative' },
            { id: 3, name: '反方四辩·质询正方一辩', type: 'single_question', duration: 90, side: 'negative' },
            { id: 4, name: '反方一辩·陈词1', type: 'single_speech', duration: 210, side: 'negative' },
            { id: 5, name: '正方四辩·质询反方一辩', type: 'single_question', duration: 90, side: 'affirmative' },
            { id: 6, name: '正方二辩·陈词2', type: 'single_speech', duration: 180, side: 'affirmative' },
            { id: 7, name: '反方三辩·质询正方二辩', type: 'single_question', duration: 90, side: 'negative' },
            { id: 8, name: '反方二辩·陈词2', type: 'single_speech', duration: 180, side: 'negative' },
            { id: 9, name: '正方三辩·质询反方二辩', type: 'single_question', duration: 90, side: 'affirmative' },
            { id: 10, name: '反方三辩·质询小结', type: 'single_speech', duration: 90, side: 'negative' },
            { id: 11, name: '正方三辩·质询小结', type: 'single_speech', duration: 90, side: 'affirmative' },
            { id: 12, name: '自由辩论·正方先开始', type: 'dual_debate', duration: 240, side: 'affirmative' },
            { id: 13, name: '反方四辩·总结陈词', type: 'single_speech', duration: 210, side: 'negative' },
            { id: 14, name: '正方四辩·总结陈词', type: 'single_speech', duration: 210, side: 'affirmative' }
          ]
        })
      },
      {
        id: 'wdc',
        name: '华语辩论世界杯',
        description: '黄金联赛赛制：立论、质询、小结、对辩、盘问、自由辩论、总结陈词。',
        builtin: true,
        config: Object.assign({}, defaultConfig, {
          eventName: '华语辩论世界杯',
          teams: { affirmative: '正方', negative: '反方' },
          topics: { affirmative: '正方辩题', negative: '反方辩题' },
          segments: [
            { id: 1, name: '开场', type: 'none', duration: 0 },
            { id: 2, name: '正方一辩·立论陈词', type: 'single_speech', duration: 210, side: 'affirmative' },
            { id: 3, name: '反方二辩·质询正方一辩', type: 'single_question', duration: 120, side: 'negative' },
            { id: 4, name: '反方一辩·立论陈词', type: 'single_speech', duration: 210, side: 'negative' },
            { id: 5, name: '正方二辩·质询反方一辩', type: 'single_question', duration: 120, side: 'affirmative' },
            { id: 6, name: '反方二辩·质询小结', type: 'single_speech', duration: 90, side: 'negative' },
            { id: 7, name: '正方二辩·质询小结', type: 'single_speech', duration: 90, side: 'affirmative' },
            { id: 8, name: '正方四辩·对辩反方四辩', type: 'dual_debate', duration: 90, side: 'affirmative' },
            { id: 9, name: '正方三辩·盘问', type: 'single_question', duration: 90, side: 'affirmative' },
            { id: 10, name: '反方三辩·盘问', type: 'single_question', duration: 90, side: 'negative' },
            { id: 11, name: '正方三辩·盘问小结', type: 'single_speech', duration: 90, side: 'affirmative' },
            { id: 12, name: '反方三辩·盘问小结', type: 'single_speech', duration: 90, side: 'negative' },
            { id: 13, name: '自由辩论·正方先开始', type: 'dual_debate', duration: 240, side: 'affirmative' },
            { id: 14, name: '反方四辩·总结陈词', type: 'single_speech', duration: 210, side: 'negative' },
            { id: 15, name: '正方四辩·总结陈词', type: 'single_speech', duration: 210, side: 'affirmative' }
          ]
        })
      },
      {
        id: 'chd',
        name: 'CHD 全国中学生辩论联赛',
        description: 'CHD 官方四人制赛制：立论、首质、申论、对辩、战术指导、质询、小结、自由辩论、总结陈词。',
        builtin: true,
        config: Object.assign({}, defaultConfig, {
          eventName: 'CHD 全国中学生辩论联赛',
          teams: { affirmative: '正方', negative: '反方' },
          topics: { affirmative: '正方辩题', negative: '反方辩题' },
          segments: [
            { id: 1, name: '开场', type: 'none', duration: 0 },
            { id: 2, name: '正方一辩·立论陈词', type: 'single_speech', duration: 210, side: 'affirmative' },
            { id: 3, name: '反方一辩·立论陈词', type: 'single_speech', duration: 210, side: 'negative' },
            { id: 4, name: '反方四辩·首质正方一辩', type: 'single_question', duration: 90, side: 'negative' },
            { id: 5, name: '正方四辩·首质反方一辩', type: 'single_question', duration: 90, side: 'affirmative' },
            { id: 6, name: '正方二辩·申论', type: 'single_speech', duration: 120, side: 'affirmative' },
            { id: 7, name: '反方二辩·申论', type: 'single_speech', duration: 120, side: 'negative' },
            { id: 8, name: '正方二辩·对辩反方二辩', type: 'dual_debate', duration: 90, side: 'affirmative' },
            { id: 9, name: '战术指导（暂停）', type: 'neutral_timer', duration: 240 },
            { id: 10, name: '正方三辩·质询', type: 'single_question', duration: 120, side: 'affirmative' },
            { id: 11, name: '反方三辩·质询', type: 'single_question', duration: 120, side: 'negative' },
            { id: 12, name: '正方三辩·质询小结', type: 'single_speech', duration: 150, side: 'affirmative' },
            { id: 13, name: '反方三辩·质询小结', type: 'single_speech', duration: 150, side: 'negative' },
            { id: 14, name: '自由辩论·正方先开始', type: 'dual_debate', duration: 180, side: 'affirmative' },
            { id: 15, name: '反方四辩·总结陈词', type: 'single_speech', duration: 210, side: 'negative' },
            { id: 16, name: '正方四辩·总结陈词', type: 'single_speech', duration: 210, side: 'affirmative' }
          ]
        })
      },
      {
        id: 'xinguobian-hs',
        name: '新国辩·高中组',
        description: '新国辩高中组赛制：立论、战术暂停、首质、回应、申论、质询、小结、对辩、总结陈词。',
        builtin: true,
        config: Object.assign({}, defaultConfig, {
          eventName: '新国辩·高中组',
          teams: { affirmative: '正方', negative: '反方' },
          topics: { affirmative: '正方辩题', negative: '反方辩题' },
          segments: [
            { id: 1, name: '开场', type: 'none', duration: 0 },
            { id: 2, name: '正方一辩·陈词一', type: 'single_speech', duration: 180, side: 'affirmative' },
            { id: 3, name: '反方一辩·陈词一', type: 'single_speech', duration: 180, side: 'negative' },
            { id: 4, name: '战术暂停一', type: 'neutral_timer', duration: 180 },
            { id: 5, name: '反方四辩·首质正方一辩', type: 'single_question', duration: 90, side: 'negative' },
            { id: 6, name: '正方一辩·回应', type: 'single_speech', duration: 60, side: 'affirmative' },
            { id: 7, name: '正方四辩·首质反方一辩', type: 'single_question', duration: 90, side: 'affirmative' },
            { id: 8, name: '反方一辩·回应', type: 'single_speech', duration: 60, side: 'negative' },
            { id: 9, name: '评委第一轮投票', type: 'none', duration: 0 },
            { id: 10, name: '正方二辩·陈词二', type: 'single_speech', duration: 180, side: 'affirmative' },
            { id: 11, name: '反方三辩·质询正方二辩', type: 'single_question', duration: 120, side: 'negative' },
            { id: 12, name: '正方二辩·回应', type: 'single_speech', duration: 60, side: 'affirmative' },
            { id: 13, name: '反方二辩·陈词二', type: 'single_speech', duration: 180, side: 'negative' },
            { id: 14, name: '正方三辩·质询反方二辩', type: 'single_question', duration: 120, side: 'affirmative' },
            { id: 15, name: '反方二辩·回应', type: 'single_speech', duration: 60, side: 'negative' },
            { id: 16, name: '评委第二轮投票', type: 'none', duration: 0 },
            { id: 17, name: '战术暂停二', type: 'neutral_timer', duration: 180 },
            { id: 18, name: '反方三辩·质询小结', type: 'single_speech', duration: 150, side: 'negative' },
            { id: 19, name: '正方三辩·质询小结', type: 'single_speech', duration: 150, side: 'affirmative' },
            { id: 20, name: '正方一辩·对辩反方一辩', type: 'dual_debate', duration: 90, side: 'affirmative' },
            { id: 21, name: '评委第三轮投票', type: 'none', duration: 0 },
            { id: 22, name: '反方四辩·总结陈词', type: 'single_speech', duration: 210, side: 'negative' },
            { id: 23, name: '正方四辩·总结陈词', type: 'single_speech', duration: 210, side: 'affirmative' },
            { id: 24, name: '评委第四轮投票', type: 'none', duration: 0 }
          ]
        })
      }
    ];
  };
})();
