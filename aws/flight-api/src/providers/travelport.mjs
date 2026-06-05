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
    const response = await this.post("/air/catalog/search/catalogproductofferings", payload, token);
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

    const clientId = secret.clientId || secret.client_id;
    const clientSecret = secret.clientSecret || secret.client_secret;
    const tokenUrl = secret.tokenUrl || secret.token_url || "https://auth.pp.travelport.net/oauth/token";
    if (!clientId || !clientSecret) {
      throw new Error("Travelport secret must include clientId/clientSecret or client_id/client_secret");
    }

    const body = new URLSearchParams();
    if (secret.username && secret.password) {
      body.set("grant_type", "password");
      body.set("username", secret.username);
      body.set("password", secret.password);
    } else {
      body.set("grant_type", "client_credentials");
    }
    body.set("client_id", clientId);
    body.set("client_secret", clientSecret);

    const response = await fetch(tokenUrl, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body
    });
    if (!response.ok) throw new Error(`Travelport OAuth failed: ${response.status}`);
    const json = await response.json();
    return json.access_token;
  }

  async post(path, payload, token) {
    const secret = await getSecretJson(this.secretId);
    const accessGroup = secret?.accessGroup || secret?.access_group || secret?.xauthTravelportAccessGroup;
    const response = await fetch(`${this.baseUrl}${path}`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${token}`,
        "content-type": "application/json",
        accept: "application/json",
        "accept-version": "11",
        "content-version": "11",
        taxBreakDown: "true",
        ...(accessGroup ? { "XAUTH_TRAVELPORT_ACCESSGROUP": accessGroup } : {})
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
      "@type": "CatalogProductOfferingsQueryRequest",
      CatalogProductOfferingsRequest: {
        "@type": "CatalogProductOfferingsRequestAir",
        maxNumberOfUpsellsToReturn: 4,
        offersPerPage: Number(process.env.TRAVELPORT_OFFERS_PER_PAGE || 15),
        contentSourceList: ["GDS"],
        SearchCriteriaFlight: request.tripType === "multicity" ? request.segments.map(segment => ({
          "@type": "SearchCriteriaFlight",
          departureDate: segment.date,
          From: { value: segment.from },
          To: { value: segment.to }
        })) : [
          {
            "@type": "SearchCriteriaFlight",
            departureDate: request.departureDate,
            From: { value: request.origin },
            To: { value: request.destination }
          },
          ...(request.tripType === "roundtrip" ? [{
            "@type": "SearchCriteriaFlight",
            departureDate: request.returnDate,
            From: { value: request.destination },
            To: { value: request.origin }
          }] : [])
        ],
        PassengerCriteria: [
          { "@type": "PassengerCriteria", passengerTypeCode: "ADT", number: request.passengers.adults },
          ...(request.passengers.children ? [{ "@type": "PassengerCriteria", passengerTypeCode: "CNN", number: request.passengers.children }] : []),
          ...(request.passengers.infants ? [{ "@type": "PassengerCriteria", passengerTypeCode: "INF", number: request.passengers.infants }] : [])
        ],
        SearchModifiersAir: {
          "@type": "SearchModifiersAir",
          CarrierPreference: [{ "@type": "CarrierPreference" }]
        },
        ...(request.tripType === "roundtrip" ? {
          CustomResponseModifiersAir: { "@type": "CustomResponseModifiersAir", SearchRepresentation: "Journey" }
        } : {})
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
    const references = buildTravelportReferences(response);

    if (!Array.isArray(offerings) || offerings.length === 0) {
      return [];
    }

    return offerings.slice(0, 50).flatMap((offer, offerIndex) => {
      const productBrandOptions = Array.isArray(offer.ProductBrandOptions) && offer.ProductBrandOptions.length
        ? offer.ProductBrandOptions
        : [null];

      return productBrandOptions.map((productBrandOption, optionIndex) => {
        const fareOptions = this.extractFareOptions(offer, request, references, productBrandOption);
        const firstPrice = fareOptions.find(option => option.price?.total)?.price;
        const itinerary = resolveItinerary(offer, references, productBrandOption);
        return {
          provider: this.name,
          offerId: [offer.id || `travelport-${offerIndex}`, productBrandOption?.id || `option-${optionIndex + 1}`].join(":"),
          airline: itinerary.airline || "Airline TBA",
          airlineImage: itinerary.airlineImage || null,
          flightNumber: itinerary.flightNumber || `Offer ${offerIndex + 1}.${optionIndex + 1}`,
          origin: request.origin,
          destination: request.destination,
          departureTime: itinerary.departureTime || null,
          arrivalTime: itinerary.arrivalTime || null,
          duration: itinerary.duration || null,
          stops: itinerary.stops,
          segments: itinerary.segments,
          layovers: itinerary.layovers,
          cabin: itinerary.cabin || request.cabin,
          fareBrand: null,
          baggage: itinerary.baggage || null,
          meal: itinerary.meal || null,
          refundable: null,
          fareOptions,
          requiresReprice: true,
          price: {
            currency: firstPrice?.currency || request.currency,
            base: firstPrice?.base ?? null,
            taxes: firstPrice?.taxes ?? null,
            total: firstPrice?.total ?? null
          },
          rawRef: {
            ...offer,
            selectedProductBrandOption: productBrandOption
          }
        };
      });
    });
  }

  extractFareOptions(offer, request, references, productBrandOption = null) {
    const selectedOption = productBrandOption || offer.ProductBrandOptions?.[0] || {};
    const brandOfferings = selectedOption.ProductBrandOffering || [];
    const currency = request.currency || process.env.DEFAULT_CURRENCY || "PKR";
    const options = brandOfferings
      .map((brand, index) => {
        const price = brand.BestCombinablePrice || brand.Price || brand.price || {};
        const total = Number(price.TotalPrice || price.total || price.Amount || price.amount || 0);
        const base = Number(price.Base || price.base || 0);
        const taxes = Number(price.TotalTaxes || price.totalTaxes || price.taxes || 0);
        const brandRef = refValue(brand.Brand, "BrandRef");
        const brandReference = brandRef ? references?.brandById?.get(brandRef) : null;
        const tier = brandReference?.name || brandReference?.Name || brand.Brand?.name || brand.Brand?.Name || brand.brandName || ["Basic", "Standard", "Flex"][index] || `Fare ${index + 1}`;
        return {
          tier,
          price: {
            currency: currencyCode(price.CurrencyCode) || price.currency || currency,
            base: base || null,
            taxes: taxes || null,
            total: total || null
          },
          bags: brand.BaggageAllowance || brand.baggage || brandAttributeIncluded(brandReference, "CheckedBag") || "Baggage info not provided by airline",
          change: brand.ChangePenalty || brand.change || brandAttributeIncluded(brandReference, "Rebooking") || "See fare rules",
          refund: brand.RefundPenalty || brand.refund || brandAttributeIncluded(brandReference, "Refund") || "See fare rules",
          amenities: brandAttributes(brandReference),
          popular: index === 1
        };
      })
      .filter(option => option.tier);

    return options.length ? options : [];
  }

  normalizeCurrencyCode(value) {
    return currencyCode(value);
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

function currencyCode(value) {
  if (!value) return null;
  if (typeof value === "string") return value;
  if (typeof value === "object") return value.value || value.Value || value.code || value.Code || null;
  return null;
}

function buildTravelportReferences(response) {
  const referenceLists = response?.CatalogProductOfferingsResponse?.ReferenceList || [];
  const flightById = new Map();
  const productById = new Map();
  const brandById = new Map();

  for (const list of Array.isArray(referenceLists) ? referenceLists : []) {
    for (const flight of list.Flight || []) {
      if (flight?.id) flightById.set(flight.id, flight);
    }
    for (const product of list.Product || []) {
      if (product?.id) productById.set(product.id, product);
    }
    for (const brand of list.Brand || []) {
      if (brand?.id) brandById.set(brand.id, brand);
    }
  }

  return { flightById, productById, brandById };
}

function resolveItinerary(offer, references, productBrandOption = null) {
  const firstOption = productBrandOption || offer?.ProductBrandOptions?.[0] || {};
  const firstBrandOffering = firstOption.ProductBrandOffering?.[0] || {};
  const productRef = refValue(firstBrandOffering.Product?.[0] || firstBrandOffering.Product, "productRef");
  const brandRef = refValue(firstBrandOffering.Brand, "BrandRef");
  const product = productRef ? references.productById.get(productRef) : null;
  const brand = brandRef ? references.brandById.get(brandRef) : null;
  const flightRefs = Array.isArray(firstOption.flightRefs) && firstOption.flightRefs.length
    ? firstOption.flightRefs
    : productFlightRefs(product);
  const flights = flightRefs.map(ref => references.flightById.get(ref)).filter(Boolean);
  const firstFlight = flights[0];
  const lastFlight = flights[flights.length - 1];
  const carriers = [...new Set(flights.map(flight => String(flight.carrier || "").toUpperCase()).filter(Boolean))];
  const airline = carriers.length === 1 ? airlineName(carriers[0]) : carriers.join(" / ");
  const flightNumber = flights
    .map(flight => `${String(flight.carrier || "").toUpperCase()}-${flight.number}`)
    .filter(value => !value.startsWith("-") && !value.endsWith("-"))
    .join(" / ");

  return {
    airline,
    airlineImage: firstImageUrl(brand),
    flightNumber,
    departureTime: flightDateTime(firstFlight?.Departure),
    arrivalTime: flightDateTime(lastFlight?.Arrival),
    duration: formatIsoDuration(product?.totalDuration || offer?.duration || firstFlight?.duration),
    stops: flights.length ? Math.max(0, flights.length - 1) : null,
    segments: flights.map(normalizeFlightSegment),
    layovers: buildLayovers(flights),
    cabin: product?.PassengerFlight?.[0]?.FlightProduct?.[0]?.cabin,
    baggage: brandAttributeIncluded(brand, "CheckedBag") || brandAttributeIncluded(brand, "CarryOn"),
    meal: brandAttributeIncluded(brand, "Meals")
  };
}

function normalizeFlightSegment(flight) {
  const carrier = String(flight?.carrier || "").toUpperCase();
  return {
    id: flight?.id || null,
    carrier,
    flightNumber: [carrier, flight?.number].filter(Boolean).join("-"),
    origin: flight?.Departure?.location || null,
    destination: flight?.Arrival?.location || null,
    departureTime: flightDateTime(flight?.Departure),
    arrivalTime: flightDateTime(flight?.Arrival),
    departureTerminal: flight?.Departure?.terminal || null,
    arrivalTerminal: flight?.Arrival?.terminal || null,
    duration: formatIsoDuration(flight?.duration),
    equipment: flight?.equipment || null
  };
}

function buildLayovers(flights) {
  const layovers = [];
  for (let index = 0; index < flights.length - 1; index += 1) {
    const current = flights[index];
    const next = flights[index + 1];
    const arrivalTime = flightDateTime(current?.Arrival);
    const departureTime = flightDateTime(next?.Departure);
    layovers.push({
      location: current?.Arrival?.location || next?.Departure?.location || null,
      arrivalTime,
      departureTime,
      duration: durationBetween(arrivalTime, departureTime),
      nextFlightNumber: [String(next?.carrier || "").toUpperCase(), next?.number].filter(Boolean).join("-")
    });
  }
  return layovers;
}

function productFlightRefs(product) {
  return (product?.FlightSegment || [])
    .map(segment => refValue(segment.Flight, "FlightRef"))
    .filter(Boolean);
}

function refValue(value, key) {
  if (!value) return null;
  if (Array.isArray(value)) return refValue(value[0], key);
  if (typeof value === "string") return null;
  return value[key] || value[key.charAt(0).toLowerCase() + key.slice(1)] || null;
}

function flightDateTime(detail) {
  if (!detail?.date || !detail?.time) return null;
  return `${detail.date}T${String(detail.time).slice(0, 5)}`;
}

function durationBetween(startValue, endValue) {
  if (!startValue || !endValue) return null;
  const start = new Date(startValue).getTime();
  const end = new Date(endValue).getTime();
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return null;
  const totalMinutes = Math.round((end - start) / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours ? `${hours}h` : ""}${hours && minutes ? " " : ""}${minutes ? `${minutes}m` : ""}` || "0m";
}

function formatIsoDuration(value) {
  const text = String(value || "");
  const match = text.match(/^PT(?:(\d+)H)?(?:(\d+)M)?$/i);
  if (!match) return null;
  const hours = Number(match[1] || 0);
  const minutes = Number(match[2] || 0);
  return `${hours ? `${hours}h` : ""}${hours && minutes ? " " : ""}${minutes ? `${minutes}m` : ""}` || null;
}

function brandAttributeIncluded(brand, classification) {
  const attributes = [...(brand?.BrandAttribute || []), ...(brand?.AdditionalBrandAttribute || [])];
  const match = attributes.find(attribute => String(attribute.classification || attribute.Classification || "").toLowerCase() === classification.toLowerCase());
  if (!match) return null;
  const inclusion = match.inclusion || match.Inclusion;
  if (!inclusion) return null;
  return `${classification.replace(/([a-z])([A-Z])/g, "$1 $2")}: ${inclusion}`;
}

function brandAttributes(brand) {
  const attributes = [...(brand?.BrandAttribute || []), ...(brand?.AdditionalBrandAttribute || [])];
  return attributes
    .map(attribute => {
      const classification = attribute.classification || attribute.Classification;
      const inclusion = attribute.inclusion || attribute.Inclusion;
      if (!classification || !inclusion) return null;
      return `${classification}: ${inclusion}`;
    })
    .filter(Boolean);
}

function firstImageUrl(brand) {
  const images = brand?.ImageURL || brand?.imageURL || brand?.images || [];
  if (Array.isArray(images)) return images.find(Boolean) || null;
  return typeof images === "string" ? images : null;
}

function airlineName(code) {
  const airlines = {
    "9P": "Fly Jinnah",
    EK: "Emirates",
    ER: "Serene Air",
    EY: "Etihad Airways",
    F3: "flyadeal",
    FZ: "flydubai",
    G9: "Air Arabia",
    J9: "Jazeera Airways",
    KU: "Kuwait Airways",
    OV: "Salam Air",
    PA: "Airblue",
    PF: "AirSial",
    PK: "PIA",
    QR: "Qatar Airways",
    SV: "Saudia",
    TK: "Turkish Airlines",
    WY: "Oman Air",
    XY: "Flynas"
  };
  return airlines[code] || code;
}
