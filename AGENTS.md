Tauri desktop app (React + Rust). Be concise.

## Rules

- **No console.log** — use `@tauri-apps/plugin-log` (`info`, `error as logError`, `debug`, `warn`). See [docs/LOGGING.md](docs/LOGGING.md).
- **Redact sensitive data** — use `redactSensitive()` from `@/lib/utils` when logging URLs, tokens, emails.
- **Fixed versions only** — no `^`, `~`, `>=`, or `*` in `package.json` or `Cargo.toml`.
- **Credentials via tauri-plugin-store only** — never log or expose tokens.
- **Never edit auto-generated files** — `src/types/bindings.ts` and `src/types/bindings.zod.ts` are generated from Rust types. See [docs/WORKFLOWS.md](docs/WORKFLOWS.md) for the pipeline.
- **i18n** — all user-facing text must use `t()` via react-i18next. Use natural English keys (e.g., `t("Save Changes")`).
- **Run before committing** — `pnpm typecheck && pnpm lint:fix`.

## Git

Format: `<type>(<scope>): <description>` (e.g., `feat(jira): add worklog support`). Never commit secrets.

## Ask First

- Modifying `src-tauri/tauri.conf.json`
- Major refactors of `jiraClient.ts`

## Reference Docs

- [docs/WORKFLOWS.md](docs/WORKFLOWS.md) — type generation pipeline, adding commands, modifying JIRA integration
- [docs/TESTING.md](docs/TESTING.md) — Rust unit/integration tests, fixtures
- [e2e/README.md](e2e/README.md) — Playwright E2E tests
- [docs/LOGGING.md](docs/LOGGING.md) — logging setup and best practices
- [docs/UPDATES.md](docs/UPDATES.md) — auto-update functionality
