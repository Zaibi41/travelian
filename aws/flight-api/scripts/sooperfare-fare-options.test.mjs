import test from "node:test";
import assert from "node:assert/strict";
import { SooperFareAdapter } from "../src/providers/sooperfare.mjs";

const payload = {
  offerId: "sooperfare-flight-1",
  rawRef: {
    faresPayload: { ref_id: "search-1", legs: [{ ref_id: "leg-1" }] },
    flightRefIds: ["flight-1"],
  },
};

test("loads every fare for the selected flight", async (t) => {
  const adapter = new SooperFareAdapter();
  t.mock.method(adapter, "fareRules", async (request) => {
    assert.deepEqual(request, payload);
    return { data: { providers: [{ legs: [{ flights: [{
      ref_id: "flight-1",
      fares: [
        { ref_id: "fare-1", name: "Light", class: "H", price: 84112, currency: "PKR" },
        { ref_id: "fare-2", name: "Light Flex", class: "H", price: 85249, currency: "PKR" },
        { ref_id: "fare-3", name: "Super Flex Light", class: "H", price: 87145, currency: "PKR" },
      ],
    }] }] }] } };
  });
  const result = await adapter.fareOptions(payload);
  assert.equal(result.fareOptions.length, 3);
  assert.deepEqual(result.fareOptions.map((fare) => fare.tier), ["Light (H)", "Light Flex (H)", "Super Flex Light (H)"]);
});

test("does not attach another flight's fares", async (t) => {
  const adapter = new SooperFareAdapter();
  t.mock.method(adapter, "fareRules", async () => ({ data: { providers: [{ legs: [{ flights: [{ ref_id: "another-flight", fares: [] }] }] }] } }));
  await assert.rejects(adapter.fareOptions(payload), /no longer available/);
});
