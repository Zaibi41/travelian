# Development workflow

Use Node.js 22 (`nvm use`) and npm. Install with `npm ci`; commit `package-lock.json` when dependencies change. npm is the supported package manager.

Keep the existing source structure. Pages compose UI, components own reusable presentation, hooks/contexts own browser state, and `src/lib/*api.ts` owns backend requests and response adapters. Keep supplier integrations, secrets and database access on the separate backend. Keep hotel search presentation isolated from flight search.

Create a branch for each change. Keep changes focused and describe the resulting behavior, validation and limitations in the pull request. Do not commit `.env`, `*.local`, generated output or debug responses.

## Environment setup

Use the mode files described in README.md. Copy `.env.example` to `.env.staging.local` (or another mode's local file) and fill in that environment's values. Staging has no default endpoint. All `VITE_*` values are public; never use them for secrets. Restart development servers or rebuild after configuration changes.

## Before review

Run `npm run typecheck`, `npm run lint`, `npm test` and `npm run build`, or `npm run check` to run them sequentially. Fix failures introduced by your change. Tests use `.env.test` and mocked API requests, not live supplier transactions.

Follow AGENTS.md for UI changes, including desktop, tablet, mobile, breakpoint and flight scenario checks. A production build does not replace browser verification. Keep removed controls hidden and customer-facing data free of internal supplier codes.

## Existing quality debt

The initial workflow audit found 49 ESLint errors and 21 warnings. These include conditional hooks in BookingPage, hidden flight actions using constant expressions, explicit `any` types, and shared component/export warnings. They remain visible through `npm run lint`; no rules were disabled. The CI lint job is temporarily non-blocking, while types, unit tests and the production build are required. Remove `continue-on-error` once existing lint errors are repaired and their affected UI flows are verified.

The production build currently warns about a large JavaScript bundle and mixed static/dynamic airport imports. Route-level code splitting and its browser regression checks remain follow-up work.

Some booking, wallet and pricing behavior remains local or simulated, as documented in README.md. Migrate those flows using agreed backend contracts; do not represent local state as a confirmed server transaction.
