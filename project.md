# Appointment System — MVP Hand-Off Document

## Summary

This document specifies an MVP appointment scheduling system built in TypeScript with an SQL database. It serves two kinds of clients through one shared backend: a human web interface and an MCP-over-HTTP interface for agents. Both interfaces authenticate with email and password, and both operate on the same core appointment logic.

Appointments are booked against a **resource** (minimal for MVP), and **overlapping booked appointments are prevented per resource** at the database level. All times are entered and displayed in **Pacific / Seattle time (`America/Los_Angeles`)** and stored in UTC. Users can **create, cancel, reschedule, and list** their own appointments. Admins can manage users, resources, and all appointments. Agents are ordinary users that can later be flagged as agent accounts.

MVP boundaries are intentionally small: no email verification, no notifications, no recurring appointments, no availability windows, no separate agent registration flow.

---

## 1. Scope

### In scope
- Email/password registration and login.
- Authenticated appointment creation.
- Appointment cancel and reschedule.
- Appointment listing for the owning user.
- Resource-based bookings with overlap prevention per resource.
- Seattle timezone handling with DST correctness.
- MCP over HTTP for agents, with `auth.login` returning a Bearer token.
- Agent accounts modeled as normal users with an `is_agent` flag.
- Admin views for users, resources, and appointments.
- SQL persistence with migrations.

### Out of scope
- Email verification.
- Password reset flow (may be added later; not required for MVP).
- Notifications (email, SMS, webhook).
- Recurring appointments.
- Availability windows or working hours per resource.
- Buffer times before/after appointments.
- Resource capacity, location, or skills.
- Multi-tenant / organization separation.
- Billing or payments.
- Refresh tokens for MCP agents (short-lived tokens only for MVP).

---

## 2. Tech stack and constraints

| Area | Choice |
|---|---|
| Language | TypeScript (strict mode) |
| Database | SQL (PostgreSQL recommended for `tstzrange` overlap constraint) |
| Web app | TypeScript web framework (Next.js, Remix, or similar) |
| MCP transport | MCP over HTTP (Streamable HTTP / JSON-RPC) |
| Timezone library | `Temporal`, `Luxon`, or `date-fns-tz` |
| Password hashing | `argon2id` or `bcrypt` |
| Validation | Zod or equivalent schema validation |

---

## 3. Architecture

```text
apps/
  web/          -> website + HTTP API for humans
  mcp-server/   -> MCP over HTTP server for agents
  admin/        -> admin views (can live inside web)

packages/
  core/         -> auth + appointment use cases (shared business logic)
  db/           -> SQL client, migrations, repositories
  shared/       -> types, validation, error codes, timezone helpers
```

Both `web` and `mcp-server` call the same `packages/core` services. No business logic should live in the transport layer.

### Shared core services
- `register(email, password)`
- `login(email, password)`
- `listResources()`
- `createAppointment(userId, resourceId, startAt, endAt)`
- `cancelAppointment(userId, appointmentId)`
- `rescheduleAppointment(userId, appointmentId, startAt, endAt)`
- `listAppointments(userId, filters)`
- Admin variants: `adminListUsers`, `adminListAppointments`, `adminCancelAppointment`, etc.

---

## 4. Data model

### users
```sql
users (
  id UUID PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'user',      -- user | admin
  is_agent BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
)
```

### resources
```sql
resources (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  timezone TEXT NOT NULL DEFAULT 'America/Los_Angeles',
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
)
```

### appointments
```sql
appointments (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id),
  resource_id UUID NOT NULL REFERENCES resources(id),
  start_at TIMESTAMPTZ NOT NULL,
  end_at TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'booked',  -- booked | cancelled
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  cancelled_at TIMESTAMPTZ,
  CHECK (end_at > start_at)
)
```

### sessions
```sql
sessions (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id),
  token_hash TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL
)
```

### Overlap prevention (PostgreSQL)
```sql
ALTER TABLE appointments
ADD CONSTRAINT no_overlapping_booked
EXCLUDE USING gist (
  resource_id WITH =,
  tstzrange(start_at, end_at, '[)') WITH &&
)
WHERE (status = 'booked');
```

Cancelled appointments do not block overlaps.

---

## 5. Authentication specification

