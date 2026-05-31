export class ProviderAdapter {
  constructor(name) {
    this.name = name;
  }

  async searchFlights(request) {
    throw unavailable(this.name, "flight search");
  }

  async priceOffer(payload) {
    throw unavailable(this.name, "fare pricing");
  }

  async fareRules(payload) {
    throw unavailable(this.name, "fare rules");
  }

  async seatMap(payload) {
    throw unavailable(this.name, "seat map");
  }

  async createBooking(payload) {
    throw unavailable(this.name, "booking");
  }

  async issueTicket(payload) {
    throw unavailable(this.name, "ticketing");
  }

  async retrieveBooking(payload) {
    throw unavailable(this.name, "booking retrieval");
  }

  async cancelBooking(payload) {
    throw unavailable(this.name, "booking cancellation");
  }

  async exchangeSearch(payload) {
    throw unavailable(this.name, "exchange search");
  }

  async exchangePrice(payload) {
    throw unavailable(this.name, "exchange pricing");
  }

  async exchangeCommit(payload) {
    throw unavailable(this.name, "exchange commit");
  }

  async documents(payload) {
    throw unavailable(this.name, "documents");
  }
}

function unavailable(provider, action) {
  const error = new Error(`${provider} live ${action} adapter is not configured`);
  error.provider = provider;
  error.statusCode = 503;
  return error;
}
