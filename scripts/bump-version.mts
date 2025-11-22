
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');

const args = process.argv.slice(2);
const newVersion = args[0];

if (!newVersion) {
  console.error('Usage: node scripts/bump-version.mts <new-version>');
  process.exit(1);
}

// Validate version format (simple regex)
if (!/^\d+\.\d+\.\d+$/.test(newVersion)) {
  console.error('Error: Version must be in format x.y.z');
  process.exit(1);
}

console.log(`Bumping version to ${newVersion}...`);

// 1. Update package.json
const packageJsonPath = path.join(projectRoot, 'package.json');
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
const oldVersion = packageJson.version;
packageJson.version = newVersion;
fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n');
console.log(`Updated package.json: ${oldVersion} -> ${newVersion}`);

// 2. Update src-tauri/tauri.conf.json
const tauriConfPath = path.join(projectRoot, 'src-tauri/tauri.conf.json');
const tauriConf = JSON.parse(fs.readFileSync(tauriConfPath, 'utf-8'));
tauriConf.version = newVersion;
fs.writeFileSync(tauriConfPath, JSON.stringify(tauriConf, null, 2) + '\n');
console.log(`Updated tauri.conf.json`);

// 3. Update src-tauri/Cargo.toml
const cargoTomlPath = path.join(projectRoot, 'src-tauri/Cargo.toml');
let cargoToml = fs.readFileSync(cargoTomlPath, 'utf-8');
// Replace version = "x.y.z" inside [package] section
// This regex looks for version = "..." at the start of the file or after a newline, 
// assuming it's in the [package] block which is usually at the top.
cargoToml = cargoToml.replace(/^version = "[^"]+"/m, `version = "${newVersion}"`);
fs.writeFileSync(cargoTomlPath, cargoToml);
console.log(`Updated Cargo.toml`);

console.log('✅ Version bump complete.');
