# Travelian - Travel Agency

**Travelian** is a travel-agency web app: a public booking experience plus an **admin / agency panel** (`/admin/*`).

The app is a **travel booking and agency admin** front end built with React and Vite. The customer site covers flights, hotels, Umrah/tour packages, visa services, deals, and account flows. The **admin** area includes dashboards for bookings, payments, users, RBAC, coupons, content, and more.

Data is **mocked in the client** (`src/data/mock.ts` and related modules). There is no separate API server in this repository; you can run and explore the full UI locally.

## Tech stack

- [React 18](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/)
- [Vite 5](https://vitejs.dev/) with [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react-swc)
- [React Router](https://reactrouter.com/) for routing
- [TanStack Query](https://tanstack.com/query) for async/state patterns
- [Tailwind CSS](https://tailwindcss.com/) + [shadcn/ui](https://ui.shadcn.com/) (Radix primitives)
- [Vitest](https://vitest.dev/) + Testing Library for unit tests
- [Playwright](https://playwright.dev/) is listed as a dev dependency (config in `playwright.config.ts`); add `*.spec.ts` tests under the project root if you want to run end-to-end tests

## Prerequisites

- [Node.js](https://nodejs.org/) **18.x or newer** (20+ recommended for current tooling)
- npm (comes with Node)

## Install dependencies

```bash
npm install
```

## Run the app (development)

```bash
npm run dev
```

Then open **http://localhost:8080** in your browser (host and port are set in `vite.config.ts`).

### Useful URLs

| Area    | Path | Notes |
|--------|------|--------|
| Home   | `/` | Search tabs, featured destinations, mock listings |
| Admin  | `/admin` | Dashboard; use the in-app role switcher where available |

Other public routes include `/flights-search`, `/hotels-search`, `/umrah-packages`, `/tour-packages`, `/visa-services`, `/booking`, `/account`, `/contact`, `/about`, `/deals`, and more. See `src/App.tsx` for the full route table.

## Other scripts

| Command | Description |
|--------|-------------|
| `npm run build` | Production build to `dist/` |
| `npm run build:dev` | Build in development mode |
| `npm run preview` | Serve the production build locally (after `npm run build`) |
| `npm run lint` | Run ESLint on the project |
| `npm test` | Run Vitest once (CI-style) |
| `npm run test:watch` | Run Vitest in watch mode |

## Project layout (high level)

- `src/App.tsx` - Router: public routes under `PublicLayout`, admin under `AdminLayout` + providers
- `src/pages/public/` - Marketing and booking flows
- `src/pages/` - Admin screens (bookings, flights, hotels, users, etc.)
- `src/components/` - Shared UI, including `components/ui/` (shadcn-style primitives)
- `src/data/` - Mock data and helpers
- `src/contexts/` - Role and admin UI state

## Environment variables

No `.env` file is required for the default mock-driven experience. If you later wire a real API, add variables as needed and document them here.

## License

Private project (`"private": true` in `package.json`). Add a license file if you intend to open-source this repository.
