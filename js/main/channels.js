const CHANNELS = {
  LOAD_CONFIG: 'load-config',
  GET_APP_VERSION: 'get-app-version',
  GET_TIMER_BASE_SIZE: 'get-timer-base-size',
  GET_LATEST_CHANGELOG: 'get-latest-changelog',
  CONSUME_MIGRATION_INFO: 'consume-migration-info',
  LOG: 'log',
  SAVE_CONFIG: 'save-config',
  RESET_CONFIG: 'reset-config',
  OPEN_TIMER: 'open-timer',
  OPEN_EDITOR: 'open-editor',
  IMPORT_CONFIG: 'import-config',
  EXPORT_CONFIG: 'export-config',
  EXPORT_STANDALONE: 'export-standalone',
  GET_TEMPLATES: 'get-templates',
  APPLY_TEMPLATE: 'apply-template',
  SAVE_TEMPLATE: 'save-template',
  DELETE_TEMPLATE: 'delete-template',
  SAVE_CUSTOM_TEMPLATE: 'save-template',
  DELETE_CUSTOM_TEMPLATE: 'delete-template',
  TOGGLE_FULLSCREEN: 'toggle-fullscreen',
  START_DOWNLOAD_UPDATE: 'start-download-update',
  QUIT_AND_INSTALL: 'quit-and-install',
  SKIP_UPDATE: 'skip-update',

  CONFIG_UPDATED: 'config-updated',
  EXPORT_PROGRESS: 'export-progress',
  UPDATE_AVAILABLE: 'update-available',
  UPDATE_DOWNLOADED: 'update-downloaded',
  UPDATE_ERROR: 'update-error'
};

module.exports = CHANNELS;
