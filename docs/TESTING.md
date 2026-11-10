# Testing the admin on a new machine

How to run the Travelian frontend locally against your own local gateway. Set up the gateway first; see `docs/TESTING.md` in travelian-api-gateway.

Never commit `.env.local`, a password or a token. `.env.local` is git-ignored.

## 1. Prerequisites

- nvm (Node Version Manager). The Node version is pinned in `.nvmrc`.
- The gateway running locally (default `http://localhost:8000`).
- Git access to this repo, on branch `feature/admin-dashboard-home`.

## 2. Install

```bash
nvm install        # first time only
nvm use
npm ci
```

## 3. Settings (`.env.local`)

```bash
cp .env.example .env.local
```

Fill it in privately:

| Variable | What it is |
| --- | --- |
| `VITE_TRAVELIAN_GATEWAY_BASE_URL` | Your gateway, e.g. `http://localhost:8000`. All admin data comes from here. Add this page's origin (`http://localhost:8080`) to the gateway's `CORS_ALLOWED_ORIGINS`. |
| `VITE_COGNITO_REGION`, `VITE_COGNITO_USER_POOL_ID`, `VITE_COGNITO_CLIENT_ID`, `VITE_COGNITO_DOMAIN` | The Cognito user pool and app client used to sign in. They must match the gateway's `COGNITO_ISSUER` and `COGNITO_APP_CLIENT_ID`. |
| `VITE_TRAVELIAN_API_BASE_URL` | The legacy API used by the public website and the agency roles' legacy search. The new admin screens don't use it. |

Values in `.env.local` are built into the page, so they must never include a secret: the Cognito IDs above are public identifiers, not passwords.

## 4. Run

```bash
npm run dev        # http://localhost:8080
```

Open `http://localhost:8080/admin` and sign in with **your own** account. The first sign-in creates your profile on the gateway with the default role. To see the admin, your user must be made super admin (or staff) on the gateway; see section 6 of the gateway's `docs/TESTING.md`.

## 5. What to expect with a fresh database

Sample bookings are **not** in git. They came from a private CSV export containing passenger data. On a fresh gateway database:

- Dashboard and Bookings show zeros and empty tables, with no "Sample data" label.
- Search > Group Ticketing and Flights only return results when the gateway has supplier credentials, and only show prices when a markup is configured.
- Hotels and Umrah show "not available yet".

If a page shows an error, it now quotes the gateway's own reason, e.g. "Agency service unavailable." (run `alembic upgrade head` on the gateway) or "Authentication is not configured." (set the gateway's Cognito variables).

## 6. Checks

```bash
npm run typecheck
npm test
```

Expected on 10 November 2026: typecheck clean, 43 test files and 311 tests passing. Admin layout specs (`e2e/admin-*.spec.ts`: flights search, booking detail, flights hold, customers, airports): 47 passing; run with `PLAYWRIGHT_CHANNEL=chrome npx playwright test e2e/admin-*.spec.ts` when Playwright's own browser isn't installed.

Airport suggestions (Search > Flights From/To): `src/lib/admin-search/airports.test.ts` covers the ranking (exact IATA code, city prefix, IATA prefix, airport name, country; larger airports first), accents, case, the 8-result limit and no match; `e2e/admin-airports.spec.ts` covers picking, clearing, swap, same airport, keyboard, the 3-letter codes in the request, and that typing makes no request once the Search page has loaded. Data source: `docs/airports-data.md`.
