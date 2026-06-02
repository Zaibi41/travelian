import { ProviderAdapter } from "./provider-base.mjs";
import { getSecretJson } from "../secrets.mjs";

export class TravelportAdapter extends ProviderAdapter {
  constructor() {
    super("travelport");
    this.baseUrl = process.env.TRAVELPORT_BASE_URL || "https://api.pp.travelport.net/11";
    this.secretId = process.env.TRAVELPORT_SECRET_ID;
  }

  async searchFlights(request) {
    const token = await this.accessToken();
    const payload = this.toSearchPayload(request);
    const response = await this.post("/catalog/search/catalogproductofferings", payload, token);
    return this.normalizeSearchResponse(response, request);
  }

  async searchHotels(request) {
    const token = await this.accessToken();
    const payload = this.toHotelSearchPayload(request);
    const response = await this.post("/hotel/search/properties/search", payload, token);
    return this.normalizeHotelSearchResponse(response, request);
  }

  async searchTransfers(request) {
    const token = await this.accessToken();
    const payload = this.toTransferSearchPayload(request);
    const response = await this.post("/vehicle/search", payload, token);
    return this.normalizeTransferSearchResponse(response, request);
  }

  async priceOffer(payload) {
    return {
      provider: this.name,
      offerId: payload.offerId,
      available: true,
      requiresTravelportReferencePayload: true,
      message: "Wire this to AirPrice reference payload using the selected Search response identifiers."
    };
  }

  async createBooking(payload) {
    return {
      provider: this.name,
      status: "notImplemented",
      message: "Create workbench -> add offer -> add traveler -> commit reservation workflow is scaffolded; provider reference payload mapping must be completed with live credentials."
    };
  }

