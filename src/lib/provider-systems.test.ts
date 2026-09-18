import { beforeEach, describe, expect, it } from "vitest";
import {
  isGroupTicketingProvider,
  loadProviderSystems,
  saveProviderSystems,
  groupTicketToFlight,
  decodeGroupTicketId,
  INITIAL_PROVIDERS,
} from "./provider-systems";
import type { GroupTicket } from "./group-ticketing";

describe("provider-systems helper", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("loads default provider systems including group ticketing providers", () => {
    const providers = loadProviderSystems();
    expect(providers.length).toBeGreaterThanOrEqual(10);
    const skypass = providers.find((p) => p.id === "skypass");
    const alhaider = providers.find((p) => p.id === "alhaider");
    const travelport = providers.find((p) => p.id === "travelport");

    expect(skypass?.isGroupTicketing).toBe(true);
    expect(alhaider?.isGroupTicketing).toBe(true);
    expect(travelport?.isGroupTicketing).toBe(false);
  });

  it("correctly identifies group ticketing providers", () => {
    expect(isGroupTicketingProvider("skypass")).toBe(true);
    expect(isGroupTicketingProvider("Skypass")).toBe(true);
    expect(isGroupTicketingProvider("alhaider")).toBe(true);
    expect(isGroupTicketingProvider("Al Haider")).toBe(true);
    expect(isGroupTicketingProvider("dhilluandsahi")).toBe(true);
    expect(isGroupTicketingProvider("travelntours")).toBe(true);

    expect(isGroupTicketingProvider("travelport")).toBe(false);
    expect(isGroupTicketingProvider("sooperfare")).toBe(false);
    expect(isGroupTicketingProvider("airsial")).toBe(false);
    expect(isGroupTicketingProvider("flyadeal")).toBe(false);
    expect(isGroupTicketingProvider(undefined)).toBe(false);
  });

  it("decodes base64 supplier IDs for group provider matching", () => {
    // btoa("alhaider:3361") = "YWxoYWlkZXI6MzM2MQ=="
    const base64AlHaider = typeof btoa === "function" ? btoa("alhaider:3361") : "YWxoYWlkZXI6MzM2MQ==";
    expect(isGroupTicketingProvider(base64AlHaider)).toBe(true);
  });

  it("updates and persists provider group ticketing toggle", () => {
    const providers = loadProviderSystems();
    const airsial = providers.find((p) => p.id === "airsial");
    expect(airsial?.isGroupTicketing).toBe(false);

    // Toggle AirSial to group ticketing provider
    const updated = providers.map((p) => (p.id === "airsial" ? { ...p, isGroupTicketing: true } : p));
    saveProviderSystems(updated);

    expect(isGroupTicketingProvider("airsial")).toBe(true);
    expect(loadProviderSystems().find((p) => p.id === "airsial")?.isGroupTicketing).toBe(true);
  });

  it("decodes group ticket ID correctly", () => {
    expect(decodeGroupTicketId("YWxoYWlkZXI6MzM2MQ==")).toBe("alhaider-3361");
    expect(decodeGroupTicketId("c2t5cGFzczoxMzU3OQ==")).toBe("skypass-13579");
    expect(decodeGroupTicketId("simple-id")).toBe("simple-id");
  });

  it("converts a GroupTicket into a TravelianFlight with group provider and fare details", () => {
    const mockGroupTicket: GroupTicket = {
      id: "YWxoYWlkZXI6MzM2MQ",
      categorySlug: "collection-1",
      categoryLabel: "AH",
      airlineName: "flyadeal",
      airlineCode: "F3",
      airlineLogo: "https://example.com/logo.png",
      sector: "ISB-RUH",
      tripType: "one-way",
      departureDate: "2026-10-02",
      baggage: "25+7",
      seatsAvailable: 2,
      fare: 85000,
      currency: "PKR",
      itinerary: [
        {
          sequence: 1,
          flightDate: "2026-10-02",
          origin: "Islamabad",
          destination: "Riyadh",
          departureTime: "07:30:00",
          arrivalTime: "10:05:00",
          baggage: "25+7",
          flightNumber: "F3-652",
        },
      ],
    };

    const flight = groupTicketToFlight(mockGroupTicket);
    expect(flight.flightId).toBe("group-alhaider-3361");
    expect(flight.offerId).toBe("alhaider-3361");
    expect(flight.airline).toBe("Flyadeal");
    expect(flight.flightNumber).toBe("F3-652");
    expect(flight.origin).toBe("ISB");
    expect(flight.destination).toBe("RUH");
    expect(flight.price).toBe(85000);
    expect(flight.currency).toBe("PKR");
    expect(flight.fareBrand).toBe("Group Ticket");
    expect(flight.fareOptions?.length).toBe(1);
    expect(isGroupTicketingProvider(flight.provider)).toBe(true);
  });
});
