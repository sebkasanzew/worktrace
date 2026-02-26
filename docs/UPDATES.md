# Auto-Update Configuration

Worktrace uses Tauri's built-in updater plugin to automatically check for and install updates.

## How It Works

1. **Automatic Check**: On app startup, the `UpdateChecker` component checks for updates from GitHub Releases
2. **User Notification**: If an update is available, a notification card appears in the top-right corner
3. **One-Click Install**: Users can click "Install Update" to download and install the latest version
4. **Automatic Relaunch**: After installation, the app automatically restarts with the new version

## Configuration

The updater is configured in `src-tauri/tauri.conf.json`:

```json
{
  "plugins": {
    "updater": {
      "active": true,
      "endpoints": [
        "https://github.com/sebkasanzew/worktrace/releases/latest/download/latest.json"
      ],
      "dialog": true,
      "pubkey": ""
    }
  }
}
```

## Publishing Updates

### 1. Build Release Bundles

```bash
pnpm tauri build
```

This creates platform-specific installers in `src-tauri/target/release/bundle/`

### 2. Create GitHub Release

1. Go to https://github.com/sebkasanzew/worktrace/releases/new
2. Create a new tag (e.g., `v0.2.0`)
3. Upload the build artifacts:
   - **macOS**: `.app` or `.dmg` from `bundle/macos/`
   - **Windows**: `.msi` from `bundle/msi/`
   - **Linux**: `.deb` and `.AppImage` from `bundle/deb/` and `bundle/appimage/`

### 3. Generate Update Manifest

Tauri CLI automatically generates a `latest.json` file during the build process. Upload this file to the release as well.

The `latest.json` file contains:
- Version number
- Download URLs for each platform
- File signatures for verification

### 4. Users Get Auto-Updates

Once published, users running older versions will automatically be notified of the update on their next app launch.

## Security

### Code Signing (Recommended for Production)

To ensure update integrity, you should sign your releases:

1. **Generate a keypair**:
   ```bash
   pnpm tauri signer generate -- -w ~/.tauri/worktrace.key
   ```

2. **Add public key to `tauri.conf.json`**:
   ```json
   {
     "plugins": {
       "updater": {
         "pubkey": "YOUR_PUBLIC_KEY_HERE"
       }
     }
   }
   ```

3. **Sign releases during build**:
   Set the `TAURI_SIGNING_PRIVATE_KEY` environment variable before building.

## Testing Updates

To test the update mechanism:

1. Build and publish a release with version `0.2.0`
2. Run a local version `0.1.0`
3. The UpdateChecker should detect the newer version and show the update notification

## Disabling Auto-Updates

To disable auto-updates temporarily, set `active: false` in `tauri.conf.json`:

```json
{
  "plugins": {
    "updater": {
      "active": false
    }
  }
}
```

## Components

- **Backend**: `tauri-plugin-updater` + `tauri-plugin-process` (for relaunch)
- **Frontend**: `UpdateChecker.tsx` component
- **Configuration**: `src-tauri/tauri.conf.json`

## References

- [Tauri Updater Documentation](https://v2.tauri.app/plugin/updater/)
- [Tauri Code Signing](https://v2.tauri.app/distribute/sign/)
