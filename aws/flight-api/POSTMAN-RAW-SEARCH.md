# Raw Provider Search in Postman

1. Import `Travelian-Raw-Provider.postman_collection.json` into Postman.
2. Obtain your existing Travelian client API key from AWS Systems Manager > Parameter Store > `/travelian/api/clients`, in `us-east-1`. Use the `apiKey` (or `key`) property of its JSON value, not the provider password or the whole JSON object.
3. Set the collection variable `travelianApiKey` locally. Do not publish or share the key.
4. Open **Raw one-way search - Lahore to Dubai**, then click **Send**.
5. Inspect the response body and status. This endpoint returns the provider's body unchanged, including provider errors. It does not add markup, normalize offers, or create bookings.

Endpoint: `POST https://api.travelian.pk/debug/flights/search/raw`

Headers: `Content-Type: application/json` and `x-travelian-api-key: <your key>`.

The example selects a departure 30 days from today. Replace `{{departureDate}}` in the body with a specific `YYYY-MM-DD` date when needed.

`provider` must be `sooperfare`. By default, the endpoint chooses the first source returned by the supplier's availability API for your route. The response header `x-travelian-provider-source` identifies it. To select a particular enabled source, add `airlineProvider` to the request body with its exact supplier code. Do not assume `SABRE` is valid for your account.

For round-trip, use `"tripType": "roundtrip"` and add `"returnDate": "YYYY-MM-DD"`.
For multi-city, use `"tripType": "multicity"` and add `"segments": [{"from":"LHE","to":"DXB","date":"YYYY-MM-DD"},{"from":"DXB","to":"LHE","date":"YYYY-MM-DD"}]`.

An `Unauthorized` response means the Travelian key is missing or incorrect. Other provider response codes/bodies are passed through. A Travelian `Unable to complete provider search` error indicates a connection or configuration problem. The gateway can time out after 30 seconds even if a slower provider call continues; increasing Postman's timeout cannot increase the gateway limit.

The debug endpoint enforces the existing client API key even when `TRAVELIAN_API_AUTH_MODE` is `off`. Response caching is disabled and the endpoint does not log raw payloads or credentials.
