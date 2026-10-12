# CalendarSite Project Index

Single-page summary: CalendarSite is a Next.js App Router frontend for an appointment scheduling system. The UI codes against one typed `ApiClient` interface backed by an HTTP client. The API shape is defined once in `contract/` as Zod schemas and emitted as OpenAPI for a separate non-TypeScript backend. The frontend consumes REST only; MCP (`POST /mcp`) is backend-only.

## Read this first

| Question | Answer |
|---|---|
| Where is the API shape defined? | `contract/schemas/*.ts` |
| Where is the REST client? | `lib/api/http.ts` |
| Where is auth/session state? | `lib/session/session-context.tsx` |
| Where is timezone logic? | `lib/time.ts` |
| Where are the pages/routes? | `app/` |
| Where are shared UI pieces? | `components/` |
| Where are the tests? | `tests/` |
| Where is the generated OpenAPI doc? | `contract/out/openapi.json` |
| Where are the authoritative spec docs? | `project.md`, `api-contract.md`, `backend-handoff.md` |

## Never read (wasteful)

- `node_modules/` (dependencies)
- `.next/` (build output)
- `contract/out/` (generated; run `npm run contract:generate` instead)
- `tsconfig.tsbuildinfo`, `package-lock.json` (build/dependency caches)

## Feature lookup map

| Feature | Primary files |
|---|---|
| Login / register / me / logout | `app/(auth)/login/page.tsx`, `app/(auth)/register/page.tsx`, `lib/session/session-context.tsx`, `lib/api/session.ts`, `contract/schemas/auth.ts` |
| Appointments: create/list/cancel/reschedule | `app/(app)/appointments/**`, `components/appointment-form.tsx`, `contract/schemas/appointments.ts`, `lib/api/http.ts` |
| Resources: list/create/edit/deactivate | `app/(app)/resources/page.tsx`, `components/resource-form.tsx`, `contract/schemas/resources.ts` |
| Admin user management (role/isAgent) | `app/(admin)/users/page.tsx`, `components/user-table.tsx`, `contract/schemas/users.ts` |
| Route protection / redirects | `components/route-guard.tsx`, `app/(app)/layout.tsx`, `app/(admin)/layout.tsx` |
| Error envelope + messages | `contract/errors.ts`, `lib/api/errors.ts`, `lib/api/error-message.ts`, `components/error-banner.tsx` |
| Seattle <-> UTC conversion and formatting | `lib/time.ts`, `contract/schemas/common.ts` |
| HTTP client selection | `lib/api/index.ts`, `.env.example` |

## Architecture

```
app/* pages + components/*        (UI, client components)
        |
        v  useSession() / getApiClient()
lib/session/session-context.tsx   (auth state)
lib/api/                          (ApiClient interface + HTTP implementation)
        |
        v  Zod schemas for validation
contract/schemas/*.ts             (single source of truth for types/shapes)
```

- `lib/api/client.ts` defines the `ApiClient` interface; every UI call goes through it.
- `lib/api/index.ts` builds the HTTP client from `NEXT_PUBLIC_API_URL` and throws if it is missing.
- `contract/` has no runtime I/O; it is pure schema + type definitions.
- There is no backend code in this repo. `backend-handoff.md` is the spec for the separate backend.

## Directory catalogue

### Root files

| File | Purpose |
|---|---|
| `project.md` | Full MVP spec: data model, auth rules, timezone rules, MCP tools, acceptance criteria. Source of truth for scope. |
| `api-contract.md` | REST API surface, authorization model, error codes, datetime contract. |
| `backend-handoff.md` | Backend-facing contract: locked decisions, endpoint tables, object shapes, seed parity, ports, CORS. |
| `readme.md` | Setup, scripts, ports, seed credentials, backend configuration. |
| `package.json` | Scripts and deps. Next 16.4, React 19.3, zod 3, vitest, tsx, zod-to-openapi. |
| `next.config.ts` | `cacheComponents`, `partialPrefetching`, `allowedDevOrigins`, Tailwind Turbopack rule. |
| `tsconfig.json` | Strict mode; `@/*` alias maps to repo root. |
| `vitest.config.ts` | Node test env; `@` alias for Vitest. |
| `eslint.config.mjs` | Flat ESLint config (Next defaults). |
| `.env.example` | `NEXT_PUBLIC_API_URL`. |
| `startup.bat` | Runs `npm run start` (production serve on `127.0.0.1:3000`). |
| `AGENTS.md` | Auto-generated Next.js agent rules; points at `node_modules/next/dist/docs/`. |

### app/ (Next.js App Router)

Route groups `(auth)`, `(app)`, `(admin)` do not affect URLs.

