import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import os from 'os';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');

// Read version from package.json
const packageJson = JSON.parse(fs.readFileSync(path.join(projectRoot, 'package.json'), 'utf-8'));
const version = packageJson.version;

const platform = os.platform();
const arch = os.arch();

if (platform !== 'darwin') {
  console.log('Skipping latest.json generation on non-macOS platform for now.');
  process.exit(0);
}

// Define paths
const targetDir = path.join(projectRoot, 'src-tauri/target/release/bundle');
const macosDir = path.join(targetDir, 'macos');

if (!fs.existsSync(macosDir)) {
  console.error('❌ macOS bundle directory not found:', macosDir);
  process.exit(1);
}

// Find artifacts
const files = fs.readdirSync(macosDir);
const tarball = files.find(f => f.endsWith('.tar.gz'));
const sigFile = files.find(f => f.endsWith('.tar.gz.sig'));

if (!tarball || !sigFile) {
  console.error('❌ Could not find .tar.gz or .sig files in', macosDir);
  process.exit(1);
}

const signature = fs.readFileSync(path.join(macosDir, sigFile), 'utf-8');

// Construct latest.json content
const platformKey = `darwin-${arch === 'arm64' ? 'aarch64' : 'x86_64'}`;

const updateData = {
  version: `v${version}`,
  notes: "Update notes",
  pub_date: new Date().toISOString(),
  platforms: {
    [platformKey]: {
      signature: signature,
      url: `https://github.com/sebkasanzew/worktrace/releases/download/v${version}/${tarball}`
    }
  }
};

const outputPath = path.join(macosDir, 'latest.json');
fs.writeFileSync(outputPath, JSON.stringify(updateData, null, 2));

console.log(`✅ Generated latest.json at ${outputPath}`);