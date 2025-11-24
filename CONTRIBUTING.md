# Contributing to Worktrace

Thank you for your interest in contributing to Worktrace! We welcome contributions from the community.

## Reporting Issues

If you find a bug or have a feature request, please open an issue on GitHub. We have provided issue templates to help you structure your report.

### Before Opening an Issue
1. **Search existing issues**: Check if your issue has already been reported.
2. **Check the documentation**: Make sure you're using the app correctly.

### How to Report a Bug
Please include the following information:
- **Description**: A clear and concise description of the bug.
- **Steps to Reproduce**: Detailed steps to reproduce the behavior.
- **Expected Behavior**: What you expected to happen.
- **Screenshots**: If applicable, add screenshots to help explain your problem.
- **Environment**: OS (macOS/Windows/Linux), App Version.

### How to Request a Feature
- **Description**: A clear and concise description of the feature.
- **Use Case**: Why do you need this feature? How will it help you?

## Contributing Code

1. **Fork the repository**.
2. **Create a new branch**: `git checkout -b feature/my-feature` or `fix/my-bug`.
3. **Make your changes**.
4. **Run tests**: Ensure all tests pass (`pnpm test:e2e`, `cargo test`).
5. **Lint and Format**: Run `pnpm lint:fix` and `pnpm format`.
6. **Commit your changes**: Use conventional commits (e.g., `feat: add new button`, `fix: resolve crash`).
7. **Push to your branch**: `git push origin feature/my-feature`.
8. **Open a Pull Request**.

## Development Setup

See the [README.md](README.md) for instructions on how to set up the development environment.

We recommend using **Dev Containers** for:
- Frontend development (using `pnpm dev:vite` with mocks)
- Running E2E tests (`pnpm test:e2e`)
- Ensuring consistent tooling versions

For full application development involving the Rust backend, we recommend setting up the environment **natively** on your host machine to avoid GUI/GTK issues.

## Code Standards

- **Frontend**: React, TypeScript, Tailwind CSS, shadcn/ui.
- **Backend**: Rust, Tauri.
- **Linting**: We use Biome for linting and formatting.
- **Testing**: Playwright for E2E tests.

## License

By contributing, you agree that your contributions will be licensed under the project's license.

## Security configuration & CSP (short guide)

Keep security-critical configuration in a single place to avoid drift and accidental regressions.

- Dev-only CSP: use `src-tauri/tauri.conf.json` → `app.security.devCsp` for permissive settings used only during local development.
- Production CSP: keep `src-tauri/tauri.conf.json` → `app.security.csp` strict and without `unsafe-inline`, `unsafe-eval`, or `localhost` references.
- CI enforcement: the repository runs `scripts/ci/check-security.mts` in CI to validate CSP presence and basic safety rules — do not remove or weaken it without review.
- Ownership: changes to `src-tauri/tauri.conf.json`, security scripts, build-with-key, and workflows are protected by `CODEOWNERS`. Please request review from the listed owners when touching these files.

If you need to loosen the CSP for test or temporary work, use a short-lived PR with a clear justification and reviewers assigned via CODEOWNERS.
