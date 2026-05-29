export function buildMockOffers(request, provider) {
  const airlines = {
    travelport: ["PIA", "Qatar Airways", "Emirates"],
    flyadeal: ["flyadeal"],
    airsial: ["AirSial"],
    pia: ["PIA"]
  }[provider] || ["Travelian Air"];

  return airlines.map((airline, index) => {
    const total = 72000 + index * 13500 + provider.length * 850;
    return {
      provider,
      offerId: `${provider}-${crypto.randomUUID()}`,
      airline,
      flightNumber: `${airline.replace(/[^A-Z]/gi, "").slice(0, 2).toUpperCase()}-${701 + index}`,
      origin: request.origin,
      destination: request.destination,
      departureTime: `${request.departureDate}T${String(8 + index * 3).padStart(2, "0")}:00:00`,
      arrivalTime: `${request.departureDate}T${String(11 + index * 3).padStart(2, "0")}:20:00`,
      duration: `${3 + index}h 20m`,
      stops: index === 0 ? 0 : 1,
      cabin: request.cabin,
      fareBrand: index === 0 ? "Value" : "Flex",
      baggage: index === 0 ? "1 checked bag" : "2 checked bags",
      refundable: index > 0,
      fareOptions: buildFareOptions(total, request.currency, index),
      requiresReprice: true,
      price: {
        currency: request.currency,
        base: total - 9000,
        taxes: 9000,
        total
      }
    };
  });
}

function buildFareOptions(total, currency, index) {
  const changeFee = currency === "USD" ? "USD 50" : "PKR 14,000";
  return [
    {
      tier: "Basic",
      price: { currency, total },
      bags: index === 0 ? "1 carry-on" : "1 checked bag",
      change: "No changes",
      refund: "Non-refundable",
      popular: false
    },
    {
      tier: "Standard",
      price: { currency, total: total + (currency === "USD" ? 60 : 16800) },
      bags: "1 carry-on + 1 checked",
      change: `Change for ${changeFee}`,
      refund: "Partial refund",
      popular: true
    },
    {
      tier: "Flex",
      price: { currency, total: total + (currency === "USD" ? 130 : 36400) },
      bags: "2 checked + 1 carry-on",
      change: "Free changes",
      refund: "Full refund",
      popular: false
    }
  ];
}

export function buildMockHotels(request, provider) {
  const city = request.location || request.city || request.destination || "Dubai";
  const nights = nightsBetween(request.checkIn, request.checkOut);
  const properties = [
    { name: `${city} Grand Hotel`, stars: 5, amenities: ["Free WiFi", "Breakfast", "Airport Shuttle", "Pool"] },
    { name: `${city} Business Suites`, stars: 4, amenities: ["Free WiFi", "Restaurant", "Fitness Center"] },
    { name: `${city} Comfort Inn`, stars: 3, amenities: ["Free WiFi", "Breakfast"] }
  ];

  return properties.map((hotel, index) => {
    const nightly = 18000 + index * 7500 + provider.length * 600;
    return {
      provider,
      hotelId: `${provider}-hotel-${crypto.randomUUID()}`,
      name: hotel.name,
      city,
      country: request.country || "",
      starRating: hotel.stars,
      pricePerNight: nightly,
      totalPrice: nightly * nights,
      currency: request.currency || process.env.DEFAULT_CURRENCY || "PKR",
      rooms: 8 + index * 4,
      amenities: hotel.amenities,
      refundable: index !== 2,
      image: null,
      rawRef: null
    };
  });
}

export function buildMockTransfers(request, provider) {
  const pickup = request.pickup || "Airport";
  const dropoff = request.dropoff || "Hotel";
  const currency = request.currency || process.env.DEFAULT_CURRENCY || "PKR";
  const vehicles = [
    { name: "Private Sedan", passengers: 3, bags: 2, multiplier: 1 },
    { name: "Executive SUV", passengers: 5, bags: 4, multiplier: 1.55 },
    { name: "Family Van", passengers: 7, bags: 6, multiplier: 1.9 }
  ];

  return vehicles.map((vehicle, index) => {
    const total = Math.round((9500 + provider.length * 350) * vehicle.multiplier);
    return {
      provider,
      transferId: `${provider}-transfer-${crypto.randomUUID()}`,
      vehicleName: vehicle.name,
      pickup,
      dropoff,
      pickupDate: request.pickupDate,
      pickupTime: request.pickupTime || "10:00",
      passengers: vehicle.passengers,
      bags: vehicle.bags,
      durationMinutes: 35 + index * 12,
      cancellationPolicy: index === 0 ? "Free cancellation before pickup" : "Partial refund before pickup",
      price: {
        currency,
        total
      },
      rawRef: null
    };
  });
}

function nightsBetween(checkIn, checkOut) {
  const start = new Date(checkIn);
  const end = new Date(checkOut);
  const nights = Math.round((end.getTime() - start.getTime()) / 86400000);
  return Number.isFinite(nights) && nights > 0 ? nights : 1;
}
