# Logging in Worktrace

This project uses **tauri-plugin-log**, the official Tauri logging plugin, for structured logging across Rust backend and frontend.

## Setup

The logging plugin was installed using the official Tauri command:

```bash
pnpm tauri add log
```

This automatically configured:
- Rust dependencies (`tauri-plugin-log`, `log`)
- NPM dependencies (`@tauri-apps/plugin-log`)
- Capabilities permissions (`log:default`)

## Features

- ✅ Structured logging with multiple targets (stdout, log files)
- ✅ Configurable log levels per module
- ✅ Separate log filtering for JIRA requests
- ✅ Platform-native log file storage
- ✅ Optional frontend logging support

## Log Levels

The following log levels are available (from most to least verbose):

1. **Trace** - Very detailed debugging information
2. **Debug** - Detailed debugging information
3. **Info** - General informational messages
4. **Warn** - Warning messages
5. **Error** - Error messages

## Current Configuration

### Backend (Rust)

The logger is configured in `src-tauri/src/lib.rs`:

```rust
tauri_plugin_log::Builder::new()
    .level(log::LevelFilter::Info)                    // Default level: Info
    .level_for("jira", log::LevelFilter::Debug)       // JIRA-specific logs: Debug
    .targets([
        tauri_plugin_log::Target::new(tauri_plugin_log::TargetKind::Stdout),
        tauri_plugin_log::Target::new(tauri_plugin_log::TargetKind::LogDir { file_name: None }),
    ])
    .build()
```

### Log Targets

- **Stdout**: Logs appear in the terminal/console during development
- **LogDir**: Logs are saved to platform-specific log directories:
  - **Linux**: `~/.local/share/worktrace/logs/`
  - **macOS**: `~/Library/Logs/worktrace/`
  - **Windows**: `%LOCALAPPDATA%\worktrace\logs\`

### Module-Specific Logging

JIRA-related logs use the `jira` target and are set to `Debug` level, while everything else defaults to `Info`:

```rust
// Example: Info-level JIRA log
log::info!(target: "jira", "Making JIRA API request");

// Example: Debug-level JIRA log (only shows when jira target is Debug or Trace)
log::debug!(target: "jira", "URL: {}", url);
```

## Usage in Rust Code

### Basic Logging

```rust
use log::{trace, debug, info, warn, error};

// General application logs
info!("Application started");
warn!("Configuration file not found, using defaults");
error!("Failed to connect: {}", error_message);
```

### Targeted Logging (e.g., for JIRA)

```rust
// JIRA-specific logs with custom target
log::info!(target: "jira", "Fetching issues");
log::debug!(target: "jira", "JQL: {}", jql_query);
log::error!(target: "jira", "Authentication failed: {}", err);
```

## Controlling Log Levels

### Enable/Disable JIRA Request Logs

To **enable** detailed JIRA logs (Debug level):
```rust
.level_for("jira", log::LevelFilter::Debug)  // ✅ Currently enabled
```

To **disable** verbose JIRA logs (Info level only):
```rust
.level_for("jira", log::LevelFilter::Info)
```

To **completely disable** JIRA logs:
```rust
.level_for("jira", log::LevelFilter::Off)
```

### Change Global Log Level

To see **all** logs including traces:
```rust
.level(log::LevelFilter::Trace)
```

To see **less** logging (warnings and errors only):
```rust
.level(log::LevelFilter::Warn)
```

## Frontend Logging (Available)

The JavaScript package is already installed via `pnpm tauri add log`.

Use it in your TypeScript/JavaScript code:

```typescript
import { info, debug, error, attachConsole } from '@tauri-apps/plugin-log';

// Log from JavaScript
info('User clicked submit button');
debug('Form data:', formData);
error('Validation failed:', errorDetails);

// Attach console to see Rust logs in browser console
const detach = await attachConsole();
// ... later: detach() to stop forwarding
```

To enable frontend-to-backend log forwarding, the Webview target is already available.
To add it, update the targets in `src-tauri/src/lib.rs`:

```rust
.targets([
    tauri_plugin_log::Target::new(tauri_plugin_log::TargetKind::Stdout),
    tauri_plugin_log::Target::new(tauri_plugin_log::TargetKind::LogDir { file_name: None }),
    tauri_plugin_log::Target::new(tauri_plugin_log::TargetKind::Webview), // Add this
])
```

## Advanced Configuration

### Custom Log File Names

```rust
tauri_plugin_log::Target::new(tauri_plugin_log::TargetKind::LogDir { 
    file_name: Some("worktrace-jira".into()) 
})
```

### Custom Format

```rust
.format(|out, message, record| {
    out.finish(format_args!(
        "[{}] [{}] {}",
        record.level(),
        record.target(),
        message
    ))
})
```

### Per-Module Filters

```rust
.level_for("jira", log::LevelFilter::Debug)
.level_for("ui", log::LevelFilter::Info)
.level_for("database", log::LevelFilter::Warn)
```

## Viewing Logs

### During Development

Logs appear in the terminal where you run `pnpm tauri dev`.

### In Production

Log files are saved to the platform-specific directories mentioned above. You can:

1. **Open log directory**:
   - macOS: `open ~/Library/Logs/worktrace/`
   - Linux: `xdg-open ~/.local/share/worktrace/logs/`
   - Windows: `explorer %LOCALAPPDATA%\worktrace\logs\`

2. **View logs in real-time** (during development):
   ```bash
   tail -f ~/Library/Logs/worktrace/worktrace.log  # macOS
   ```

## Best Practices

1. **Use appropriate log levels**:
   - `error!()` for errors that need attention
   - `warn!()` for potential issues
   - `info!()` for important events
   - `debug!()` for detailed diagnostics
   - `trace!()` for very detailed flow information

2. **Use targets for categorization**:
   ```rust
   log::info!(target: "jira", "...");
   log::info!(target: "ui", "...");
   log::info!(target: "storage", "...");
   ```

3. **Include context in logs**:
   ```rust
   // ✅ Good
   log::error!(target: "jira", "Failed to fetch issues: {}", error);
   
   // ❌ Less helpful
   log::error!("Error occurred");
   ```

4. **Don't log sensitive data**:
   ```rust
   // ❌ Bad - logs password
   log::debug!("Credentials: {} / {}", username, password);
   
   // ✅ Good
   log::debug!(target: "jira", "Authenticating user: {}", username);
   ```

## References

- [tauri-plugin-log Documentation](https://github.com/tauri-apps/plugins-workspace/tree/main/plugins/log)
- [Rust log crate](https://docs.rs/log/latest/log/)
