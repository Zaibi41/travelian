# Raw Provider Search in Postman

## Complete SooperFare Collection

Run `node scripts/prepare-sooperfare-collection.mjs "SooperFare Shareable.postman_collection.json"` to generate a separate AWS-routed collection in Downloads: `SooperFare-Complete-Raw-AWS.postman_collection.json`. The original supplier file remains unchanged.

Import the complete collection and `Travelian-Private.postman_environment.json`, then select **Travelian Private**. The complete collection uses `END_POINT = https://api.travelian.pk/sooperfare/raw`:

- `GET /v1/airline/airports`
- `GET /v1/airline/availability`
- `POST /v1/airline/search`
- `POST /v1/airline/quote`
- `POST` and `PATCH /v1/airline/ancillary`
- `POST /v1/airline/reservation`
- `POST /v1/airline/fares`
- `POST /v1/partner/auth/login`
- `POST` and `PATCH /v1/booking/extras`
- `POST /v1/booking/list`
- `POST /v1/booking/confirm`
- `POST /v1/booking/cancel`
- `POST /v1/booking/void`

Example: `POST https://api.travelian.pk/sooperfare/raw/v1/airline/search`.

This full route family accepts the supplier's original request format (`trip_type`, `legs`, `travelers`, etc.), not the simplified Travelian search format below. HTTP methods, JSON bodies, query strings, provider response bodies, and status codes are preserved. Login uses AWS-held credentials and ignores the submitted body. Supplier authentication is handled on AWS; original supplier auth headers and token scripts are removed from the copy.

Start with Airports, Availability, then Search. The examples default to LHE-DXB with a date 30 days ahead; change collection variables `origin`, `destination`, `airlineProvider`, or set `flightDate1` in your environment. Use the exact provider code from Availability. Fill reference/passenger placeholders using current responses before making subsequent calls. Do not run the entire collection automatically: reservation, confirmation, cancellation, void and PATCH operations can change real bookings.

`node scripts/verify-sooperfare-collection.mjs` tests only Airports, Availability and Search using the local collection and private environment; it does not create or modify bookings.

## Simplified Search Collection

1. Import `Travelian-Raw-Provider.postman_collection.json` into Postman.
2. Obtain your existing Travelian client API key from AWS Systems Manager > Parameter Store > `/travelian/api/clients`, in `us-east-1`. Use the `apiKey` (or `key`) property of its JSON value, not the provider password or the whole JSON object.
3. Set the collection variable `travelianApiKey` locally. Do not publish or share the key.
4. Open **Raw one-way search - Lahore to Dubai**, then click **Send**.
5. Inspect the response body and status. This endpoint returns the provider's body unchanged, including provider errors. It does not add markup, normalize offers, or create bookings.

Alternatively, run `node scripts/export-postman-environment.mjs` using your configured `travelian-admin` AWS CLI profile. It creates `Travelian-Private.postman_environment.json` in your Downloads folder without printing the key. Import this private environment into Postman and select **Travelian Private** in the environment selector. The request must use **Inherit auth from parent**. The environment contains a real credential: keep it local and do not share or commit it.

Endpoint: `POST https://api.travelian.pk/sooperfare/raw`

The original `/debug/flights/search/raw` endpoint remains supported. The shorter `/sooperfare/raw` URL does not require `provider` in the request body.

Headers: `Content-Type: application/json` and `x-travelian-api-key: <your key>`.

The example selects a departure 30 days from today. Replace `{{departureDate}}` in the body with a specific `YYYY-MM-DD` date when needed.

`provider` must be `sooperfare`. By default, the endpoint chooses the first source returned by the supplier's availability API for your route. The response header `x-travelian-provider-source` identifies it. To select a particular enabled source, add `airlineProvider` to the request body with its exact supplier code. Do not assume `SABRE` is valid for your account.

For round-trip, use `"tripType": "roundtrip"` and add `"returnDate": "YYYY-MM-DD"`.
For multi-city, use `"tripType": "multicity"` and add `"segments": [{"from":"LHE","to":"DXB","date":"YYYY-MM-DD"},{"from":"DXB","to":"LHE","date":"YYYY-MM-DD"}]`.

An `Unauthorized` response means the Travelian key is missing or incorrect. Other provider response codes/bodies are passed through. A Travelian `Unable to complete provider search` error indicates a connection or configuration problem. The gateway can time out after 30 seconds even if a slower provider call continues; increasing Postman's timeout cannot increase the gateway limit.

The debug endpoint enforces the existing client API key even when `TRAVELIAN_API_AUTH_MODE` is `off`. Response caching is disabled and the endpoint does not log raw payloads or credentials.
