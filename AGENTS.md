# AI Agent Guidelines for Worktrace

This document provides guidance for AI agents working on the Worktrace codebase.

Be extremely concise. Sacrifice grammar for the sake of concision.

## Project Overview

Worktrace is a cross-platform desktop application for JIRA time tracking, built with:

- **Frontend**: React 19 + TypeScript 5.8 + Vite 7
- **Styling**: Tailwind CSS v4 + shadcn/ui
- **State Management**: Tanstack React Query v5
- **Backend**: Tauri v2.9.4 (Rust)
- **Storage**: tauri-plugin-store v2
- **Logging**: tauri-plugin-log v2 (with module-specific filtering)

## Code Standards

### Dependency Management

- **Always use fixed versions** for all packages in `package.json` and `Cargo.toml`
- Never use version ranges like `^`, `~`, `>=`, or `*`
- Example: Use `"react": "19.2.0"` instead of `"react": "^19.2.0"`
- Example: Use `tauri = "2.9.2"` instead of `tauri = "^2.9"`
- This ensures reproducible builds and prevents unexpected breaking changes

### Linting and Formatting

- Use **Biome** for linting and formatting TypeScript/JavaScript files
- Run `pnpm lint` to check for issues
- Run `pnpm lint:fix` to auto-fix linting issues
- Run `pnpm format` to format code
- Configuration is in `biome.json`

### Logging

- **Never use `console.log()`, `console.error()`, etc.** in frontend code
- Always use `@tauri-apps/plugin-log` for logging:
  - `info()` for informational messages
  - `error()` for error messages (import as `logError` to avoid conflicts)
  - `debug()` for debug messages
  - `warn()` for warnings
- **Redact sensitive data**: Use `redactSensitive()` from `@/lib/utils` for URLs, tokens, emails
- Logs are automatically written to both stdout and log files
- Example:
  ```typescript
  import { info, error as logError, debug } from "@tauri-apps/plugin-log";
  import { redactSensitive } from "@/lib/utils";
  
  info("User logged in successfully");
  logError(`Failed to fetch from ${redactSensitive(url)}`);
  debug(`Response: ${redactSensitive(JSON.stringify(data))}`);
  ```

### TypeScript

- Maintain strict type safety
- Avoid `any` types - use proper type definitions
- All React components should have proper prop types
- Use TypeScript path aliases with `@/` for imports from `src/`

### React Components

- Use functional components with hooks
- Keep components focused and single-purpose
- Use shadcn/ui components from `src/components/ui/` for consistency
- Follow the existing component structure:
  - UI components in `src/components/ui/`
  - Feature components in `src/components/`
  - Services in `src/services/`
  - Types in `src/types/`

### Styling

- Use Tailwind CSS utility classes
- Follow shadcn/ui design patterns
- Use the existing color scheme defined in `src/index.css`
- Maintain responsive design principles

### State Management

- Use Tanstack React Query for server state
- Use React hooks (useState, useEffect) for local state
- Use custom hooks from `src/services/jira.hooks.ts`:
  - `useCurrentUser()` - Fetches JIRA user session
  - `useMyIssues()` - Fetches assigned issues
  - `useIssuesByJql(jql)` - Custom JQL search
- Query keys centralized in `src/services/jira.keys.ts`
- Keep queries in service files for reusability

### Type Safety & Validation

- **Specta**: Auto-generates TypeScript types from Rust (Tauri commands)
  - Run on `tauri dev` in debug builds
  - Output: `src/types/bindings.ts`
- **ts-to-zod**: Auto-generates Zod schemas from TS types
  - Runs after Specta export via `src-tauri/src/bindings.rs`
  - Config: `ts-to-zod.config.mjs`
  - Output: `src/types/bindings.zod.ts`
- **Runtime validation**: Use Zod schemas in `jiraClient.ts` to validate API responses
- Example:
  ```typescript
  import { jiraSearchResponseSchema } from "@/types/bindings.zod";
  const validated = jiraSearchResponseSchema.parse(response);
  ```

