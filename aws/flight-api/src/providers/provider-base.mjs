import { buildMockOffers } from "./mock-data.mjs";

export class ProviderAdapter {
  constructor(name) {
    this.name = name;
  }

  async searchFlights(request) {
    if (mockProvidersEnabled()) return buildMockOffers(request, this.name);
    throw unavailable(this.name, "flight search");
  }

  async priceOffer(payload) {
    if (!mockProvidersEnabled()) throw unavailable(this.name, "fare pricing");
    const currency = String(payload.currency || process.env.DEFAULT_CURRENCY || "PKR").trim().toUpperCase();
    return {
      provider: this.name,
      offerId: payload.offerId,
      available: true,
      price: {
        currency,
        base: payload.price?.base ?? payload.price?.total ?? null,
        taxes: payload.price?.taxes ?? null,
        total: payload.price?.total ?? null
      },
      priceChanged: false,
      pricedAt: new Date().toISOString()
    };
  }

  async fareRules(payload) {
    if (!mockProvidersEnabled()) throw unavailable(this.name, "fare rules");
    return {
      provider: this.name,
      offerId: payload.offerId,
      rules: [
        { type: "changes", text: "Changes subject to airline fare rules and penalties." },
        { type: "refunds", text: "Refundability depends on selected fare brand." },
        { type: "baggage", text: "Baggage allowance returned by provider where available." }
      ]
    };
  }

  async seatMap(payload) {
    if (!mockProvidersEnabled()) throw unavailable(this.name, "seat map");
    return {
      provider: this.name,
      offerId: payload.offerId,
      supported: false,
      seats: []
    };
  }

  async createBooking(payload) {
    if (!mockProvidersEnabled()) throw unavailable(this.name, "booking");
    return {
      provider: this.name,
      bookingId: `${this.name}-${crypto.randomUUID()}`,
      status: "held",
      providerReference: `PNR${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
      payload
    };
  }

  async issueTicket(payload) {
    if (!mockProvidersEnabled()) throw unavailable(this.name, "ticketing");
    return {
      provider: this.name,
      bookingId: payload.bookingId,
      status: "ticketed",
      ticketNumbers: [`607-${Math.floor(1000000000 + Math.random() * 8999999999)}`]
    };
  }

  async retrieveBooking(payload) {
    if (!mockProvidersEnabled()) throw unavailable(this.name, "booking retrieval");
    return {
      provider: this.name,
      bookingId: payload.bookingId,
      status: "retrieved"
    };
  }

  async cancelBooking(payload) {
    if (!mockProvidersEnabled()) throw unavailable(this.name, "booking cancellation");
    return {
      provider: this.name,
      bookingId: payload.bookingId,
      status: "cancelRequested"
    };
  }

  async exchangeSearch(payload) {
    if (!mockProvidersEnabled()) throw unavailable(this.name, "exchange search");
    return {
      provider: this.name,
      bookingId: payload.bookingId,
      offers: buildMockOffers(payload.search || payload, this.name)
    };
  }

  async exchangePrice(payload) {
    if (!mockProvidersEnabled()) throw unavailable(this.name, "exchange pricing");
    return this.priceOffer(payload);
  }

  async exchangeCommit(payload) {
    if (!mockProvidersEnabled()) throw unavailable(this.name, "exchange commit");
    return {
      provider: this.name,
      bookingId: payload.bookingId,
      status: "exchangeCommitted"
    };
  }

  async documents(payload) {
    if (!mockProvidersEnabled()) throw unavailable(this.name, "documents");
    return {
      provider: this.name,
      bookingId: payload.bookingId,
      documents: []
    };
  }
}

function mockProvidersEnabled() {
  return process.env.ENABLE_MOCK_PROVIDERS === "true";
}

function unavailable(provider, action) {
  const error = new Error(`${provider} live ${action} adapter is not configured`);
  error.provider = provider;
  error.statusCode = 503;
  return error;
}
