import { buildMockOffers } from "./mock-data.mjs";

export class ProviderAdapter {
  constructor(name) {
    this.name = name;
  }

  async searchFlights(request) {
    return buildMockOffers(request, this.name);
  }

  async priceOffer(payload) {
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
    return {
      provider: this.name,
      offerId: payload.offerId,
      supported: false,
      seats: []
    };
  }

  async createBooking(payload) {
    return {
      provider: this.name,
      bookingId: `${this.name}-${crypto.randomUUID()}`,
      status: "held",
      providerReference: `PNR${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
      payload
    };
  }

  async issueTicket(payload) {
    return {
      provider: this.name,
      bookingId: payload.bookingId,
      status: "ticketed",
      ticketNumbers: [`607-${Math.floor(1000000000 + Math.random() * 8999999999)}`]
    };
  }

  async retrieveBooking(payload) {
    return {
      provider: this.name,
      bookingId: payload.bookingId,
      status: "retrieved"
    };
  }

  async cancelBooking(payload) {
    return {
      provider: this.name,
      bookingId: payload.bookingId,
      status: "cancelRequested"
    };
  }

  async exchangeSearch(payload) {
    return {
      provider: this.name,
      bookingId: payload.bookingId,
      offers: buildMockOffers(payload.search || payload, this.name)
    };
  }

  async exchangePrice(payload) {
    return this.priceOffer(payload);
  }

  async exchangeCommit(payload) {
    return {
      provider: this.name,
      bookingId: payload.bookingId,
      status: "exchangeCommitted"
    };
  }

  async documents(payload) {
    return {
      provider: this.name,
      bookingId: payload.bookingId,
      documents: []
    };
  }
}