## Project Structure

```
src/
├── components/
│   ├── ui/              # shadcn/ui components (Button, Input, Card, etc.)
│   ├── Login.tsx        # JIRA credentials configuration
│   └── TaskList.tsx     # Issue list view
├── services/
│   ├── jira.ts          # JIRA config service + legacy API wrapper
│   ├── jiraClient.ts    # Typed JIRA client with validation & Zod
│   ├── jira.hooks.ts    # React Query hooks for JIRA data
│   └── jira.keys.ts     # Centralized query keys
├── types/
│   ├── bindings.ts      # Auto-generated from Rust (Specta)
│   ├── bindings.zod.ts  # Auto-generated Zod schemas (ts-to-zod)
│   └── jira.ts          # Manual TypeScript type definitions
├── lib/
│   └── utils.ts         # Utility functions (cn, redactSensitive, etc.)
├── App.tsx              # Main application component
├── main.tsx             # Application entry point
└── index.css            # Global styles & Tailwind imports

src-tauri/
├── src/
│   ├── lib.rs           # Tauri commands and plugin initialization
│   ├── bindings.rs      # Specta bindings export + Zod generation
│   ├── main.rs          # Entry point
│   └── jira/
│       ├── mod.rs       # JIRA module
│       ├── commands.rs  # JIRA Tauri commands
│       ├── config.rs    # Config storage commands
│       └── types.rs     # Rust JIRA types
├── Cargo.toml           # Rust dependencies
└── tauri.conf.json      # Tauri configuration

e2e/
├── utils/
│   └── tauri.ts         # Mock helpers for __TAURI_INTERNALS__.invoke
├── login.spec.ts        # Login flow tests
└── task-list.spec.ts    # Task list UI tests
```

## Development Workflow

### Building and Testing

1. **Install dependencies**: `pnpm install`
2. **Run development server**: `pnpm tauri dev`
3. **Type check**: `pnpm typecheck`
4. **Build frontend only**: `pnpm build`
5. **Build production app**: `pnpm tauri build`
6. **Lint code**: `pnpm lint`
7. **Format code**: `pnpm format`
8. **Run e2e tests**: `pnpm test:e2e`
9. **Generate Zod schemas**: `pnpm gen:zod:bindings` (auto-runs on `tauri dev`)

### Before Committing

1. Run `pnpm typecheck` to check types
2. Run `pnpm lint:fix` to fix linting issues
3. Run `pnpm format` to format code
4. Ensure `pnpm build` completes without errors
5. Run `pnpm test:e2e` if modifying UI or JIRA logic
6. Test changes manually if modifying UI

## JIRA Integration

### Authentication

- Uses Basic Auth with email + API token
- Credentials stored securely via `tauri-plugin-store`
- Never log or expose tokens in code

### API Calls

- All JIRA API calls go through `src/services/jiraClient.ts`
- Use `createJiraClient(config)` for typed, validated client
- Responses validated with Zod schemas from `bindings.zod.ts`
- Use JIRA REST API v3
- Handle errors via `mapJiraError()` for user-friendly messages
- URLs normalized via `normalizeJiraUrl()` (adds https, removes trailing slash)
- Use React Query hooks: `useCurrentUser()`, `useMyIssues()`, `useIssuesByJql()`

### Logging

- JIRA-specific logs use the `jira` target: `log::info!(target: "jira", "...")`
- Debug level enabled for JIRA logs by default
- See `LOGGING.md` for full logging documentation

### Supported Features

- Current: View unresolved issues assigned to current user
- Future roadmap in README.md

## Common Tasks

### Adding a New UI Component

1. Create component in appropriate directory (`src/components/` or `src/components/ui/`)
2. Import shadcn/ui components from `@/components/ui/`
3. Use Tailwind classes for styling
4. Add proper TypeScript types
5. Export component for use in other files

