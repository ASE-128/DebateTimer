const { app } = require('electron');
const path = require('path');

process.env.DEBATE_TIMER_TEST_MODE = 'export';

const { generateStandaloneExe, defaultConfig } = require('./main.js');

app.whenReady().then(async () => {
  const outputPath = path.join(app.getPath('temp'), 'DebateTimer-test-standalone.exe');
  console.log('Test export target:', outputPath);
  try {
    const result = await generateStandaloneExe(defaultConfig(), outputPath, (percent, message) => {
      console.log(`[${percent}%] ${message}`);
    });
    console.log('Export succeeded:', result);
  } catch (err) {
    console.error('Export failed:', err.message);
    console.error(err.stack);
    process.exitCode = 1;
  } finally {
    app.quit();
  }
});
