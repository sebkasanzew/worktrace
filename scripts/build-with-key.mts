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

// Handle Windows command extensions for npm/pnpm/tauri
const isWindows = process.platform === 'win32';
const cmdExtension = isWindows ? '.cmd' : '';
const finalCommand = (isWindows && ['npm', 'pnpm', 'tauri'].includes(command))
  ? `${command}${cmdExtension}` 
  : command;

// Prepare environment for child process. Don't inject an empty secret into the environment.
const childEnv: NodeJS.ProcessEnv = { ...process.env }
if (privateKey && privateKey.length > 0) {
  childEnv.TAURI_SIGNING_PRIVATE_KEY = privateKey
}

// Run the command without a shell (safer) and inherit stdio.
const child = spawn(finalCommand, commandArgs, {
  stdio: 'inherit',
  env: childEnv,
})

child.on('exit', (code) => {
  process.exit(code ?? 0);
});
