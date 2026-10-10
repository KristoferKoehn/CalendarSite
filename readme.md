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

`npm start` serves on port 80 at `http://localhost`. Port 80 must be free.

## Connect to the real backend

Copy `.env.example` to `.env.local` and set:

```bash
NEXT_PUBLIC_API_URL=http://localhost:4000
```

When `NEXT_PUBLIC_API_URL` is set, the frontend calls the backend over HTTP. Set `NEXT_PUBLIC_USE_MOCK=true` to force the mock anyway.

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
