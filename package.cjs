// Builds the portable Windows app at dist/GTA Helper (GTA Helper.exe + runtime).
// Works from Windows or Linux: it downloads the Windows Electron runtime matching package.json.
const fs = require('node:fs');
const path = require('node:path');
const { downloadArtifact } = require('@electron/get');
const extract = require('extract-zip');

const pkg = require('./package.json');
const electronVersion = require('electron/package.json').version;
const output = path.join(__dirname, 'dist/GTA Helper');

async function main() {
  const zip = await downloadArtifact({ version: electronVersion, platform: 'win32', arch: 'x64', artifactName: 'electron' });
  fs.rmSync(output, { recursive: true, force: true });
  fs.mkdirSync(output, { recursive: true });
  await extract(zip, { dir: output });

  const appDir = path.join(output, 'resources/app');
  fs.rmSync(path.join(output, 'resources/default_app.asar'), { force: true });
  fs.mkdirSync(appDir, { recursive: true });
  for (const name of ['main.cjs', 'preload.cjs', 'preload-overlay.cjs', 'preload-marker.cjs', 'overlay.cjs', 'fp-scanner.cjs', 'updater.cjs', 'weekly-feed.cjs', 'store.cjs', 'timers.cjs', 'game-watcher.cjs']) {
    fs.copyFileSync(path.join(__dirname, name), path.join(appDir, name));
  }
  const { devDependencies, scripts, ...runtimePkg } = pkg;
  fs.writeFileSync(path.join(appDir, 'package.json'), JSON.stringify(runtimePkg, null, 2));
  for (const dir of ['app', 'lib', 'data', 'assets']) {
    fs.cpSync(path.join(__dirname, dir), path.join(appDir, dir), { recursive: true });
  }

  const exe = path.join(output, 'GTA Helper.exe');
  fs.renameSync(path.join(output, 'electron.exe'), exe);
  await stampExe(exe);
  console.log(exe);
}

// Sets the icon and file metadata shown by Explorer, the taskbar and Alt-Tab. No code signing.
async function stampExe(exe) {
  const ResEdit = await import('resedit');
  const PE = await import('pe-library');
  const file = PE.NtExecutable.from(fs.readFileSync(exe), { ignoreCert: true });
  const res = PE.NtExecutableResource.from(file);
  const iconFile = ResEdit.Data.IconFile.from(fs.readFileSync(path.join(__dirname, 'assets/icon.ico')));
  for (const group of ResEdit.Resource.IconGroupEntry.fromEntries(res.entries)) {
    ResEdit.Resource.IconGroupEntry.replaceIconsForResource(res.entries, group.id, group.lang, iconFile.icons.map(i => i.data));
  }
  const [vi] = ResEdit.Resource.VersionInfo.fromEntries(res.entries);
  const lang = { lang: 1033, codepage: 1200 };
  const [major, minor, patch] = pkg.version.split('.').map(Number);
  vi.setFileVersion(major, minor, patch, 0, 1033);
  vi.setProductVersion(major, minor, patch, 0, 1033);
  vi.setStringValues(lang, {
    FileDescription: pkg.productName,
    ProductName: pkg.productName,
    OriginalFilename: `${pkg.productName}.exe`,
    InternalName: pkg.productName
  });
  vi.outputToResourceEntries(res.entries);
  res.outputResource(file);
  fs.writeFileSync(exe, Buffer.from(file.generate()));
}

main().catch(error => { console.error(error); process.exit(1); });
