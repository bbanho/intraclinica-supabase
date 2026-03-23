---
title: Testing Workflow
description: How to run unit tests, E2E tests, and type checking in IntraClinica.
---

# Testing Workflow

IntraClinica uses **Vitest** for unit tests and **Playwright** for E2E/UI audits. All frontend operations run inside `/frontend`.

## Commands

### Unit Tests

```bash
cd frontend
npm run test              # run all tests once
npm run test -- auth.spec.ts    # single file
npx vitest run path/to/file.spec.ts  # alternative
```

### Type Checking

```bash
cd frontend
./node_modules/.bin/tsc --noEmit
```

::: warning Zero errors before commit
`tsc --noEmit` must report **exactly 0 errors** before committing. Supabase generated types and strict Angular generics will surface errors that `ng build` silently swallows.
:::

### E2E / UI Audits

```bash
cd frontend
npx playwright test              # run all E2E specs
npx playwright test --ui          # interactive UI mode
npx playwright test reception     # single spec
```

### Dev Server

```bash
cd frontend
npm run dev   # Angular dev server on http://localhost:3000
```

### Production Build

```bash
cd frontend
npm run build  # production build output to dist/
```

## Test File Conventions

- Unit test files: `*.spec.ts` alongside the source file
- E2E specs: `e2e/*.spec.ts`
- Fixtures: `e2e/fixtures/*.ts`

## Vitest Configuration

Vitest is configured via `vitest.config.ts` at the frontend root. Key settings:

```typescript
// vitest.config.ts
export default defineConfig({
  environment: 'jsdom',
  globals: true,          // provides describe, it, expect globally
  setupFiles: ['src/test-setup.ts'],
  include: ['src/**/*.{test,spec}.{js,mjs}']
})
```

## Mocking Supabase Clients

Vitest mocks `@supabase/supabase-js` to avoid real DB calls during unit tests:

```typescript
// test-setup.ts
import { vi } from 'vitest'
import * as supabaseModule from '@supabase/supabase-js'

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ data: [], error: null })
      })
    }),
    rpc: vi.fn()
  }))
}))
```

## Playwright Configuration

Playwright uses `playwright.config.ts`:

```typescript
export default defineConfig({
  testDir: './e2e',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry'
  },
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: true
  }
})
```

## Coverage

Generate coverage reports with:

```bash
npx vitest run --coverage
```

Coverage thresholds are enforced in CI — PRs that drop coverage below the threshold will fail.

## Related Pages

- [Local Development](./local-development) — dev server setup
- [Core Architecture: Multi-Tenant Security](../core-architecture/multi-tenant-security) — clinicId context
