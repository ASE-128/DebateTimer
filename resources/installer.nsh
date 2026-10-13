; DebateTimer 自定义 NSIS 脚本
; 卸载时询问是否删除用户数据（默认保留；静默卸载与自动更新时跳过）
!macro customUnInstall
  ${ifNot} ${isUpdated}
    IfSilent dt_skip_delete_app_data
    ${if} $installMode == "all"
      SetShellVarContext current
    ${endif}
    IfFileExists "$APPDATA\DebateTimer\*.*" 0 dt_restore_shell_context
    MessageBox MB_YESNO|MB_ICONQUESTION "是否同时删除用户数据？$\r$\n$\r$\n$APPDATA\DebateTimer" IDNO dt_restore_shell_context
    RMDir /r "$APPDATA\DebateTimer"
    dt_restore_shell_context:
    ${if} $installMode == "all"
      SetShellVarContext all
    ${endif}
    dt_skip_delete_app_data:
  ${endif}
!macroend