| Route | Files | Purpose |
|---|---|---|
| `/` | `app/page.tsx` | Redirects to `/appointments` or `/login` based on session status. |
| root layout | `app/layout.tsx`, `app/globals.css` | Fonts, metadata, `SessionProvider`, global Tailwind styles. |
| `/login` | `app/(auth)/login/page.tsx` | Sign-in form. |
| `/register` | `app/(auth)/register/page.tsx` | Account creation form. |
| auth layout | `app/(auth)/layout.tsx` | Centered card layout for auth pages. |
| app layout | `app/(app)/layout.tsx` | Wraps authenticated pages in `RouteGuard` + `AppShell`. |
| `/appointments` | `app/(app)/appointments/page.tsx` | Lists appointments, cancel action, admin filters. |
| `/appointments/new` | `app/(app)/appointments/new/page.tsx`, `new-appointment-content.tsx` | Create form. |
| `/appointments/[id]/reschedule` | `app/(app)/appointments/[id]/reschedule/page.tsx`, `reschedule-content.tsx` | Reschedule form. |
| `/resources` | `app/(app)/resources/page.tsx` | Lists resources; admin create/edit/deactivate inline. |
| admin layout | `app/(admin)/layout.tsx` | `RouteGuard requireAdmin` + `AppShell`. |
| `/users` | `app/(admin)/users/page.tsx` | Admin user management. |

### components/

| File | Purpose |
|---|---|
| `app-shell.tsx` | Header nav, admin link, logout. |
| `route-guard.tsx` | Redirects anonymous users to `/login`, non-admins away from admin routes. |
| `appointment-form.tsx` | Create/reschedule form; validates with contract schemas. |
| `resource-form.tsx` | Create/edit resource form. |
| `error-banner.tsx` | Renders an `ApiError` or string as a red banner. |
| `user-table.tsx` | Admin table with role promotion and `isAgent` toggle. |

### contract/

| File | Purpose |
|---|---|
| `index.ts` | Barrel re-export for all schemas, types, and errors. Import from `@/contract`. |
| `errors.ts` | `ErrorCodes` constants, `errorEnvelopeSchema`, `ErrorEnvelope`. |
| `openapi.ts` | Builds the OpenAPI document from the `paths/*` registrations. |
| `schemas/common.ts` | Shared `email`, `uuid`, `date`, `time`, `isoTimestamp` schemas; `timeToMinutes`. |
| `schemas/auth.ts` | `registerInput`, `loginInput`, register/login output schemas. |
| `schemas/users.ts` | `User`, `roleSchema`, `updateUserInput`. |
| `schemas/resources.ts` | `Resource`, create/update input, list output. |
| `schemas/appointments.ts` | Appointment statuses, create/reschedule inputs, list query, `Appointment`, list output. |
| `paths/auth.ts` | OpenAPI registrations for `/auth/*`. |
| `paths/resources.ts` | OpenAPI registrations for `/resources` and `/resources/{id}`. |
| `paths/users.ts` | OpenAPI registrations for `/users` and `/users/{id}`. |
| `paths/appointments.ts` | OpenAPI registrations for `/appointments*`. |
| `out/openapi.json` | Generated OpenAPI doc. Do not edit. |

### lib/

| File | Purpose |
|---|---|
| `api/client.ts` | `ApiClient` interface; the contract every UI call codes against. |
| `api/http.ts` | `HttpApiClient`; REST calls, bearer auth, response parsing, error envelope handling. |
| `api/index.ts` | `createApiClient`/`getApiClient`; builds the HTTP client from env. |
| `api/session.ts` | `createTokenStore`; token in `localStorage`. |
| `api/errors.ts` | `ApiError` class (code, message, status, details). |
| `api/error-message.ts` | `errorMessage()`; human-readable fallback per error code. |
| `api/result.ts` | `Result<T,E>` union plus `ok`/`err` helpers. |
| `session/session-context.tsx` | `SessionProvider`/`useSession`; login/register/logout/me state. |
| `time.ts` | Seattle wall time to UTC, local ISO formatting, range formatting. |
| `validation.ts` | `firstZodMessage()`; first Zod issue message. |

### scripts/

| File | Purpose |
|---|---|
| `generate-contract.ts` | Writes `contract/out/openapi.json`. Run via `npm run contract:generate`. |

### tests/

| File | Purpose |
|---|---|
| `schemas.test.ts` | Zod schema validation edge cases. |
| `time.test.ts` | Seattle timezone conversion and formatting. |

## Key invariants and gotchas

- The frontend requires `NEXT_PUBLIC_API_URL`; `createApiClient` throws if it is missing.
- Seed parity: `admin@example.com` / `password123` (admin), `user@example.com` / `password123` (user), resources `Room A` and `Room B`, both active.
- Timezone: input is `date` + `startTime`/`endTime` in `America/Los_Angeles`; storage is UTC; responses include both UTC and local ISO fields.
- Error envelope: `{ "error": { "code", "message", "details"? } }`.
- Overlap is half-open `[startAt, endAt)`, per resource, booked appointments only.
- Cancel is a soft delete (status `cancelled`); resource delete is deactivation (`active: false`).
- There is no `GET /appointments/{id}`. The reschedule page lists appointments and finds the target locally.

## Regenerate the contract

```bash
npm run contract:generate
```

This runs `tsx scripts/generate-contract.ts` and writes `contract/out/openapi.json`.
