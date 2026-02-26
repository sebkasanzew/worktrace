# Workflows

## Type Generation Pipeline

Types flow from Rust to TypeScript automatically:

```
Rust types (src-tauri/src/jira/types.rs)
  → Specta (runs on `pnpm dev`)
    → src/types/bindings.ts
      → ts-to-zod (config: ts-to-zod.config.mjs)
        → src/types/bindings.zod.ts
```

Both `bindings.ts` and `bindings.zod.ts` are auto-generated. **Never edit them manually.**

To add or modify types:
1. Define types in `src-tauri/src/jira/types.rs`
2. Register commands in `src-tauri/src/bindings.rs`
3. Run `pnpm dev` to regenerate both files
4. Use Zod schemas from `bindings.zod.ts` for runtime validation

## Adding a New Tauri Command

1. Add command function in `src-tauri/src/lib.rs`
2. Register in `invoke_handler!` macro
3. Run `pnpm dev` to auto-generate TypeScript types
4. Create service function in `src/services/` using `invoke()` from `@tauri-apps/api/core`

## Modifying JIRA Integration

1. Update Rust types in `src-tauri/src/jira/types.rs` if needed
2. Run `pnpm dev` to regenerate bindings
3. Modify `jiraClient.ts` to use new schemas for validation
4. Add/update React Query hooks in `jira.hooks.ts` if needed
5. Handle errors via `mapJiraError()`

## Adding a UI Component

1. Use `pnpm ui:add <component-name>` for shadcn/ui components
2. Feature components go in `src/components/`
3. UI primitives go in `src/components/ui/`
