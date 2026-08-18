# Travelian Static Egress Proxy

This service provides a low-cost static outbound IP for provider APIs that require IP whitelisting.

Current live setup:

- Provider whitelist IP: `13.223.105.174`
- HTTPS proxy URL: `https://provider-egress.travelian.pk/proxy`
- Lightsail instance: `travelian-egress-proxy`
- Lightsail static IP: `travelian-egress-ip`
- AWS region: `us-east-1`
- Budget guardrail: `TravelianMonthly7USD`, set to `USD 7`

## Why This Exists

AWS NAT Gateway is reliable but too expensive for the current budget. This proxy keeps Lambda outside the VPC and routes only provider calls through a small Lightsail instance.

## Security Model

- The proxy listens only on localhost.
- Caddy exposes HTTPS on `provider-egress.travelian.pk`.
- Requests require `x-travelian-egress-token`.
- Target hosts must exist in `ALLOWED_EGRESS_HOSTS`.
- The shared token is stored in AWS Secrets Manager at `travelian/egress/proxy`.

## Lambda Configuration

The main API Lambda uses the proxy only when these environment variables are configured:

```text
EGRESS_PROXY_URL=https://provider-egress.travelian.pk/proxy
EGRESS_PROXY_SECRET_ID=travelian/egress/proxy
```

If those variables are removed, the Lambda calls providers directly.

## Cost Notes

The current target is around `USD 5/month` for the Lightsail IPv4 Nano bundle, plus existing usage-based AWS services. Do not recreate NAT Gateway unless the budget is explicitly approved.

## Provider Whitelisting

Give providers this IP:

```text
13.223.105.174
```

Public ISP/cloud provider:

```text
Amazon Web Services, us-east-1
```
