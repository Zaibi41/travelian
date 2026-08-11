# AGENT.md - Travelian / fly-vibe-buddy

## Project Overview

Travelian is a B2B and B2C travel platform for Pakistan-based travel operations. The project contains:

- React + TypeScript frontend in this repository root.
- Main AWS Lambda backend in `aws/flight-api`.
- Provider proxy Lambdas in `aws/skypass-proxy` and `aws/group-ticketing-proxy`.
- DynamoDB single-table content storage and S3 package media storage.

## Operating Rules

1. Pull latest from `origin/main` before code changes.
2. Read the exact files before editing them.
3. Do not make UI, layout, styling, branding, copy, spacing, or visual-design changes unless the user explicitly asks for that UI change.
4. Before making any UI-facing change, first tell the user exactly what will change in this format: "I am going to change `<current behavior/design>` to `<new behavior/design>`." Wait for the user's direction if the UI change was not explicitly requested.
5. Do not make speculative "premium polish" or redesign changes while working on backend, API, data, deployment, or bug-fix tasks unless the user explicitly includes UI work in the request.
6. Do not hardcode credentials, provider tokens, API keys, Cognito IDs, bucket names, or production URLs in business logic.
7. Prefer environment variables and AWS Secrets Manager for configuration.
8. Do not break confirmed flows:
   - Multi-provider flight search.
   - Content CRUD for packages, tickets, bookings, blogs, customers.
   - Booking requests and admin notifications.
   - Journey reminders.
   - Package image upload to S3.
   - Skypass proxy routes.
   - Group ticketing categories, list, and detail.
9. Test before pushing. For frontend changes run `npm run build` and `npm test -- --run`.
10. Push the completed branch after successful verification.

## Architecture

```text
React/Vite frontend
  -> API Gateway
    -> aws/flight-api
      -> provider adapters: Travelport, Skypass, PIA, flyadeal, AirSial
    -> aws/skypass-proxy
    -> aws/group-ticketing-proxy
```

## Backend Configuration

All backend values should be environment-driven.

| Variable | Purpose |
|---|---|
| `CONTENT_TABLE` | DynamoDB content table. Required. |
| `MEDIA_BUCKET` | S3 media bucket. |
| `MEDIA_BUCKET_REGION` | S3 media region. |
| `MEDIA_PUBLIC_BASE_URL` | Public media URL prefix. |
| `PACKAGE_IMAGE_PREFIX` | Package image prefix. |
| `CORS_ORIGIN` | Allowed CORS origin. Use a restricted origin in production. |
| `DEFAULT_CURRENCY` | Default flight search currency. |
| `ENABLED_PROVIDERS` | Comma-separated flight providers. |
| `PROVIDER_TIMEOUT_MS` | Per-provider timeout. |
| `TRAVELIAN_API_AUTH_MODE` | `off` or `api-key`. Production should use `api-key`. |
| `TRAVELIAN_API_KEY_SECRET_ID` | Secrets Manager ID for platform API key. |
| `TRAVELPORT_BASE_URL` | Travelport API base URL. |
| `TRAVELPORT_SECRET_ID` | Secrets Manager ID for Travelport credentials. |
| `TRAVELPORT_OFFERS_PER_PAGE` | Travelport offer page size. |
| `SKYPASS_PROXY_BASE_URL` | Skypass proxy URL used by flight-api. |
| `SKYPASS_CLIENT_SECRET_ID` | Secrets Manager ID for Skypass client key. |
| `NOTIFICATION_FROM_EMAIL` | SES sender address. |
| `NOTIFICATION_PROVIDER_SECRET_ID` | Secrets Manager ID for notification provider credentials. |
| `PAYFAST_SECRET_ID` | Secrets Manager ID for PayFast merchant configuration. Defaults to `travelian/payments/payfast`. |
| `PAYFAST_SUCCESS_URL` | Optional default hosted-payment success URL. Can also come from the PayFast secret. |
| `PAYFAST_FAILURE_URL` | Optional default hosted-payment failure URL. Can also come from the PayFast secret. |
| `TRAVELIAN_TIME_ZONE` | Time zone for reminders, default `Asia/Karachi`. |
| `SECRET_CACHE_TTL_MS` | Optional Secrets Manager cache TTL. |
| `ALLOW_MISSING_SECRETS` | Development escape hatch only. Do not enable in production. |

## Frontend Configuration

| Variable | Purpose |
|---|---|
| `VITE_TRAVELIAN_API_BASE_URL` | API base URL. |
| `VITE_COGNITO_REGION` | Cognito region. |
| `VITE_COGNITO_USER_POOL_ID` | Cognito user pool ID. |
| `VITE_COGNITO_CLIENT_ID` | Cognito app client ID. |
| `VITE_COGNITO_DOMAIN` | Cognito hosted UI domain. |

## DynamoDB Design

Single-table keys use `pk` and `sk`.

| Entity | pk | sk |
|---|---|---|
| Blog posts | `BLOG` | `SLUG#<slug>` |
| Packages | `PACKAGE#<CATEGORY>` | `PACKAGE#<packageId>` |
| Tickets | `TICKET` | `TICKET#<ticketId>` |
| Bookings | `BOOKING` | `BOOKING#<bookingId>` |
| Booking requests | `BOOKING_REQUEST` | `REQUEST#<requestId>` |
| Customers | `CUSTOMER` | `CUSTOMER#<customerId>` |
| Customer passport index | `CUSTOMER_PASSPORT` | `PASSPORT#<passportNumber>` |
| Pricing rules | `PRICING_RULE#<SERVICE>` | `RULE#<ruleId>` |
| Notification settings | `SETTINGS` | `NOTIFICATIONS` |
| Notification logs | `NOTIFICATION_LOG` | `LOG#<timestamp>#<logId>` |
| Journey reminders | `JOURNEY_REMINDER` | `TICKET#<ticketId>#<departureDate>` |
| Flight search logs | `FLIGHT_SEARCH_LOG` | `SEARCH#<timestamp>#<searchLogId>` |

## Implementation Guidance

- Backend content functions must call `ensureTable()` before DynamoDB access.
- Use `QueryCommand` over `ScanCommand`.
- Add pagination with `ExclusiveStartKey` and `LastEvaluatedKey` when changing list endpoints, and update frontend clients at the same time.
- Provider credentials must be loaded through `getSecretJson()`.
- New providers should extend the existing provider adapter pattern and be registered once in the provider registry.
- Notification attempts should be recorded with `recordNotificationLog()`.
- Keep localStorage-only finance and agency flows clearly treated as temporary until backend endpoints exist.

## Known Gaps To Keep Visible

- Wallet, agencies, coupons, and some admin finance screens still rely on frontend/local state.
- Travelport booking creation and price-offer flows are not production-complete.
- Hotel and transfer provider normalization needs real supplier contract validation.
- Backend auth defaults must be tightened in production by setting `TRAVELIAN_API_AUTH_MODE=api-key`.
- Large list endpoints need pagination before data grows beyond DynamoDB's 1 MB page limit.

