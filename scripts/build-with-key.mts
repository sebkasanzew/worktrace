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

const isWindows = process.platform === 'win32';

// Prepare environment for child process. Don't inject an empty secret into the environment.
const childEnv: NodeJS.ProcessEnv = { ...process.env }
if (privateKey && privateKey.length > 0) {
  childEnv.TAURI_SIGNING_PRIVATE_KEY = privateKey
}

// Run the command.
let child;

if (isWindows) {
  // On Windows, .cmd/.bat files cannot be executed directly by spawn without a shell.
  // We explicitly invoke cmd.exe to avoid using the generic 'shell: true' option
  // which can be flagged as a security risk.
  child = spawn('cmd.exe', ['/c', command, ...commandArgs], {
    stdio: 'inherit',
    env: childEnv,
  });
} else {
  child = spawn(command, commandArgs, {
    stdio: 'inherit',
    env: childEnv,
  });
}

child.on('exit', (code) => {
  process.exit(code ?? 0);
});
