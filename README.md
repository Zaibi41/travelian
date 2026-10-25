# Travelian frontend

React, TypeScript and Vite frontend for the public website and agency/admin screens.
The backend API server is maintained and deployed separately.

## Run locally

Install Node.js 22 and npm, then run:

```sh
npm ci
npm run dev
```

The development site runs at http://localhost:8080.

## Backend connection

Environment files are selected by Vite mode:

| Environment | File | Start locally | Build |
| --- | --- | --- | --- |
| Development | `.env.development` | `npm run dev` | `npm run build:dev` |
| Staging | `.env.staging` | `npm run dev:staging` | `npm run build:staging` |
| Production | `.env.production` | `npm run dev:prod` | `npm run build` or `npm run build:prod` |

Development currently uses the existing production API and Cognito configuration. Set your development services before using it against a separate backend. Staging values are intentionally empty: configure the staging API URL and Cognito settings before running staging mode.

`.env` is reserved for shared settings. Use `.env.development.local`, `.env.staging.local` or `.env.production.local` for private local overrides (ignored by Git). Avoid mode-specific values in `.env.local`, because it applies across modes. Shell environment variables take priority over environment files.

Set the backend origin in the selected mode file:

```dotenv
VITE_TRAVELIAN_API_BASE_URL=https://api.travelian.pk
```

All data API clients use `src/lib/api-config.ts`. The flow is:

```text
Browser UI -> Travelian backend API -> JSON response -> frontend display
```

`src/lib/*api.ts` and `src/lib/group-ticketing.ts` contain browser-side requests and response adapters. Keep these files: they connect the UI to the backend. Supplier credentials, database access, API implementations and supplier integrations belong on the backend server. The backend must allow the frontend origin through CORS and enforce authentication and authorization for protected operations.

Vite reads environment variables at build time. Rebuild after changing the backend origin. Every `VITE_*` value is public browser configuration; never put backend secrets in these variables.

Existing authentication uses Cognito directly through `src/lib/cognito-auth.ts` and the `VITE_COGNITO_*` settings. Package image uploads use an upload URL returned by the backend. These existing flows are retained.

## Remaining local behavior

This cleanup separates the frontend repository from backend source and deployment artifacts. It does not convert every existing screen to server-authoritative behavior:

- `src/lib/booking-store.ts` stores booking records in browser local storage.
- `src/pages/public/BookingPage.tsx` includes simulated fare rechecks and estimated pricing breakdowns.
- `src/contexts/AdminStore.tsx` retains local wallet/deposit/webhook state.
- Static reference, marketing and some sample content remain where used by the UI.

Moving these flows, Cognito authentication or uploads exclusively behind the API requires corresponding backend endpoint contracts and frontend integration work. Local state and simulated values must not be treated as confirmed backend transactions.

## Commands

```sh
npm run build       # Build frontend to dist/
npm run preview     # Preview production build
npm test            # Unit tests
npm run lint        # ESLint
```

All development and build modes generate the public sitemap first using the locally installed `tsx` tool. Missing or invalid backend configuration stops Vite before serving or building.

Run `npm run typecheck` for TypeScript validation and `npm run check` for the full local check sequence. Tests load `.env.test`. GitHub Actions runs types, tests and the production build; its separate lint job is temporarily non-blocking because of existing errors (see [CONTRIBUTING.md](CONTRIBUTING.md)).

## Repository layout

- `src/pages/`, `src/components/`: public and admin UI
- `src/lib/`: API clients, response adapters and frontend helpers
- `src/contexts/`, `src/hooks/`: frontend state and hooks
- `src/data/`: UI models and reference content
- `public/`, `src/assets/`: frontend assets
- `scripts/generate-sitemap.ts`: build-time sitemap generation
- `scripts/deploy-static-site.ps1`: optional static frontend deployment

Backend Lambda servers, supplier proxies, backend deployment scripts/archives, old screenshots and raw debug responses have been removed. Frontend code, assets, checks and build configuration are retained.
