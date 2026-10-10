# Backend Hand-Off

## Purpose

This document is the contract between the CalendarSite frontend and the backend. The backend is written in a non-TypeScript, non-JavaScript language.

The frontend was built against an in-memory mock that implements this contract. The backend replaces the mock without changing the frontend.

## Source of truth

| Artifact | What it is |
|---|---|
| `contract/out/openapi.json` | Machine-readable OpenAPI document. Regenerate with `npm run contract:generate`. |
| `contract/` | Zod schemas and OpenAPI path registrations that generate the document. |
| `api-contract.md` | Human-readable API surface and authorization model. |
| `project.md` | Full MVP spec: data model, auth, timezone rules, MCP, acceptance criteria. |

The OpenAPI document is the authoritative machine contract. This file summarizes the parts the backend must get exactly right.

## Locked decisions

- Database: PostgreSQL.
- Bearer token lifetime: 24 hours.
- Nonexistent and ambiguous DST times return `INVALID_INPUT`.
- Admin is a role on a normal user. URLs do not contain an `/admin/` prefix.
- Resources are created by admins.
- The frontend stores the token and calls the backend directly over HTTP.
- `from` and `to` on `GET /appointments` are calendar dates in America/Los_Angeles.
- Frontend dev origin: `http://localhost:3000`. Frontend production origin: `http://localhost`.
- Backend serves REST and MCP on port `4000`.

## API surface

Authorization values: `public`, `user`, `admin`, or `owner or admin`.

### Auth

| Method | Path | Access | Request | Response |
|---|---|---|---|---|
| POST | `/auth/register` | public | `{ "email": string, "password": string }` | `201` `{ "userId": string }` |
| POST | `/auth/login` | public | `{ "email": string, "password": string }` | `200` `{ "token": string, "expiresAt": string }` |
| GET | `/auth/me` | user | none | `200` `User` |

`register` returns only `userId`. The frontend then calls `login` itself.

### Resources

| Method | Path | Access | Request | Response |
|---|---|---|---|---|
| GET | `/resources` | user | none | `200` `{ "resources": Resource[] }` |
| POST | `/resources` | admin | `{ "name": string, "description"?: string, "timezone"?: string }` | `201` `Resource` |
| PATCH | `/resources/{id}` | admin | partial of the create body | `200` `Resource` |
| DELETE | `/resources/{id}` | admin | none | `200` `Resource` (deactivated) |

`DELETE` deactivates by setting `active` to `false`. It does not delete the row.

### Users

| Method | Path | Access | Request | Response |
|---|---|---|---|---|
| GET | `/users` | admin | none | `200` `{ "users": User[] }` |
| PATCH | `/users/{id}` | admin | `{ "role"?: "user" \| "admin", "isAgent"?: boolean }` | `200` `User` |

At least one of `role` or `isAgent` is required.

### Appointments

| Method | Path | Access | Request | Response |
|---|---|---|---|---|
| POST | `/appointments` | user | `{ "resourceId": string, "date": string, "startTime": string, "endTime": string }` | `201` `Appointment` |
| GET | `/appointments` | user | query: `resourceId?`, `userId?`, `from?`, `to?`, `status?` | `200` `{ "appointments": Appointment[] }` |
| POST | `/appointments/{id}/cancel` | owner or admin | none | `200` `Appointment` |
| POST | `/appointments/{id}/reschedule` | owner or admin | `{ "date": string, "startTime": string, "endTime": string }` | `200` `Appointment` |

## Object shapes

### User

```json
{
  "id": "uuid",
  "email": "string",
  "role": "user | admin",
  "isAgent": false,
  "createdAt": "ISO UTC"
}
```

### Resource

```json
{
  "id": "uuid",
  "name": "string",
  "description": "string | null",
  "timezone": "America/Los_Angeles",
  "active": true,
  "createdAt": "ISO UTC"
}
```

`description` is nullable, not optional, in responses.

### Appointment

```json
{
  "id": "uuid",
  "userId": "uuid",
  "resourceId": "uuid",
  "startAt": "ISO UTC",
  "endAt": "ISO UTC",
  "startAtLocal": "Seattle ISO with offset",
  "endAtLocal": "Seattle ISO with offset",
  "status": "booked | cancelled",
  "createdAt": "ISO UTC",
  "updatedAt": "ISO UTC",
  "cancelledAt": "ISO UTC | null"
}
```

## Response shapes

- Collections return `{ "<plural>": [...] }`.
- Single resources return the object directly.
- Errors always use the envelope below.

## Error contract

```json
{
  "error": {
    "code": "CONFLICT",
    "message": "Overlapping booking",
    "details": {}
  }
}
```

`details` is optional and may be omitted.

| Code | HTTP status | Used for |
|---|---|---|
| `INVALID_INPUT` | 400 | schema violations, nonexistent or ambiguous DST times, `endTime <= startTime` |
| `UNAUTHENTICATED` | 401 | missing or expired token, wrong email or password |
| `FORBIDDEN` | 403 | wrong role or not the owner |
| `NOT_FOUND` | 404 | missing user, resource, or appointment, or inactive resource |
| `CONFLICT` | 409 | overlapping booking, duplicate email, already cancelled |
| `INTERNAL` | 500 | unexpected errors |

## Authentication

- Requests send `Authorization: Bearer <token>`.
- Tokens are opaque, expire after 24 hours, and are stored hashed in the `sessions` table.
- Passwords use `argon2id` or `bcrypt`. Plaintext is never stored or logged.
- Email is normalized with trim and lowercase before storage and comparison.
- Password minimum length is 8.

## Datetime contract

Input is a date plus two wall-clock times in `America/Los_Angeles`:

```json
{
  "date": "2026-10-10",
  "startTime": "14:00",
  "endTime": "15:00"
}
```

Rules:

- Store as `TIMESTAMPTZ` in UTC.
- `endTime` must be strictly after `startTime`.
- Spring-forward nonexistent times return `INVALID_INPUT`.
- Fall-back ambiguous times return `INVALID_INPUT`.
- `startAt` and `endAt` are UTC ISO strings with `Z`.
- `startAtLocal` and `endAtLocal` are ISO strings with the Seattle offset, for example `2026-10-10T14:00:00-07:00`.
- The overlap interval is half-open: `[startAt, endAt)`.

## Data model

See `project.md` section 4. The required tables are `users`, `resources`, `appointments`, and `sessions`.

The overlap invariant must be enforced at the database level with the PostgreSQL exclusion constraint in `project.md` section 4. Cancelled appointments do not block overlaps.

## Business rules

- A user lists their own appointments. An admin lists all appointments and may filter by `userId`.
- Cancel and reschedule accept the appointment owner or an admin.
- Reschedule validates the same way as create, and the overlap check excludes the appointment being rescheduled.
- Admin endpoints return `FORBIDDEN` for non-admins.

## MCP over HTTP

`POST /mcp` is backend-only. The frontend does not call it. Implement it against `project.md` section 8 using the same core services.

## Dev seed parity

The frontend mock seeds these values. Seed the backend the same way for a frictionless first connection:

- `admin@example.com` / `password123`, role `admin`.
- `user@example.com` / `password123`, role `user`.
- `Room A`, `Room B`, both active, timezone `America/Los_Angeles`.

## Ports and origins

- Frontend dev server: `http://localhost:3000`.
- Frontend production server: `http://localhost` (port 80).
- Backend REST and MCP: `http://localhost:4000`. MCP is `POST /mcp` on the same service.
- The backend CORS allowlist includes `http://localhost:3000` and `http://localhost`.
- The frontend points at the backend with `NEXT_PUBLIC_API_URL=http://localhost:4000`.