  async accessToken() {
    const secret = await getSecretJson(this.secretId);
    if (!secret) throw new Error("Travelport secret is not configured");

    if (secret.baseUrl) this.baseUrl = secret.baseUrl;
    if (secret.accessToken) return secret.accessToken;
    if (!secret.clientId || !secret.clientSecret || !secret.tokenUrl) {
      throw new Error("Travelport secret must include tokenUrl, clientId, and clientSecret");
    }

    const body = new URLSearchParams({
      grant_type: "client_credentials",
      client_id: secret.clientId,
      client_secret: secret.clientSecret
    });
    const response = await fetch(secret.tokenUrl, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body
    });
    if (!response.ok) throw new Error(`Travelport OAuth failed: ${response.status}`);
    const json = await response.json();
    return json.access_token;
  }

  async post(path, payload, token) {
    const response = await fetch(`${this.baseUrl}${path}`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${token}`,
        "content-type": "application/json",
        accept: "application/json"
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(Number(process.env.PROVIDER_TIMEOUT_MS || 9000))
    });
    const json = await response.json().catch(() => ({}));
    if (!response.ok) {
      const error = new Error(`Travelport ${path} failed with ${response.status}`);
      error.providerResponse = json;
      throw error;
    }
    return json;
  }

  toSearchPayload(request) {
    return {
      CatalogProductOfferingsQueryRequest: {
        CatalogProductOfferingsRequest: {
          SearchCriteriaFlight: request.tripType === "multicity" ? request.segments.map(segment => ({
            departureDate: segment.date,
            From: { value: segment.from },
            To: { value: segment.to }
          })) : [
            {
              departureDate: request.departureDate,
              From: { value: request.origin },
              To: { value: request.destination }
            },
            ...(request.tripType === "roundtrip" ? [{
              departureDate: request.returnDate,
              From: { value: request.destination },
              To: { value: request.origin }
            }] : [])
          ],
          PassengerCriteria: [
            { passengerTypeCode: "ADT", number: request.passengers.adults },
            ...(request.passengers.children ? [{ passengerTypeCode: "CNN", number: request.passengers.children }] : []),
            ...(request.passengers.infants ? [{ passengerTypeCode: "INF", number: request.passengers.infants }] : [])
          ],
          SearchModifiersAir: {
            CabinPreference: [{ cabin: request.cabin }]
          }
        }
      }
    };
  }

  toHotelSearchPayload(request) {
    return {
      HotelSearchRequest: {
        SearchCriteria: {
          location: request.location,
          checkInDate: request.checkIn,
          checkOutDate: request.checkOut,
          rooms: request.rooms || 1,
          adults: request.guests?.adults || 1,
          children: request.guests?.children || 0,
          currency: request.currency || process.env.DEFAULT_CURRENCY || "PKR"
        }
      }
    };
  }

  toTransferSearchPayload(request) {
    return {
      VehicleSearchRequest: {
        pickupLocation: request.pickup,
        dropoffLocation: request.dropoff,
        pickupDate: request.pickupDate,
        pickupTime: request.pickupTime || "10:00",
        passengers: request.passengers || 1,
        currency: request.currency || process.env.DEFAULT_CURRENCY || "PKR"
      }
    };
  }

  normalizeSearchResponse(response, request) {
    const offerings =
      response?.CatalogProductOfferingsResponse?.CatalogProductOfferings?.CatalogProductOffering || [];

    if (!Array.isArray(offerings) || offerings.length === 0) {
      return [];
    }

    return offerings.slice(0, 50).map((offer, index) => ({
      provider: this.name,
      offerId: offer.id || `travelport-${index}`,
      airline: offer.ProductBrandOptions?.[0]?.ProductBrandOffering?.[0]?.Product?.[0]?.FlightSegment?.[0]?.carrier || "Travelport",
      flightNumber: offer.sequence || `TP-${index + 1}`,
      origin: request.origin,
      destination: request.destination,
      departureTime: null,
      arrivalTime: null,
      duration: null,
      stops: null,
      cabin: request.cabin,
      fareBrand: null,
      baggage: null,
      refundable: null,
      fareOptions: this.extractFareOptions(offer, request),
      requiresReprice: true,
      price: {
        currency: request.currency,
        base: null,
        taxes: null,
        total: null
      },
      rawRef: offer
    }));
  }

  extractFareOptions(offer, request) {
    const brandOfferings = offer.ProductBrandOptions?.[0]?.ProductBrandOffering || [];
    const currency = request.currency || process.env.DEFAULT_CURRENCY || "PKR";
    const options = brandOfferings
      .map((brand, index) => {
        const price = brand.Price || brand.price || {};
        const total = Number(price.TotalPrice || price.total || price.Amount || price.amount || 0);
        const tier = brand.Brand?.name || brand.Brand?.Name || brand.brandName || ["Basic", "Standard", "Flex"][index] || `Fare ${index + 1}`;
        return {
          tier,
          price: {
            currency: price.currency || currency,
            total: total || null
          },
          bags: brand.BaggageAllowance || brand.baggage || "Baggage returned by provider",
          change: brand.ChangePenalty || brand.change || "See fare rules",
          refund: brand.RefundPenalty || brand.refund || "See fare rules",
          popular: index === 1
        };
      })
      .filter(option => option.tier);

    return options.length ? options : [];
  }

  normalizeHotelSearchResponse(response, request) {
    const properties =
      response?.HotelSearchResponse?.Properties ||
      response?.HotelSearchResponse?.Property ||
      response?.Properties ||
      [];

    const list = Array.isArray(properties) ? properties : [];
    return list.slice(0, 50).map((hotel, index) => {
      const rate = hotel.Rate || hotel.rate || hotel.Price || hotel.price || {};
      const total = Number(rate.total || rate.Total || rate.amount || rate.Amount || 0);
      return {
        provider: this.name,
        hotelId: hotel.id || hotel.propertyId || `travelport-hotel-${index}`,
        name: hotel.name || hotel.propertyName || "Travelport Hotel",
        city: hotel.city || request.location,
        country: hotel.country || "",
        starRating: Number(hotel.starRating || hotel.rating || 4),
        pricePerNight: total || null,
        totalPrice: total || null,
        currency: rate.currency || request.currency || process.env.DEFAULT_CURRENCY || "PKR",
        rooms: hotel.availableRooms || null,
        amenities: hotel.amenities || [],
        refundable: hotel.refundable ?? null,
        image: hotel.image || null,
        rawRef: hotel
      };
    });
  }

  normalizeTransferSearchResponse(response, request) {
    const offers = response?.VehicleSearchResponse?.Offers || response?.offers || [];
    const list = Array.isArray(offers) ? offers : [];
    return list.slice(0, 50).map((offer, index) => ({
      provider: this.name,
      transferId: offer.id || `travelport-transfer-${index}`,
      vehicleName: offer.vehicleName || offer.name || "Travelport Transfer",
      pickup: request.pickup,
      dropoff: request.dropoff,
      pickupDate: request.pickupDate,
      pickupTime: request.pickupTime || "10:00",
      passengers: Number(offer.passengers || request.passengers || 1),
      bags: Number(offer.bags || 2),
      durationMinutes: Number(offer.durationMinutes || 45),
      cancellationPolicy: offer.cancellationPolicy || "Provider policy applies",
      price: {
        currency: offer.price?.currency || request.currency || process.env.DEFAULT_CURRENCY || "PKR",
        total: Number(offer.price?.total || offer.total || 0)
      },
      rawRef: offer
    }));
  }
}
