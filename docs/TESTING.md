# Testing

## E2E Tests (Playwright)

See [e2e/README.md](../e2e/README.md) for details.

```bash
pnpm test:e2e
```

## Unit Tests (Rust)

```bash
cd src-tauri && cargo test
```

Tests live in `#[cfg(test)]` modules within each file. Categories:
- **Parsing tests**: JSON to Rust struct deserialization
- **Type tests**: Serialization roundtrips, default values
- **Pure function tests**: Date parsing, comment extraction

## Integration Tests (Rust + wiremock)

```bash
cd src-tauri && cargo test --test jira_api
```

Location: `src-tauri/tests/jira_api.rs`. Uses `wiremock` to mock JIRA HTTP endpoints and test full request/response flows without hitting real JIRA.

## JSON Fixtures

Location: `src-tauri/src/jira/fixtures/`
Naming: `<endpoint>_<scenario>.json` (e.g., `myself_success_v3.json`, `search_jql_error.json`)

Used by integration tests with `include_str!()`.

### Adding new fixtures

1. Capture real JIRA API response (sanitize sensitive data)
2. Save to `fixtures/` with descriptive name
3. Write test using `include_str!()` to load fixture
4. Parse and verify expected fields

### Reproducing JIRA API Issues

1. Capture the response: save the JSON body to `fixtures/<endpoint>_<issue>.json`
2. Write a failing test that loads the fixture and exposes the bug
3. Fix the parsing/handling code
4. Verify the test passes
