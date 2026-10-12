# API Contract

## Context

- The frontend is built first. CalendarSite is the Next.js client.
- The backend is a separate service written in **Go** (`CalendarBackend`), not TypeScript or JavaScript.
- The contract is the single source of truth between the two. It is emitted as an OpenAPI document generated from the frontend's Zod schemas.
- The frontend calls the backend directly through an HTTP client typed against the contract.
- MCP over HTTP (`POST /mcp`) is backend-only. The frontend consumes the REST API only.

> **Status note.** This is the pre-implementation contract document. The backend
> now exists and supersedes it wherever they differ. The cross-repo reference is
> `../documentation/unified-documentation.md`. In particular:
>
> - `DELETE /users/{id}` is implemented and documented below.
> - The generated document, `contract/out/openapi.json`, is **not committed** — it
>   is git-ignored and must be produced with `npm run contract:generate`.
> - That generated document declares the backend at `http://localhost:4000`. That
>   remote matches the **deployed** port; the local dev default is
>   `127.0.0.1:4001`. There is no conflict — see `readme.md`, "Why two different
>   ports".
> - The DST rules below are enforced by the **backend**; the frontend's
>   `lib/time.ts` helpers are best-effort and are not on any production path.

## Locked decisions

- Database: PostgreSQL.
- Bearer token lifetime: 24 hours.
- Nonexistent and ambiguous DST times return `INVALID_INPUT`.
- Admin UI is role-gated inside the web app. There is no separate admin app.
- Resources are created by admins.
- Role is a backend authorization concern. URLs do not contain an `/admin/` prefix.
- The frontend calls the backend directly from the browser with CORS. The bearer token is stored in `localStorage`.
- Folder layout is root-level `contract/` and `lib/`.

## Authorization model

- Endpoints describe resources and actions, not roles.
- The backend enforces all authorization based on the authenticated user's role and ownership.
- Non-admin callers of admin-only endpoints receive `FORBIDDEN`.
- Cancel and reschedule accept the appointment owner or an admin.
- UI visibility based on role is a convenience only. It is never a security boundary.

## API surface

`GET /healthz` on the same service is an unauthenticated liveness probe returning
`200 {"status":"ok"}`. It is not registered in the generated OpenAPI document.

### Auth

| Method | Path | Access | Purpose |
|---|---|---|---|
| POST | `/auth/register` | public | create user |
| POST | `/auth/login` | public | return bearer token and `expiresAt` |
| GET | `/auth/me` | authenticated | return `id`, `email`, `role`, `isAgent` |

### Resources

| Method | Path | Access | Purpose |
|---|---|---|---|
| GET | `/resources` | authenticated | list active resources |
| POST | `/resources` | admin | create resource |
| PATCH | `/resources/:id` | admin | edit resource |
| DELETE | `/resources/:id` | admin | deactivate resource |

### Users

| Method | Path | Access | Purpose |
|---|---|---|---|
| GET | `/users` | admin | list users |
| PATCH | `/users/:id` | admin | set `role` or `isAgent` |
| DELETE | `/users/:id` | admin | delete user |

### Appointments

| Method | Path | Access | Purpose |
|---|---|---|---|
| POST | `/appointments` | authenticated | create appointment |
| GET | `/appointments` | authenticated | list, scoped by role |
| POST | `/appointments/:id/cancel` | owner or admin | cancel appointment |
| POST | `/appointments/:id/reschedule` | owner or admin | reschedule appointment |

## Response shapes

- Collections return `{ "<plural>": [...] }`, for example `{ "resources": [...] }`.
- Single resources return the object directly, for example `POST /resources` returns a `Resource`.
- `auth.register` returns `{ "userId": "..." }`.
- `auth.login` returns `{ "token": "...", "expiresAt": "..." }`.

## List scoping

- `GET /appointments` returns the caller's own appointments for a normal user.
- For an admin it returns all appointments, with an optional `userId` filter.
- Shared filters: `resourceId`, `title`, `from`, `to`, `status`.
- `title` is a case-insensitive substring match.
- `from` and `to` are calendar dates interpreted in `America/Los_Angeles`.

## Error envelope

```json
{
  "error": {
    "code": "CONFLICT",
    "message": "...",
    "details": {}
  }
}
```

Codes: `INVALID_INPUT`, `UNAUTHENTICATED`, `FORBIDDEN`, `NOT_FOUND`, `CONFLICT`, `INTERNAL`.

## Authentication

- Requests send `Authorization: Bearer <token>`.
- Tokens expire 24 hours after issue.
- `auth.login` returns `{ "token": "...", "expiresAt": "..." }`.
- Passwords are argon2id-hashed and must be at least 8 characters.
- Email is trimmed and lowercased before storage and comparison.
- Tokens are stored hashed (SHA-256) in a `sessions` table; the plaintext is never persisted.

## Datetime contract

- Input: `date` (`YYYY-MM-DD`), `startTime` (`HH:mm`), `endTime` (`HH:mm`), interpreted in `America/Los_Angeles`.
- Output: ISO 8601 UTC timestamps plus a Seattle-formatted field.
- Nonexistent local times (spring-forward) return `INVALID_INPUT`.
- Ambiguous local times (fall-back) return `INVALID_INPUT`.
- `endTime` must be strictly after `startTime`.
