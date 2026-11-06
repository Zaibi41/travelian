# Roadmap

Planned work, in order. Do not start a later item unless asked.

1. **Admin: Dashboard home** (in progress)
2. **Deploy gateway to Lightsail** (HTTPS, managed Postgres, secrets, CORS origin for the production admin)
   - Before deployment: decide the real bookings source (read the legacy DynamoDB table, sync it into Postgres, or have the gateway write bookings). Locally the `bookings` table holds 18 imported test rows (`import_source = 'legacy_test_csv'`), shown on the dashboard as "Sample data"; do not deploy them.
   - Run migration `0008_bookings` as an explicit deploy step on Lightsail (`alembic upgrade head`, after a database snapshot; never on app startup).
3. **Admin: remaining menus**, one at a time, each only after its mockup is approved
4. **Backend: lock down the unauthenticated `/content/bookings` endpoint** (security, do early)
5. **Public website: update to the new brand colors from the logo** (navy and teal). Do as a separate task: first a preview page for approval, then apply. Touches about 47 files. Do not start until the admin work is done and I ask.
6. **Roles: align the 8 frontend roles with the gateway's roles** to match the Users & Access spec, before any non-super_admin staff role uses the admin.
7. **Auth: move login through the gateway and decide token storage.**

**Spec decisions needed:** Blog/News still needs a home in the 14 menus (kept under Website & CMS for now; your decision).

**Retired (2026-11-06):** Secret Manager (`/admin/secrets`; it stored nothing and claimed "encrypted at rest") and Document Center (`/admin/documents`; static empty table with dead buttons). Real secrets stay in AWS Parameter Store.
