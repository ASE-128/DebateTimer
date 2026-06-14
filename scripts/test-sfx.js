const fs = require('fs');
const path = require('path');
const os = require('os');
const childProcess = require('child_process');
const embedded = require('../vendor/embedded-binaries');

const tempBase = fs.mkdtempSync(path.join(os.tmpdir(), 'dt-sfx-test-'));
console.log('Temp dir:', tempBase);

// Write embedded binaries
const rarExe = path.join(tempBase, 'rar.exe');
const sfxModule = path.join(tempBase, 'Default.SFX');
const sfxIcon = path.join(tempBase, 'electron-icon.ico');
fs.writeFileSync(rarExe, Buffer.from(embedded.rarExeBase64, 'base64'));
fs.writeFileSync(sfxModule, Buffer.from(embedded.sfxModuleBase64, 'base64'));
fs.writeFileSync(sfxIcon, Buffer.from(embedded.electronIconBase64, 'base64'));

// Create a dummy file to archive
fs.writeFileSync(path.join(tempBase, 'hello.txt'), 'Hello from SFX test');

// Create comment file
const commentFile = path.join(tempBase, 'sfx-comment.txt');
fs.writeFileSync(commentFile, 'Setup=hello.txt\nTempMode\nSilent=1\nOverwrite=1');

// Build SFX
const outExe = path.join(tempBase, 'test-sfx.exe');
const result = childProcess.spawnSync(rarExe, [
  'a',
  '-sfxDefault.SFX',
  '-iiconelectron-icon.ico',
  '-zsfx-comment.txt',
  '-r',
  '-ep1',
  '-xrar.exe',
  '-xDefault.SFX',
  '-xelectron-icon.ico',
  '-xsfx-comment.txt',
  '-xtest-sfx.exe',
  'test-sfx.exe',
  '*'
], { cwd: tempBase, windowsHide: true });

console.log('rar exit code:', result.status);
console.log('rar stderr:', result.stderr?.toString() || '');
console.log('rar stdout:', result.stdout?.toString() || '');

if (fs.existsSync(outExe)) {
  const stats = fs.statSync(outExe);
  console.log('SFX created:', outExe, 'size:', stats.size);
} else {
  console.error('SFX creation failed');
  process.exit(1);
}

// Cleanup
fs.rmSync(tempBase, { recursive: true, force: true });
console.log('Test passed');
