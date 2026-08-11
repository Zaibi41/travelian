import type { UmrahPackage } from "@/data/models";
import { umrahOffers, type UmrahOffer } from "@/data/services/umrah";

/** Seed Umrah offer -> admin package shape, so detail pages and admin-driven UI share one model. */
export function umrahOfferToPackage(offer: UmrahOffer): UmrahPackage {
  const includes = [
    offer.includes.ticket ? "Air ticket" : null,
    offer.includes.visa ? "Umrah visa" : null,
    offer.includes.hotel ? "Hotel accommodation" : null,
    offer.includes.transport ? "Transport" : null,
    offer.includes.ziarat ? "Ziarat" : null,
  ].filter(Boolean) as string[];

  return {
    packageId: offer.id,
    name: offer.name,
    description: `${offer.tier} Umrah package from ${offer.departureCity} on ${offer.airline}. ${offer.durationLabel}. Makkah stay at ${offer.makkahHotel} (${offer.makkahDistance}) and Madinah stay at ${offer.madinahHotel} (${offer.madinahDistance}).`,
    basePrice: offer.startingFrom ?? offer.prices.sharing ?? 0,
    duration: offer.durationLabel,
    hotel: offer.makkahHotel,
    city: offer.departureCity,
    status: "active",
    includes,
    category: "umrah",
    packageType: offer.tier,
    makkahHotel: offer.makkahHotel,
    makkahHotelInfo: offer.makkahDistance,
    madinahHotel: offer.madinahHotel,
    madinahHotelInfo: offer.madinahDistance,
    departureCity: offer.departureCity,
    transportIncluded: offer.includes.transport,
    visaIncluded: offer.includes.visa,
    ticketIncluded: offer.includes.ticket,
    seatsLabel: offer.seatsLeft ? `${offer.seatsLeft} seats left` : undefined,
    childPrice: offer.prices.child,
    infantPrice: offer.prices.infant,
    flightDates: offer.departureDate
      ? [{ outboundDate: offer.departureDate, outboundRoute: `${offer.departureCity} - JED`, returnDate: offer.returnDate, returnRoute: `JED - ${offer.departureCity}` }]
      : undefined,
    hotelOptions: [
      {
        label: `${offer.tier} hotels`,
        makkahHotel: offer.makkahHotel,
        makkahInfo: offer.makkahDistance,
        madinahHotel: offer.madinahHotel,
        madinahInfo: offer.madinahDistance,
        prices: { sharing: offer.prices.sharing, quad: offer.prices.quad, triple: offer.prices.triple, double: offer.prices.double },
      },
    ],
    terms: offer.bookingDeadline
      ? `Booking deadline: ${offer.bookingDeadline}. Prices are starting-from and confirmed before booking.`
      : "Prices are starting-from and confirmed before booking.",
  };
}

/** Admin package -> Umrah offer card shape, so admin inventory renders in the new catalogue. */
export function packageToUmrahOffer(item: UmrahPackage): UmrahOffer {
  const option = item.hotelOptions?.[0];
  const daysMatch = /(\d+)/.exec(item.duration || "");
  const rawDays = daysMatch ? Number(daysMatch[1]) : 15;
  const days = ([7, 10, 15, 21, 28] as const).reduce((best, d) => (Math.abs(d - rawDays) < Math.abs(best - rawDays) ? d : best), 15 as 7 | 10 | 15 | 21 | 28);
  const tier = (["Economy", "Standard", "Executive", "Premium"] as const).find(
    (t) => t.toLowerCase() === (item.packageType || "").toLowerCase(),
  ) ?? "Standard";

  return {
    id: item.packageId,
    name: item.name,
    tier,
    days,
    durationLabel: item.duration || `${days} Days`,
    departureCity: item.departureCity || item.city || "On request",
    airline: "Airline on request",
    departureDate: item.flightDates?.[0]?.outboundDate,
    returnDate: item.flightDates?.[0]?.returnDate,
    makkahHotel: item.makkahHotel || option?.makkahHotel || item.hotel || "On request",
    makkahDistance: item.makkahHotelInfo || option?.makkahInfo || "Distance on request",
    madinahHotel: item.madinahHotel || option?.madinahHotel || "On request",
    madinahDistance: item.madinahHotelInfo || option?.madinahInfo || "Distance on request",
    prices: {
      sharing: option?.prices.sharing ?? item.basePrice,
      quad: option?.prices.quad,
      triple: option?.prices.triple,
      double: option?.prices.double,
      child: item.childPrice,
      infant: item.infantPrice,
    },
    startingFrom: item.basePrice,
    bookingDeadline: undefined,
    includes: {
      ticket: item.ticketIncluded !== false,
      visa: item.visaIncluded !== false,
      hotel: true,
      transport: item.transportIncluded !== false,
      ziarat: (item.includes || []).some((entry) => entry.toLowerCase().includes("ziarat")),
    },
    status: "Available",
    image: item.image,
  };
}

export function findSeedUmrahOffer(id?: string) {
  return id ? umrahOffers.find((offer) => offer.id === id) : undefined;
}
