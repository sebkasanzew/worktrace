import { readFileSync } from 'node:fs';
import { spawn } from 'node:child_process';

// Read the key
let privateKey = process.env.TAURI_SIGNING_PRIVATE_KEY || '';
try {
  const fileKey = readFileSync('app.key', 'utf-8');
  if (fileKey) {
    privateKey = fileKey;
  }
} catch (e) {
  if (!privateKey) {
    console.warn('Warning: app.key not found and TAURI_SIGNING_PRIVATE_KEY not set. Build might fail if signing is required.');
  }
}

// Get arguments passed to the script
const args = process.argv.slice(2);

if (args.length === 0) {
  console.error('Please provide a command to run.');
  process.exit(1);
}

const command = args[0];
const commandArgs = args.slice(1);

// Run the command with the environment variable
const child = spawn(command, commandArgs, {
  stdio: 'inherit',
  shell: true,
  env: {
    ...process.env,
    TAURI_SIGNING_PRIVATE_KEY: privateKey,
  },
});

child.on('exit', (code) => {
  process.exit(code ?? 0);
});