- Registration requires `email` and `password`.
- Passwords are hashed with `argon2id` or `bcrypt`. Plaintext is never stored or logged.
- Login verifies the password hash and issues a short-lived Bearer token.
- Tokens are stored hashed in the `sessions` table.
- No email verification in MVP.
- No password reset in MVP.
- Role defaults to `user`. Admin is set manually or by an existing admin.
- `is_agent` defaults to `false`. It can be toggled by an admin.

### Token rules
- Bearer tokens are sent in `Authorization: Bearer <token>`.
- Tokens expire (recommended: 1–24 hours for MVP; pick one and document it).
- Expired or missing tokens return `UNAUTHENTICATED`.

---

## 6. Appointment specification

### Input shape (from user or agent)
```json
{
  "resourceId": "uuid",
  "date": "2026-10-10",
  "startTime": "14:00",
  "endTime": "15:00"
}
```

### Rules
- Requires an authenticated user.
- `resourceId` must reference an existing, active resource.
- `endTime` must be strictly after `startTime`.
- The time window is interpreted in `America/Los_Angeles`.
- If the local time is nonexistent (spring-forward), reject with `INVALID_INPUT`.
- If the local time is ambiguous (fall-back), pick the earlier offset or reject — pick one and document it.
- Overlap check is per resource among `status = 'booked'` appointments.
- Insert as `status = 'booked'`.

### Cancel
- Owner or admin only.
- Sets `status = 'cancelled'` and `cancelled_at = now()`.
- Cancelled appointments no longer block overlaps.

### Reschedule
- Owner or admin only.
- Updates `start_at`, `end_at`, `updated_at`.
- Overlap check excludes the appointment being rescheduled.
- Must pass the same validation as create.

### List
- User sees their own appointments.
- Admin sees all appointments.
- Filters: resource, date range, status.

---

## 7. Timezone specification

- Canonical storage: `TIMESTAMPTZ` in UTC.
- Input interpretation: `America/Los_Angeles`.
- Output default: `America/Los_Angeles`, with UTC available.
- DST handling:
  - Spring-forward nonexistent times → reject as `INVALID_INPUT`.
  - Fall-back ambiguous times → define one behavior (recommend: reject as `INVALID_INPUT` for MVP clarity).
- All conversion logic lives in `packages/shared` so web, MCP, and admin use the same path.

---

## 8. MCP over HTTP specification

### Transport
- Single HTTP endpoint: `POST /mcp`.
- Protocol: MCP over HTTP (Streamable HTTP / JSON-RPC).
- Auth: `Authorization: Bearer <token>` for all tools except `auth.login` and `auth.register`.

### Tools

#### `auth.register`
Input:
```json
{ "email": "agent@example.com", "password": "secret" }
```
Output:
```json
{ "userId": "uuid" }
```

#### `auth.login`
Input:
```json
{ "email": "agent@example.com", "password": "secret" }
```
Output:
```json
{ "token": "...", "expiresAt": "2026-10-08T20:00:00Z" }
```

#### `resources.list`
Output:
```json
{
  "resources": [
    { "id": "uuid", "name": "Room A", "timezone": "America/Los_Angeles", "active": true }
  ]
}
```

#### `appointments.create`
Input:
```json
{
  "resourceId": "uuid",
  "date": "2026-10-10",
  "startTime": "14:00",
  "endTime": "15:00"
}
```
Output:
```json
{
  "appointmentId": "uuid",
  "status": "booked",
  "startAt": "2026-10-10T21:00:00Z",
  "endAt": "2026-10-10T22:00:00Z"
}
```

#### `appointments.cancel`
Input:
```json
{ "appointmentId": "uuid" }
```

#### `appointments.reschedule`
Input:
```json
{
  "appointmentId": "uuid",
  "date": "2026-10-11",
  "startTime": "10:00",
  "endTime": "11:00"
}
```

#### `appointments.list`
Input:
```json
{
  "resourceId": "uuid",
  "from": "2026-10-01",
  "to": "2026-10-31"
}
```

### Error codes
- `INVALID_INPUT`
- `UNAUTHENTICATED`
- `FORBIDDEN`
- `NOT_FOUND`
- `CONFLICT`
- `INTERNAL`

The MCP document must define each tool’s name, description, input schema, output schema, auth requirement, and error behavior.

---

## 9. Admin specification

Minimum admin capabilities:
- View all users.
- Mark a user as `is_agent`.
- Promote a user to `admin`.
- Create, edit, deactivate resources.
- View all appointments with filters (user, resource, date range, status).
- Cancel any appointment.
- Reschedule any appointment.
- See overlap/conflict errors clearly.

