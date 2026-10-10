# CalendarSite

Appointment scheduling app. A Next.js frontend plus a separate backend that implements a shared contract.

## Prerequisites

- Node.js 20.9+ (Node 22 recommended)
- npm

## Install

```bash
npm install
```

## Development

```bash
npm run dev
```

Opens `http://localhost:3000`.

The frontend runs against an in-memory mock by default. Log in with:

- `admin@example.com` / `password123`
- `user@example.com` / `password123`

## Production

```bash
npm run build
npm start
```

`npm start` binds `0.0.0.0` on port 80 at `http://localhost`. Port 80 must be free.

## Access from the network

Both dev and production bind `0.0.0.0`, so other machines on the LAN can reach
them:

- Dev: `http://<your-lan-ip>:3000`
- Production: `http://<your-lan-ip>` (port 80)

No backend is needed while `NEXT_PUBLIC_USE_MOCK=true`; the mock runs entirely in
the browser. For access from outside the LAN, forward the port on the router and
allow it through the Windows firewall.

## Connect to the real backend

The repo ships in stub mode: the in-memory mock is active and the API URL
already points at the planned backend (`http://couchcollective.software:4000`).
`NEXT_PUBLIC_USE_MOCK=true` keeps the mock active, so nothing fails before the
backend exists.

When the backend is live, set `NEXT_PUBLIC_USE_MOCK=false` in `.env.local` and
rebuild. `NEXT_PUBLIC_*` values are inlined at build time, so run
`npm run build` after changing them.

## Ports

| Service | Dev | Production |
|---|---|---|
| Frontend | 3000 | 80 |
| Backend REST + MCP | 4000 | 4000 |

The backend serves the MCP endpoint at `POST /mcp` on the same port.

## Scripts

| Command | Purpose |
|---|---|
| `npm run dev` | Start the dev server on 3000 |
| `npm run build` | Production build |
| `npm start` | Serve the production build on 80 |
| `npm run lint` | ESLint |
| `npm run typecheck` | `tsc --noEmit` |
| `npm test` | Run Vitest once |
| `npm run test:watch` | Vitest in watch mode |
| `npm run contract:generate` | Emit `contract/out/openapi.json` |

## Contract

- `backend-handoff.md`: backend-facing contract and implementation notes.
- `api-contract.md`: API surface and authorization model.
- `contract/out/openapi.json`: generated OpenAPI document for the backend.
- `project.md`: full MVP specification.
