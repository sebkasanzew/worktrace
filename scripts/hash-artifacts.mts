import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import os from 'node:os';
import crypto from 'node:crypto';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');
const tauriDir = path.join(projectRoot, 'src-tauri');

async function calculateHash(filePath: string): Promise<string> {
  const fileBuffer = await fs.readFile(filePath);
  const hashSum = crypto.createHash('sha256');
  hashSum.update(fileBuffer);
  return hashSum.digest('hex');
}

async function main() {
  try {
    // Read tauri.conf.json for version
    const tauriConfigPath = path.join(tauriDir, 'tauri.conf.json');
    const tauriConfigContent = await fs.readFile(tauriConfigPath, 'utf-8');
    const tauriConfig = JSON.parse(tauriConfigContent);
    const version = tauriConfig.version;

    const platform = os.platform();
    let arch: string = os.arch();
    
    // Normalize arch
    if (arch === 'x64') {
      arch = 'x86_64';
    } else if (arch === 'arm64') {
      arch = 'aarch64';
    }

    let target = '';
    let bundlePath = '';
    let ext = '';
    let platformKey = '';

    if (platform === 'darwin') {
      target = `darwin-${arch}`;
      bundlePath = path.join(tauriDir, 'target/release/bundle/dmg');
      ext = '.dmg';
      platformKey = `macos-${arch}`;
    } else if (platform === 'win32') {
      target = `windows-${arch}`;
      bundlePath = path.join(tauriDir, 'target/release/bundle/nsis');
      ext = '.exe';
      platformKey = `windows-${arch}`;
    } else {
      console.log('Skipping hashing for unsupported platform:', platform);
      return;
    }

    // Find the file
    let files: string[] = [];
    try {
      files = await fs.readdir(bundlePath);
    } catch (e) {
      console.warn(`Directory not found: ${bundlePath}`);
      return;
    }

    const artifactFile = files.find(f => f.endsWith(ext));

    if (!artifactFile) {
      console.error(`Could not find ${ext} file in ${bundlePath}`);
      // Don't fail, just exit, maybe build failed or skipped
      return;
    }

    const fullPath = path.join(bundlePath, artifactFile);
    const sha256 = await calculateHash(fullPath);

    const result = {
      [platformKey]: {
        file: artifactFile,
        sha256,
        version
      }
    };

    const outputPath = path.join(bundlePath, 'hashes.json');
    await fs.writeFile(outputPath, JSON.stringify(result, null, 2));
    
    console.log(`Generated hashes.json at ${outputPath}`);
    console.log(JSON.stringify(result, null, 2));

  } catch (error) {
    console.error('Error hashing artifacts:', error);
    process.exit(1);
  }
}

main();
