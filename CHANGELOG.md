# Changelog

## [3.0.0] - 2026-07-10

### BREAKING CHANGES
- 配置 schema 升级到 `version: 3`；旧配置需通过迁移向导/自动迁移转换，原配置已备份。
- `backgroundImageSettings.scale` 已移除，请使用 `scaleX` / `scaleY`。
- 正式移除 WinRAR SFX 导出支持，独立计时器仅支持 NSIS 安装包。

### Added
- 集成 electron-updater 自动更新
- 编辑页更新提示与更新日志展示
- 跨平台构建配置（macOS dmg/zip、Linux AppImage）
- GitHub Actions 自动发布

### Changed
- 版本号与 NSIS 安装包元数据统一使用 package.json 中的真实版本号
- 优化安装包体积：清理 vendor/nsis 非必需目录，进一步裁剪 Electron 运行时

### Removed
- 不再支持 WinRAR SFX 导出（已在 2.11.x 迁移到 NSIS）
- 3.0.0 不保证 100% 向下兼容 2.x 配置