Admin routes:
- `/admin/users`
- `/admin/resources`
- `/admin/appointments`

Admins never see plaintext passwords.

---

## 10. User stories

### End user (human)
1. As a visitor, I can register with email and password so I can use the system.
2. As a user, I can log in with email and password so I can access my account.
3. As a user, I can see the list of available resources so I can choose one.
4. As a user, I can create an appointment for a resource with a date, start time, and end time in Seattle time.
5. As a user, I cannot create an appointment that overlaps with an existing booked appointment on the same resource.
6. As a user, I can see a list of my upcoming and past appointments.
7. As a user, I can cancel one of my appointments.
8. As a user, I can reschedule one of my appointments to a new date and time.
9. As a user, I receive a clear error when my input is invalid, unauthenticated, or conflicts with an existing booking.

### Agent (MCP client)
10. As an agent, I can register an account with email and password.
11. As an agent, I can log in via MCP and receive a Bearer token.
12. As an agent, I can list resources via MCP.
13. As an agent, I can create an appointment via MCP for a given resource, date, start time, and end time in Seattle time.
14. As an agent, I can cancel an appointment via MCP.
15. As an agent, I can reschedule an appointment via MCP.
16. As an agent, I can list appointments via MCP with filters.
17. As an agent, I receive structured error codes so I can handle failures programmatically.
18. As an agent developer, I can read the MCP document to understand tool schemas and errors.

### Admin
19. As an admin, I can view all users.
20. As an admin, I can mark a user as an agent.
21. As an admin, I can promote a user to admin.
22. As an admin, I can create, edit, and deactivate resources.
23. As an admin, I can view all appointments with filters.
24. As an admin, I can cancel any appointment.
25. As an admin, I can reschedule any appointment.
26. As an admin, I can see why a booking failed (validation, conflict, forbidden).

---

## 11. Acceptance criteria

- User can register and log in with email/password.
- Passwords are hashed; plaintext is never stored or logged.
- No email verification is required.
- Authenticated user can create an appointment for a resource using date, start time, end time in Seattle time.
- Times are stored in UTC and returned in Seattle time by default.
- DST edge cases (spring-forward, fall-back) are handled deterministically.
- Overlapping booked appointments are prevented per resource, enforced at the database level.
- Cancelled appointments do not block overlaps.
- User can cancel and reschedule their own appointments.
- Admin can view and manage users, resources, and appointments.
- Admin can cancel or reschedule any appointment.
- Agent can authenticate via MCP over HTTP with email/password and receive a Bearer token.
- Agent can call `appointments.create`, `appointments.cancel`, `appointments.reschedule`, `appointments.list`, and `resources.list` over MCP.
- MCP document defines every tool’s name, input schema, output schema, auth requirement, and error codes.
- Web, MCP, and admin interfaces all use the same core services.

---

## 12. Non-functional requirements

- TypeScript strict mode across all packages.
- Schema validation at every input boundary (web, MCP, admin).
- Centralized error codes shared across interfaces.
- Migrations checked into `packages/db`.
- No business logic duplicated between web and MCP layers.
- Timezone logic centralized in `packages/shared`.
- Database enforces overlap invariant, not just application code.
- Structured logging for auth failures, conflicts, and unexpected errors.

---

## 13. Deferred decisions (explicitly out of MVP)

- Resource availability windows and working hours.
- Buffer times before/after appointments.
- Minimum/maximum appointment duration.
- Recurring appointments.
- Notifications (email, SMS, webhook).
- Password reset and email verification.
- Refresh tokens for MCP agents.
- Self-service agent registration vs admin-created agent accounts.
- Multi-resource or multi-provider booking in one request.
- Resource-level timezones (MVP assumes Seattle for input).

---

## 14. Open items to confirm before build

- Confirm PostgreSQL as the SQL database (needed for the `tstzrange` exclusion constraint).
- Confirm Bearer token lifetime for MVP.
- Confirm behavior for ambiguous DST times (recommend: reject as `INVALID_INPUT`).
- Confirm whether admin is a separate app or a role-gated section of the web app.
- Confirm the default resource seeding strategy for MVP (e.g., one placeholder resource).

---

This document is the source of truth for the MVP. Anything not listed here is out of scope until explicitly added.