
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');

// Helper to run commands
function run(command: string) {
  console.log(`> ${command}`);
  execSync(command, { stdio: 'inherit', cwd: projectRoot });
}

// Read current version
const packageJsonPath = path.join(projectRoot, 'package.json');
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
const currentVersion = packageJson.version;

console.log(`Current version: ${currentVersion}`);

// Calculate older version (decrement patch)
const parts = currentVersion.split('.').map(Number);
if (parts[2] > 0) parts[2]--;
else if (parts[1] > 0) { parts[1]--; parts[2] = 9; }
else if (parts[0] > 0) { parts[0]--; parts[1] = 9; parts[2] = 9; }
else {
  console.error("Cannot downgrade from 0.0.0");
  process.exit(1);
}
const olderVersion = parts.join('.');

console.log(`Downgrading to ${olderVersion} for testing...`);

// Backup files
const tauriConfPath = path.join(projectRoot, 'src-tauri/tauri.conf.json');
const cargoTomlPath = path.join(projectRoot, 'src-tauri/Cargo.toml');

fs.copyFileSync(packageJsonPath, `${packageJsonPath}.bak`);
fs.copyFileSync(tauriConfPath, `${tauriConfPath}.bak`);
fs.copyFileSync(cargoTomlPath, `${cargoTomlPath}.bak`);

try {
  // Bump to older version
  run(`node scripts/bump-version.mts ${olderVersion}`);

  console.log('Building app with older version...');
  
  // Let's try disabling createUpdaterArtifacts for this test build.
  const tauriConf = JSON.parse(fs.readFileSync(tauriConfPath, 'utf-8'));
  tauriConf.bundle.createUpdaterArtifacts = false;
  fs.writeFileSync(tauriConfPath, JSON.stringify(tauriConf, null, 2));
  
  run(`pnpm tauri build`); // This will build release but skip updater artifacts (so no signing needed hopefully)

  console.log('Build complete.');
  
  // Open the app
  const appPath = path.join(projectRoot, 'src-tauri/target/release/bundle/macos/Worktrace.app');
  console.log(`Opening ${appPath}...`);
  run(`open "${appPath}"`);
  
  console.log('App opened. It should now detect the update from GitHub.');

} catch (error) {
  console.error('Error during test:', error);
} finally {
  // Restore files
  console.log('Restoring version...');
  fs.copyFileSync(`${packageJsonPath}.bak`, packageJsonPath);
  fs.copyFileSync(`${tauriConfPath}.bak`, tauriConfPath);
  fs.copyFileSync(`${cargoTomlPath}.bak`, cargoTomlPath);
  
  // Cleanup backups
  fs.unlinkSync(`${packageJsonPath}.bak`);
  fs.unlinkSync(`${tauriConfPath}.bak`);
  fs.unlinkSync(`${cargoTomlPath}.bak`);
  
  console.log('Done.');
}
