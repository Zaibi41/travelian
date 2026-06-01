# Alhaider Token Management

The group-ticketing Lambda reads one long-lived Alhaider bearer token from AWS
Secrets Manager at `travelian/providers/alhaider`.

Runtime requests never call Alhaider `/api/login` or `/api/logout`. This avoids
consuming the supplier's yearly token allocation during customer traffic.

Required secret fields:

```json
{
  "baseUrl": "https://alhaidertravel.pk",
  "token": "supplier bearer token"
}
```

If Alhaider rejects the stored token:

1. Revoke a valid old token with `POST /api/logout` and its bearer token.
2. Generate one replacement token through an operator-only maintenance action.
3. Replace the `token` value in Secrets Manager.
4. Redeploy or restart the Lambda execution environment so its cached secret is
   refreshed immediately.

Do not expose supplier credentials or token-management endpoints to the
frontend.
