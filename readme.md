# CalendarSite

Appointment scheduling app. A Next.js frontend plus a separate backend that implements a shared contract.

## Prerequisites

- Node.js 20.9+ (Node 22 recommended). No `engines` field pins this, and CI does not enforce it.
- npm
- A reachable `CalendarBackend` instance. Locally it binds `127.0.0.1:4001`; the
  deployed build uses `https://couchcollective.software:4000`.

## Install

```bash
npm install
```

## Development

```bash
npm run dev
```

Opens `http://127.0.0.1:3000`.

The frontend calls the backend configured by `NEXT_PUBLIC_API_URL`. Set it in `.env.local` before building. There is no default, and no `.env.example` in the repo — create the file yourself.

If it is missing the app still starts, but every API call fails with
`INTERNAL "NEXT_PUBLIC_API_URL is not configured"`, the session degrades to
anonymous, and `/` redirects to `/login`.

> Because `NEXT_PUBLIC_*` is inlined at build time, run `npm run build` **after**
> setting this value. A value present only at runtime has no effect.

## Production

```bash
npm run build
npm start
```

`npm start` binds `127.0.0.1` on port 3000 at `http://127.0.0.1:3000`.

## Access from the network

Both `dev` and `start` bind `127.0.0.1`, so the app is reachable only from this machine at `http://127.0.0.1:3000`.

## Configure the backend

Set the backend URL in `.env.local`:

```
NEXT_PUBLIC_API_URL=http://127.0.0.1:4001
```

`NEXT_PUBLIC_*` values are inlined at build time, so run `npm run build` after changing them.

## Ports

| Service | Local dev | Deployed |
|---|---|---|
| Frontend | `127.0.0.1:3000` | `https://couchcollective.software` |
| Backend REST + MCP | `127.0.0.1:4001` | `https://couchcollective.software:4000` |

The backend serves the MCP endpoint at `POST /mcp` on the same listener, and
`GET /healthz` is an unauthenticated liveness probe.

### Why two different ports

These are not in conflict — they belong to different environments:

- **`4001` is the backend's local default.** It is what `internal/config/config.go`
  uses when no `PORT` is set, bound to loopback. It is not exposed publicly: the
  deployed host does not accept connections on 4001.
- **`4000` is the deployed port.** The hosted backend is reachable at
  `https://couchcollective.software:4000`, where `GET /healthz` returns
  `200 {"status":"ok"}`. Deployments set the backend's `PORT` to 4000 (or front it
  with a proxy that maps 4000 to the local listener).

The committed CI workflow builds with
`NEXT_PUBLIC_API_URL=https://couchcollective.software:4000`, and that value is what
the deployed frontend actually uses.

> Because `NEXT_PUBLIC_*` is inlined at build time, the deployed frontend is pinned
> to whatever `NEXT_PUBLIC_API_URL` was set to when it was built. Changing that value
> requires a rebuild and redeploy — it cannot be changed at runtime.

## Scripts

| Command | Purpose |
|---|---|
| `npm run dev` | Start the dev server on `127.0.0.1:3000` |
| `npm run build` | Production build |
| `npm start` | Serve the production build on `127.0.0.1:3000` |
| `npm run lint` | ESLint |
| `npm run typecheck` | `tsc --noEmit` |
| `npm test` | Run Vitest once |
| `npm run test:watch` | Vitest in watch mode |
| `npm run contract:generate` | Emit `contract/out/openapi.json` |

## Contract

- `backend-handoff.md`: backend-facing contract and implementation notes.
- `api-contract.md`: API surface and authorization model.
- `contract/out/openapi.json`: generated OpenAPI document for the backend. **Not
  committed** — it is git-ignored and appears only after
  `npm run contract:generate`. Generate it before handing the contract over.
- `project.md`: original MVP specification (historical; it predates the split into
  two repos and describes a monorepo layout that was never built).
- `../documentation/unified-documentation.md`: cross-repo reference covering both
  this frontend and the Go backend, including a documentation audit.

## Tests and CI

`npm test` runs Vitest over `tests/schemas.test.ts` and `tests/time.test.ts` only.
There is no coverage for the HTTP client, session context, DST edge cases, or the
overlap invariant.

`.github/workflows/local-ci.yml` ("CalendarSite — Build, Check, and Deploy") runs
`npm install`, `npm run typecheck`, `npm run lint`, `npm test`, and `npm run build`
as separate steps. **Any failure blocks the deploy** — `servy-cli` restarts the
service only after all five have passed, and only on `push` (never on a pull
request).

> The install step uses `npm install` rather than `npm ci` deliberately. `npm ci`
> was tried and failed on the self-hosted runner; `npm install` is more tolerant of
> a dirty npm cache and a stale `node_modules`. The trade-off is that installs are
> not pinned to the lockfile.
>
> The previous version of this workflow ran none of those checks and could not
> fail: it ended with an unconditional `exit 0`, and in PowerShell merely setting
> `$LASTEXITCODE` does not fail a step — only `throw` does. Keep that in mind when
> editing it.

## Notes for agents

`AGENTS.md` is regenerated by `next dev`; do not hand-edit it. This Next.js version
has breaking changes relative to older releases — consult
`node_modules/next/dist/docs/` before changing app code.
