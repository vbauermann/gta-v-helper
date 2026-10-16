// Builds a portable folder dist/GTA Helper with the Electron runtime and the app. Run on Windows.
const fs = require('node:fs');
const path = require('node:path');
require('electron'); // Electron 44 downloads its binary lazily; make sure it exists before copying.

const output = path.join(__dirname, 'dist/GTA Helper');
fs.rmSync(output, { recursive: true, force: true });
fs.mkdirSync(output, { recursive: true });
fs.cpSync(path.join(__dirname, 'node_modules/electron/dist'), output, { recursive: true });
const appDir = path.join(output, 'resources/app');
fs.mkdirSync(appDir, { recursive: true });
for (const name of ['main.cjs', 'preload.cjs', 'store.cjs', 'timers.cjs', 'game-watcher.cjs', 'package.json']) {
  fs.copyFileSync(path.join(__dirname, name), path.join(appDir, name));
}
for (const dir of ['app', 'lib', 'data', 'assets']) {
  fs.cpSync(path.join(__dirname, dir), path.join(appDir, dir), { recursive: true });
}

if (process.platform !== 'win32') {
  console.log(`Pasta montada em ${output} (o .exe só é gerado no Windows).`);
  process.exit(0);
}
const exe = path.join(output, 'GTA Helper.exe');
fs.renameSync(path.join(output, 'electron.exe'), exe);
require('rcedit').rcedit(exe, {
  icon: path.join(__dirname, 'assets/icon.ico'),
  'version-string': { FileDescription: 'GTA Helper', ProductName: 'GTA Helper', OriginalFilename: 'GTA Helper.exe' }
}).then(() => console.log(exe)).catch(error => { console.error(error); process.exit(1); });
