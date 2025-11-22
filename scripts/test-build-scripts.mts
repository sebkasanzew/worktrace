import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';
import os from 'node:os';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');
const tauriDir = path.join(projectRoot, 'src-tauri');
const macosBundleDir = path.join(tauriDir, 'target/release/bundle/macos');

function setup() {
  console.log('Setting up test environment...');
  if (!fs.existsSync(macosBundleDir)) {
    fs.mkdirSync(macosBundleDir, { recursive: true });
  }
  
  // Create dummy artifacts
  fs.writeFileSync(path.join(macosBundleDir, 'Worktrace.app.tar.gz'), 'dummy content');
  fs.writeFileSync(path.join(macosBundleDir, 'Worktrace.app.tar.gz.sig'), 'dummy signature');
  
  // Clean up existing latest.json if any
  const latestJsonPath = path.join(macosBundleDir, 'latest.json');
  if (fs.existsSync(latestJsonPath)) {
    fs.unlinkSync(latestJsonPath);
  }
}

function testGeneration() {
  console.log('Testing generate-latest-json.mts...');
  try {
    execSync('node scripts/generate-latest-json.mts', { cwd: projectRoot, stdio: 'inherit' });
    
    const latestJsonPath = path.join(macosBundleDir, 'latest.json');
    if (fs.existsSync(latestJsonPath)) {
      console.log('✅ latest.json generated successfully');
      const content = JSON.parse(fs.readFileSync(latestJsonPath, 'utf-8'));
      
      const arch = os.arch() === 'arm64' ? 'aarch64' : 'x86_64';
      const expectedPlatform = `darwin-${arch}`;
      
      if (content.platforms && content.platforms[expectedPlatform]) {
         console.log(`✅ Platform entry ${expectedPlatform} found`);
      } else {
         console.error(`❌ Platform entry ${expectedPlatform} missing. Found: ${Object.keys(content.platforms || {})}`);
         process.exit(1);
      }
      return latestJsonPath;
    } else {
      console.error('❌ latest.json not found');
      process.exit(1);
    }
  } catch (e) {
    console.error('❌ Generation failed', e);
    process.exit(1);
  }
}

function testMerging(macosJsonPath: string) {
  console.log('\nTesting merge-latest-json.mts...');
  
  const macosJson = fs.readFileSync(macosJsonPath, 'utf-8');
  const macosPartPath = 'latest.json-macos';
  fs.writeFileSync(macosPartPath, macosJson);
  
  const windowsJson = {
    version: JSON.parse(macosJson).version,
    notes: "Update",
    pub_date: new Date().toISOString(),
    platforms: {
      "windows-x86_64": {
        signature: "win-sig",
        url: "win-url"
      }
    }
  };
  const winPartPath = 'latest.json-windows';
  fs.writeFileSync(winPartPath, JSON.stringify(windowsJson));
  
  try {
    execSync(`node scripts/merge-latest-json.mts ${macosPartPath} ${winPartPath}`, { cwd: projectRoot, stdio: 'inherit' });
    
    if (fs.existsSync('latest.json')) {
      const merged = JSON.parse(fs.readFileSync('latest.json', 'utf-8'));
      console.log('Merged content:', JSON.stringify(merged, null, 2));
      
      const hasMac = Object.keys(merged.platforms).some(k => k.startsWith('darwin'));
      const hasWin = merged.platforms['windows-x86_64'];
      
      if (hasMac && hasWin) {
        console.log('✅ Merge successful: Both platforms present');
      } else {
        console.error('❌ Merge failed: Missing platforms');
        process.exit(1);
      }
    } else {
      console.error('❌ Merged latest.json not found');
      process.exit(1);
    }
  } catch (e) {
    console.error('❌ Merge failed', e);
    process.exit(1);
  } finally {
    // Cleanup
    if (fs.existsSync(macosPartPath)) fs.unlinkSync(macosPartPath);
    if (fs.existsSync(winPartPath)) fs.unlinkSync(winPartPath);
    if (fs.existsSync('latest.json')) fs.unlinkSync('latest.json');
  }
}

setup();
const jsonPath = testGeneration();
if (jsonPath) {
    testMerging(jsonPath);
}
