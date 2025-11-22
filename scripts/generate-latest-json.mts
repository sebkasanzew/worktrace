import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import os from 'node:os';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');
const tauriDir = path.join(projectRoot, 'src-tauri');

async function generateLatestJson() {
  try {
    // Read tauri.conf.json
    const tauriConfigPath = path.join(tauriDir, 'tauri.conf.json');
    const tauriConfigContent = await fs.readFile(tauriConfigPath, 'utf-8');
    const tauriConfig = JSON.parse(tauriConfigContent);

    const version = tauriConfig.version;
    
    // Determine platform and arch
    const platform = os.platform();
    let arch: string = os.arch();
    
    if (arch === 'x64') {
      arch = 'x86_64';
    } else if (arch === 'arm64') {
      arch = 'aarch64';
    }
    
    let target = '';
    let bundlePath = '';
    let ext = '';

    if (platform === 'darwin') {
      target = `darwin-${arch}`;
      bundlePath = path.join(tauriDir, 'target/release/bundle/macos');
      ext = 'app.tar.gz';
    } else if (platform === 'win32') {
      target = `windows-${arch}`;
      bundlePath = path.join(tauriDir, 'target/release/bundle/nsis');
      ext = 'setup.exe'; 
    } else if (platform === 'linux') {
      target = `linux-${arch}`;
      bundlePath = path.join(tauriDir, 'target/release/bundle/appimage'); 
      ext = 'AppImage.tar.gz';
    }

    // Find the file
    const files = await fs.readdir(bundlePath);
    const appFile = files.find(f => f.endsWith(ext) && !f.endsWith('.sig'));
    const sigFile = files.find(f => f.endsWith(`${ext}.sig`));

    if (!appFile || !sigFile) {
      console.error(`Could not find ${ext} or .sig file in ${bundlePath}`);
      process.exit(1);
    }

    const sigContent = await fs.readFile(path.join(bundlePath, sigFile), 'utf-8');

    // Construct the URL
    // Assuming GitHub Releases structure based on tauri.conf.json
    // "https://github.com/sebkasanzew/worktrace/releases/latest/download/latest.json"
    const baseUrl = 'https://github.com/sebkasanzew/worktrace/releases/latest/download';
    const downloadUrl = `${baseUrl}/${appFile}`;

    const outputPath = path.join(bundlePath, 'latest.json');

    // Try to read existing latest.json to merge platforms
    let existingData: any = null;
    try {
      if (await fs.stat(outputPath).catch(() => false)) {
        const content = await fs.readFile(outputPath, 'utf-8');
        existingData = JSON.parse(content);
        console.log(`Found existing latest.json at ${outputPath}, merging...`);
      }
    } catch (e) {
      console.warn('Failed to read existing latest.json, starting fresh.');
    }

    const platforms = (existingData && existingData.version === version) 
      ? { ...existingData.platforms } 
      : {};

    platforms[target] = {
      signature: sigContent,
      url: downloadUrl
    };

    const updateData = {
      version,
      notes: `Update to version ${version}`,
      pub_date: new Date().toISOString(),
      platforms
    };

    await fs.writeFile(outputPath, JSON.stringify(updateData, null, 2));
    
    console.log(`Generated latest.json at ${outputPath}`);
    console.log(JSON.stringify(updateData, null, 2));

  } catch (error) {
    console.error('Error generating latest.json:', error);
    process.exit(1);
  }
}

generateLatestJson();
