# CalendarSite

Appointment scheduling app. A Next.js frontend plus a separate backend that implements a shared contract.

## Prerequisites

- Node.js 20.9+ (Node 22 recommended)
- npm
- A running CalendarBackend instance (REST on port 4000)

## Install

```bash
npm install
```

## Development

```bash
npm run dev
```

Opens `http://localhost:3000`.

The frontend calls the backend configured by `NEXT_PUBLIC_API_URL`. Set it in `.env.local` before starting. If it is missing, the app fails at startup.

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

For access from outside the LAN, forward the port on the router and allow it through the Windows firewall.

## Configure the backend

Set the backend URL in `.env.local`:

```
NEXT_PUBLIC_API_URL=http://couchcollective.software:4000
```

`NEXT_PUBLIC_*` values are inlined at build time, so run `npm run build` after changing them.

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