### Adding a New Tauri Command

1. Add command function in `src-tauri/src/lib.rs`
2. Register command in `invoke_handler!` macro
3. Add TypeScript types in `src/types/`
4. Create service function in `src/services/` to call the command
5. Use `invoke()` from `@tauri-apps/api/core`

### Modifying JIRA Integration

1. Update Rust types in `src-tauri/src/jira/types.rs` if needed
2. Specta auto-generates `src/types/bindings.ts` on `tauri dev`
3. ts-to-zod auto-generates `src/types/bindings.zod.ts` for validation
4. Modify `jiraClient.ts` to use new schemas for validation
5. Add/update React Query hooks in `jira.hooks.ts` if needed
6. Handle errors appropriately via `mapJiraError()`
7. Test with real JIRA instance if possible

## Security Considerations

- Never commit API tokens or credentials
- Use environment variables for sensitive config (if needed)
- Validate all user inputs
- Sanitize data from JIRA API before displaying
- Use HTTPS for all JIRA API calls
- Store credentials only via tauri-plugin-store

## Performance

- Use React Query's caching to minimize API calls
- Implement proper loading states
- Use React.memo() for expensive components if needed
- Keep bundle size reasonable - check `dist/` after builds

## Accessibility

- Use semantic HTML elements
- Include proper ARIA labels where needed
- Ensure keyboard navigation works
- Maintain good color contrast (follow shadcn/ui defaults)

## Documentation

- Update README.md for user-facing changes
- Add JSDoc comments for complex functions
- Update this AGENTS.md when adding new patterns or standards
- Document any new environment variables or configuration

## Troubleshooting

### Common Issues

1. **Build fails**: Check Tauri prerequisites are installed
2. **TypeScript errors**: Run `pnpm install` to ensure types are up to date
3. **Styling issues**: Verify Tailwind classes and check `src/index.css`
4. **API errors**: Check JIRA credentials and network connectivity

### Getting Help

- Check Tauri docs: https://tauri.app/
- Check shadcn/ui docs: https://ui.shadcn.com/
- Check React Query docs: https://tanstack.com/query/
- Check Biome docs: https://biomejs.dev/
- Check tauri-plugin-log docs: https://github.com/tauri-apps/plugins-workspace/tree/main/plugins/log
- Check Playwright docs: https://playwright.dev/

## Testing

### E2E Tests (Playwright)

- Tests in `e2e/` directory
- Mock Tauri APIs using `page.addInitScript()` 
- Mock `__TAURI_INTERNALS__.invoke()` for IPC calls
- Test UI + mocked backend responses
- Run: `pnpm test:e2e`
- Mock helpers in `e2e/utils/tauri.ts`:
  - `setupTauriMocks(responses)` - General mock setup
  - `mockJiraConfig(page, config)` - Mock stored config
  - `mockJiraError(page, message)` - Mock API errors
  - `mockJiraData` - Reusable test data
- See `e2e/README.md` for details

### Unit Tests (Rust)

- Use `cargo test` in `src-tauri/`
- Test Tauri commands and business logic
- Tests in `#[cfg(test)]` modules
- Run: `cd src-tauri && cargo test`
- Currently tests: Command error handling for invalid inputs

## Best Practices

1. **Keep changes minimal**: Only modify what's necessary
2. **Test thoroughly**: Manually test UI changes
3. **Maintain consistency**: Follow existing patterns
4. **Write clean code**: Use meaningful variable names
5. **Handle errors**: Always provide user feedback for failures
6. **Type everything**: Avoid `any`, use proper TypeScript types
7. **Use proper logging**: Use `log::*!()` macros instead of `println!()` for structured logging
7. **Document complex logic**: Add comments for non-obvious code
8. **Optimize imports**: Let Biome organize imports automatically

## Future Enhancements

See the Roadmap section in README.md for planned features.
