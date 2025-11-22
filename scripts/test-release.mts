
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');

async function getPassword(prompt: string): Promise<string> {
  process.stdout.write(prompt);
  if (process.stdin.isTTY) {
    process.stdin.setRawMode(true);
  }
  process.stdin.resume();
  process.stdin.setEncoding('utf8');

  let password = '';
  return new Promise((resolve) => {
    const onData = (key: Buffer) => {
      const char = key.toString();
      if (char === '\n' || char === '\r' || char === '\u0004') {
        if (process.stdin.isTTY) {
          process.stdin.setRawMode(false);
        }
        process.stdin.pause();
        process.stdin.removeListener('data', onData);
        process.stdout.write('\n');
        resolve(password);
      } else if (char === '\u0003') { // Ctrl+C
        process.exit(1);
      } else if (char === '\u007f') { // Backspace
        if (password.length > 0) {
          password = password.slice(0, -1);
        }
      } else {
        password += char;
      }
    };
    process.stdin.on('data', onData);
  });
}

async function main() {
  console.log("Checking signing configuration...");

  // Check if private key env var is set
  if (!process.env.TAURI_SIGNING_PRIVATE_KEY) {
    const keyPath = path.join(projectRoot, 'app.key');
    if (fs.existsSync(keyPath)) {
      console.log("Using app.key from project root.");
      process.env.TAURI_SIGNING_PRIVATE_KEY = fs.readFileSync(keyPath, 'utf-8');
    } else {
      console.error("Error: TAURI_SIGNING_PRIVATE_KEY not set and app.key not found.");
      process.exit(1);
    }
  }

  // Check if password env var is set
  if (!process.env.TAURI_SIGNING_PRIVATE_KEY_PASSWORD) {
    const password = await getPassword("Please enter the password for the signing key: ");
    process.env.TAURI_SIGNING_PRIVATE_KEY_PASSWORD = password;
    console.log("Password set.");
  }

  console.log("Building application with updater artifacts...");
  try {
    execSync('pnpm tauri build', { stdio: 'inherit', cwd: projectRoot, env: process.env });
  } catch (error) {
    console.error("Build failed.");
    process.exit(1);
  }

  console.log("Generating latest.json...");
  try {
    execSync('node scripts/generate-latest-json.mts', { stdio: 'inherit', cwd: projectRoot });
  } catch (error) {
    console.error("Failed to generate latest.json");
    process.exit(1);
  }

  console.log("Checking for artifacts...");
  let foundAll = true;

  const macosBundleDir = path.join(projectRoot, 'src-tauri/target/release/bundle/macos');
  
  const checkFile = (filename: string, description: string) => {
    const filePath = path.join(macosBundleDir, filename);
    if (fs.existsSync(filePath)) {
      console.log(`✅ ${description} found!`);
      return true;
    } else {
      console.log(`❌ ${description} NOT found!`);
      return false;
    }
  };

  if (!checkFile('Worktrace.app.tar.gz', 'Updater artifact .tar.gz')) foundAll = false;
  if (!checkFile('Worktrace.app.tar.gz.sig', 'Updater artifact .sig')) foundAll = false;
  if (!checkFile('latest.json', 'latest.json')) foundAll = false;

  if (foundAll) {
    console.log("🎉 Success! All updater artifacts were generated.");
    process.exit(0);
  } else {
    console.log("⚠️  Some artifacts are missing.");
    process.exit(1);
  }
}

main();
