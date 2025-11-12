# Worktrace

A minimal desktop app that makes time and work tracking with issue tracking tools, like JIRA, easy.

## Features

- **Secure Configuration Storage**: Your JIRA credentials are securely stored locally using Tauri's store plugin
- **Login Screen**: Easy configuration of JIRA URL, email, and API token
- **Task List View**: View all your unresolved JIRA issues in a clean, modern interface
- **Real-time Updates**: Automatically refreshes your issue list
- **Modern UI**: Built with shadcn/ui components and Tailwind CSS

## Tech Stack

### Frontend
- **React 19** - UI framework
- **TypeScript** - Type safety
- **Vite** - Fast build tool
- **Tailwind CSS v3** - Utility-first CSS
- **shadcn/ui** - High-quality UI components
- **Tanstack React Query** - Data fetching and caching

### Backend
- **Tauri v2** - Rust-based desktop app framework
- **tauri-plugin-store** - Persistent configuration storage

## Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** (v20 or later)
- **pnpm** (v10 or later)
- **Rust** (latest stable)
- **Tauri Prerequisites**: Follow the [Tauri Prerequisites Guide](https://tauri.app/start/prerequisites/) for your OS:
  - **Windows**: Microsoft Visual Studio C++ Build Tools
  - **macOS**: Xcode Command Line Tools
  - **Linux**: webkit2gtk, gtk3, and other dependencies

## Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/sebkasanzew/worktrace.git
   cd worktrace
   ```

2. **Install dependencies**:
   ```bash
   pnpm install
   ```

## Development

Run the app in development mode:

```bash
pnpm tauri dev
```

This will:
- Start the Vite development server
- Launch the Tauri app
- Enable hot-reload for frontend changes

## Building

Build the app for production:

```bash
pnpm tauri build
```

This will create platform-specific installers in `src-tauri/target/release/bundle/`.

## Usage

### First Time Setup

1. **Launch the app** - On first launch, you'll see the login screen
2. **Enter your JIRA credentials**:
   - **JIRA URL**: Your JIRA instance URL (e.g., `https://your-domain.atlassian.net`)
   - **Email**: Your JIRA account email
   - **API Token**: Generate one at [Atlassian Account Settings](https://id.atlassian.com/manage-profile/security/api-tokens)
3. **Click "Save Configuration"**

### Viewing Issues

Once configured, the app will:
- Display all unresolved issues assigned to you
- Show issue key, summary, status, and assignee
- Auto-refresh every minute
- Allow manual refresh with the refresh button

### Logout

Click the "Logout" button to clear your stored credentials and return to the login screen.

## Project Structure

```
worktrace/
├── src/                          # Frontend source
│   ├── components/               # React components
│   │   ├── ui/                   # shadcn/ui components
│   │   ├── Login.tsx             # Login/configuration screen
│   │   └── TaskList.tsx          # JIRA issues list view
│   ├── services/                 # API services
│   │   └── jira.ts               # JIRA API integration
│   ├── types/                    # TypeScript types
│   │   └── jira.ts               # JIRA type definitions
│   ├── lib/                      # Utilities
│   │   └── utils.ts              # Helper functions
│   ├── App.tsx                   # Main app component
│   ├── main.tsx                  # App entry point
│   └── index.css                 # Global styles
├── src-tauri/                    # Tauri/Rust backend
│   ├── src/
│   │   ├── lib.rs                # Main Tauri logic & commands
│   │   └── main.rs               # Entry point
│   ├── Cargo.toml                # Rust dependencies
│   └── tauri.conf.json           # Tauri configuration
├── package.json                  # Frontend dependencies
├── tailwind.config.js            # Tailwind configuration
├── tsconfig.json                 # TypeScript configuration
└── vite.config.ts                # Vite configuration
```

## Available Scripts

- `pnpm dev` - Start Vite development server
- `pnpm build` - Build frontend for production
- `pnpm tauri dev` - Run the app in development mode
- `pnpm tauri build` - Build the app for production

## Configuration

The app stores your JIRA configuration securely using Tauri's store plugin. The configuration file is located at:
- **Windows**: `%APPDATA%/com.worktrace.app/config.json`
- **macOS**: `~/Library/Application Support/com.worktrace.app/config.json`
- **Linux**: `~/.config/com.worktrace.app/config.json`

## Security

- API tokens are stored locally and never transmitted except to your configured JIRA instance
- All communication with JIRA uses HTTPS
- Basic authentication is used with email + API token (as recommended by Atlassian)

## Recommended IDE Setup

- [VS Code](https://code.visualstudio.com/) + [Tauri](https://marketplace.visualstudio.com/items?itemName=tauri-apps.tauri-vscode) + [rust-analyzer](https://marketplace.visualstudio.com/items?itemName=rust-lang.rust-analyzer)

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## Roadmap

Future enhancements planned:
- [ ] Time tracking functionality
- [ ] Worklog management
- [ ] Issue filtering and search
- [ ] Multiple JIRA instance support
- [ ] Desktop notifications for issue updates
- [ ] Keyboard shortcuts
- [ ] Dark mode toggle

## Support

For issues and questions, please create an issue on GitHub.
