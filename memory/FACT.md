# User Preferences & Feedback

## Commit convention
- Do NOT add `Co-Authored-By: Claude ...` line to commit messages.
- Keep commit messages focused and concise.

## Project context
- User: DebateTimer project owner
- Tech: Electron + Vanilla JS app for debate timing
- Web 目标：`scripts/build-gh-pages.js` 生成的独立计时器页（polyfill `electronAPI`），并非 SPA；无 DataService 抽象层。2026-07-28 的 SPA + DataService 实现（仅位于 `docs/`）已于 2026-10-11 的 `3805173` 中删除，桌面端始终走 Electron IPC
