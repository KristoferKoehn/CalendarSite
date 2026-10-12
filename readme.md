# CalendarSite

Appointment scheduling app. A Next.js frontend plus a separate backend that implements a shared contract.

## Prerequisites

- Node.js 20.9+ (Node 22 recommended)
- npm
- A running CalendarBackend instance (REST on `127.0.0.1:4001`)

## Install

```bash
npm install
```

## Development

```bash
npm run dev
```

Opens `http://127.0.0.1:3000`.

The frontend calls the backend configured by `NEXT_PUBLIC_API_URL`. Set it in `.env.local` before starting. If it is missing, the app fails at startup.

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

| Service | Dev | Production |
|---|---|---|
| Frontend | 127.0.0.1:3000 | 127.0.0.1:3000 |
| Backend REST + MCP | 127.0.0.1:4001 | 127.0.0.1:4001 |

The backend serves the MCP endpoint at `POST /mcp` on the same port.

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
- `contract/out/openapi.json`: generated OpenAPI document for the backend.
- `project.md`: full MVP specification.
