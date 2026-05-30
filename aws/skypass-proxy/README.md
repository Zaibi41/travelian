# Travelian Skypass Adapter

This Lambda exposes the documented Skypass supplier API behind Travelian's API
Gateway domain. Supplier credentials and bearer tokens remain server-side in AWS
Secrets Manager.

## Travelian Routes

| Travelian route | Skypass route |
| --- | --- |
| `GET /skypass/health` | Local adapter health |
| `POST /skypass/login` | `POST /auth` |
| `GET /skypass/filters` | `GET /airlines-sectors` |
| `GET /skypass/tickets` | `GET /tickets` |
| `GET /skypass/tickets/{ticketId}` | `GET /ticket/{ticket_id}` |
| `POST /skypass/seats/hold` | `POST /hold-available-seats` |
| `POST /skypass/seats/release` | `POST /release-seats` |
| `POST /skypass/bookings` | `POST /submit-booking` |
| `GET /skypass/bookings` | `GET /bookings` |
| `GET /skypass/bookings/{bookingId}` | `GET /booking/{booking_id}` |
| `POST /skypass/bookings/{bookingId}/cancel` | `POST /cancel-booking` |
| `POST /skypass/bookings/{bookingId}/update` | `POST /update-booking/{booking_id}` |
| `GET /skypass/ledger` | `GET /ledger` |
| `POST /skypass/tickets/status` | `POST /get-tickets-status` |

All routes except `GET /skypass/health` require the private
`x-travelian-api-key` server-to-server header. Do not embed this key in a web or
mobile application. Web and mobile clients should call an authenticated
Travelian application backend.

## Secrets

`travelian/providers/skypass`:

```json
{
  "baseUrl": "https://api.skypass.pk",
  "productionBaseUrl": "https://api.skypass.pk",
  "developmentBaseUrl": "https://dev.skypass.pk",
  "apiKey": "",
  "apiSecret": "",
  "token": "",
  "tokenExpiresAt": 0
}
```

`travelian/api/skypass-clients`:

```json
{
  "apiKey": "private Travelian server-to-server key"
}
```

The adapter caches and persists the Skypass bearer token. It reuses a valid token
until the expiry buffer is reached, then refreshes it automatically. It also
refreshes once and retries if Skypass rejects a token with `401`.
