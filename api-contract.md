# API Contract

## Context

- The frontend is built first. CalendarSite is the Next.js client.
- The backend is a separate service written in a non-TypeScript, non-JavaScript language.
- The contract is the single source of truth between the two. It is emitted as an OpenAPI document generated from the frontend's Zod schemas.
- The frontend develops against a mock implementation of the contract until the backend exists.
- MCP over HTTP (`POST /mcp`) is backend-only. The frontend consumes the REST API only.

## Locked decisions

- Database: PostgreSQL.
- Bearer token lifetime: 24 hours.
- Nonexistent and ambiguous DST times return `INVALID_INPUT`.
- Admin UI is role-gated inside the web app. There is no separate admin app.
- Resources are created by admins.
- Role is a backend authorization concern. URLs do not contain an `/admin/` prefix.

## Authorization model

- Endpoints describe resources and actions, not roles.
- The backend enforces all authorization based on the authenticated user's role and ownership.
- Non-admin callers of admin-only endpoints receive `FORBIDDEN`.
- Cancel and reschedule accept the appointment owner or an admin.
- UI visibility based on role is a convenience only. It is never a security boundary.

## API surface

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
- Shared filters: `resourceId`, `from`, `to`, `status`.
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

## Datetime contract

- Input: `date` (`YYYY-MM-DD`), `startTime` (`HH:mm`), `endTime` (`HH:mm`), interpreted in `America/Los_Angeles`.
- Output: ISO 8601 UTC timestamps plus a Seattle-formatted field.
- Nonexistent local times (spring-forward) return `INVALID_INPUT`.
- Ambiguous local times (fall-back) return `INVALID_INPUT`.
- `endTime` must be strictly after `startTime`.

## Open decisions

- Token storage: direct client-to-backend calls with CORS, or an httpOnly cookie via a Next.js BFF proxy.
- Folder layout: root-level `contract/` and `lib/`, or both under `src/`.
