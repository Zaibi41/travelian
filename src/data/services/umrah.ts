// Umrah service catalogue.
// Structured to mirror future admin/database tables (packages, hotels, visa rates,
// transport rates, city-wise packages) so the same shapes can later be fetched from the API.

export type UmrahPackageTier = "Economy" | "Standard" | "Executive" | "Premium";
export type UmrahDuration = 7 | 10 | 15 | 21 | 28;

export interface UmrahOffer {
  id: string;
  name: string;
  tier: UmrahPackageTier;
  days: UmrahDuration;
  durationLabel: string;
  departureCity: string;
  airline: string;
  departureDate?: string;
  returnDate?: string;
  makkahHotel: string;
  makkahDistance: string;
  makkahDistanceMeters?: number;
  madinahHotel: string;
  madinahDistance: string;
  prices: {
    sharing?: number;
    quad?: number;
    triple?: number;
    double?: number;
    child?: number;
    infant?: number;
  };
  startingFrom?: number;
  seatsLeft?: number;
  bookingDeadline?: string;
  includes: {
    ticket: boolean;
    visa: boolean;
    hotel: boolean;
    transport: boolean;
    ziarat: boolean;
  };
  status: "Available" | "Limited seats" | "On request";
  image?: string;
}

export interface UmrahCityOffer {
  city: string;
  route: string;
  startingFrom?: number;
  note: string;
}

export interface UmrahHotelRate {
  id: string;
  name: string;
  city: "Makkah" | "Madinah";
  location: string;
  distance: string;
  category: string;
  shuttle: boolean;
  mealPlan: string;
  roomType: string;
  rates: { sharing?: number; double?: number; triple?: number; quad?: number };
  rateValidity: string;
  supplier?: string;
  image?: string;
}

export interface UmrahTransportRate {
  id: string;
  route: string;
  vehicle: string;
  passengers: string;
  luggage: string;
  type: "Shared" | "Private" | "Shared / Private";
  startingFromSar?: number;
  note: string;
}

export const UMRAH_DURATIONS: UmrahDuration[] = [7, 10, 15, 21, 28];
export const UMRAH_TIERS: UmrahPackageTier[] = ["Economy", "Standard", "Executive", "Premium"];
export const UMRAH_DEPARTURE_CITIES = ["Lahore", "Islamabad", "Karachi", "Multan", "Sialkot"];

export const umrahOffers: UmrahOffer[] = [
  {
    id: "umrah-eco-lhe-14",
    name: "Economy Umrah - 14 Nights",
    tier: "Economy",
    days: 15,
    durationLabel: "15 Days / 14 Nights",
    departureCity: "Lahore",
    airline: "Saudia",
    departureDate: "2026-09-12",
    returnDate: "2026-09-26",
    makkahHotel: "Al Masa Al Fareed",
    makkahDistance: "900 m from Haram",
    makkahDistanceMeters: 900,
    madinahHotel: "Al Eiman Taibah",
    madinahDistance: "450 m from Masjid Nabawi",
    prices: { sharing: 285000, quad: 315000, triple: 342000, double: 385000, child: 245000, infant: 55000 },
    startingFrom: 285000,
    seatsLeft: 14,
    bookingDeadline: "2026-08-25",
    includes: { ticket: true, visa: true, hotel: true, transport: true, ziarat: false },
    status: "Available",
  },
  {
    id: "umrah-std-isb-10",
    name: "Standard Umrah - 10 Days",
    tier: "Standard",
    days: 10,
    durationLabel: "10 Days / 9 Nights",
    departureCity: "Islamabad",
    airline: "Airblue",
    departureDate: "2026-09-05",
    returnDate: "2026-09-14",
    makkahHotel: "Rayyana Ajyad",
    makkahDistance: "600 m from Haram",
    makkahDistanceMeters: 600,
    madinahHotel: "Sanabel Al Diyafa",
    madinahDistance: "350 m from Masjid Nabawi",
    prices: { sharing: 312000, quad: 348000, triple: 372000, double: 425000, child: 268000, infant: 60000 },
    startingFrom: 312000,
    seatsLeft: 8,
    bookingDeadline: "2026-08-20",
    includes: { ticket: true, visa: true, hotel: true, transport: true, ziarat: true },
    status: "Limited seats",
  },
  {
    id: "umrah-exe-khi-7",
    name: "Executive Short Umrah - 7 Days",
    tier: "Executive",
    days: 7,
    durationLabel: "7 Days / 6 Nights",
    departureCity: "Karachi",
    airline: "Qatar Airways",
    departureDate: "2026-10-02",
    returnDate: "2026-10-08",
    makkahHotel: "Swissotel Al Maqam",
    makkahDistance: "150 m from Haram",
    makkahDistanceMeters: 150,
    madinahHotel: "Frontel Al Harithia",
    madinahDistance: "200 m from Masjid Nabawi",
    prices: { sharing: 468000, quad: 512000, triple: 565000, double: 648000, child: 398000, infant: 70000 },
    startingFrom: 468000,
    seatsLeft: 6,
    bookingDeadline: "2026-09-15",
    includes: { ticket: true, visa: true, hotel: true, transport: true, ziarat: true },
    status: "Limited seats",
  },
  {
    id: "umrah-prm-lhe-10",
    name: "Premium Umrah - 10 Days",
    tier: "Premium",
    days: 10,
    durationLabel: "10 Days / 9 Nights",
    departureCity: "Lahore",
    airline: "Emirates",
    departureDate: "2026-11-14",
    returnDate: "2026-11-23",
    makkahHotel: "Fairmont Clock Royal Tower",
    makkahDistance: "Haram facing",
    makkahDistanceMeters: 50,
    madinahHotel: "Anwar Al Madinah Movenpick",
    madinahDistance: "Masjid Nabawi facing",
    prices: { sharing: 745000, quad: 795000, triple: 865000, double: 985000, child: 640000, infant: 85000 },
    startingFrom: 745000,
    bookingDeadline: "2026-10-25",
    includes: { ticket: true, visa: true, hotel: true, transport: true, ziarat: true },
    status: "Available",
  },
  {
    id: "umrah-std-mux-21",
    name: "Long Stay Umrah - 21 Days",
    tier: "Standard",
    days: 21,
    durationLabel: "21 Days / 20 Nights",
    departureCity: "Multan",
    airline: "Saudia",
    departureDate: "2026-12-04",
    returnDate: "2026-12-24",
    makkahHotel: "Al Kiswah Towers",
    makkahDistance: "1.2 km from Haram (shuttle)",
    makkahDistanceMeters: 1200,
    madinahHotel: "Al Sarawat Rawdah",
    madinahDistance: "550 m from Masjid Nabawi",
    prices: { sharing: 398000, quad: 432000, triple: 468000, double: 528000, child: 345000, infant: 65000 },
    startingFrom: 398000,
    includes: { ticket: true, visa: true, hotel: true, transport: true, ziarat: false },
    status: "Available",
  },
  {
    id: "umrah-eco-slt-28",
    name: "Ramadan Full Month Umrah - 28 Days",
    tier: "Economy",
    days: 28,
    durationLabel: "28 Days / 27 Nights",
    departureCity: "Sialkot",
    airline: "Air Sial",
    makkahHotel: "Dar Al Eiman Ajyad",
    makkahDistance: "750 m from Haram",
    makkahDistanceMeters: 750,
    madinahHotel: "Al Eiman Ohud",
    madinahDistance: "500 m from Masjid Nabawi",
    prices: {},
    includes: { ticket: true, visa: true, hotel: true, transport: true, ziarat: false },
    status: "On request",
  },
];

export const umrahCityOffers: UmrahCityOffer[] = [
  { city: "Lahore", route: "LHE - JED / MED", startingFrom: 285000, note: "Direct and one-stop options with Saudia, Air Sial and Emirates." },
  { city: "Islamabad", route: "ISB - JED / MED", startingFrom: 312000, note: "Weekly departures with Airblue and Saudia." },
  { city: "Karachi", route: "KHI - JED / MED", startingFrom: 298000, note: "Best fares on Saudia and Qatar Airways connections." },
  { city: "Multan", route: "MUX - JED / MED", startingFrom: 335000, note: "Seasonal direct departures, limited seats." },
  { city: "Sialkot", route: "SKT - JED / MED", note: "Departures on request, subject to ticket availability." },
];

export const makkahHotels: UmrahHotelRate[] = [
  { id: "mkh-fairmont", name: "Fairmont Clock Royal Tower", city: "Makkah", location: "Abraj Al Bait, Haram facing", distance: "50 m from Haram", category: "5 Star", shuttle: false, mealPlan: "Breakfast + Dinner", roomType: "Deluxe Haram view", rates: { sharing: 780, double: 1450, triple: 1180, quad: 980 }, rateValidity: "Valid till 30 Sep 2026", supplier: "Direct contract" },
  { id: "mkh-swissotel", name: "Swissotel Al Maqam", city: "Makkah", location: "Ajyad, Clock Tower complex", distance: "150 m from Haram", category: "5 Star", shuttle: false, mealPlan: "Breakfast", roomType: "Superior twin", rates: { sharing: 520, double: 980, triple: 820, quad: 700 }, rateValidity: "Valid till 31 Oct 2026" },
  { id: "mkh-rayyana", name: "Rayyana Ajyad", city: "Makkah", location: "Ajyad Street", distance: "600 m from Haram", category: "4 Star", shuttle: true, mealPlan: "Breakfast", roomType: "Standard quad", rates: { sharing: 260, double: 520, triple: 430, quad: 360 }, rateValidity: "Valid till 30 Nov 2026" },
  { id: "mkh-almasa", name: "Al Masa Al Fareed", city: "Makkah", location: "Misfalah", distance: "900 m from Haram", category: "3 Star", shuttle: true, mealPlan: "Room only", roomType: "Sharing / Quad", rates: { sharing: 165, double: 340, triple: 280, quad: 230 }, rateValidity: "Valid till 31 Dec 2026" },
  { id: "mkh-kiswah", name: "Al Kiswah Towers", city: "Makkah", location: "Kudai", distance: "1.2 km from Haram", category: "3 Star", shuttle: true, mealPlan: "Breakfast + Dinner", roomType: "Quad sharing", rates: { sharing: 145, double: 300, triple: 250, quad: 200 }, rateValidity: "Valid till 31 Dec 2026" },
];

export const madinahHotels: UmrahHotelRate[] = [
  { id: "mdh-movenpick", name: "Anwar Al Madinah Movenpick", city: "Madinah", location: "Central Haram area", distance: "Masjid Nabawi facing", category: "5 Star", shuttle: false, mealPlan: "Breakfast + Dinner", roomType: "Deluxe twin", rates: { sharing: 560, double: 1050, triple: 880, quad: 740 }, rateValidity: "Valid till 30 Sep 2026", supplier: "Direct contract" },
  { id: "mdh-frontel", name: "Frontel Al Harithia", city: "Madinah", location: "Central area, Gate 25 side", distance: "200 m from Masjid Nabawi", category: "5 Star", shuttle: false, mealPlan: "Breakfast", roomType: "Superior twin", rates: { sharing: 380, double: 720, triple: 610, quad: 500 }, rateValidity: "Valid till 31 Oct 2026" },
  { id: "mdh-sanabel", name: "Sanabel Al Diyafa", city: "Madinah", location: "Markazia", distance: "350 m from Masjid Nabawi", category: "4 Star", shuttle: false, mealPlan: "Breakfast + Dinner", roomType: "Standard quad", rates: { sharing: 210, double: 420, triple: 350, quad: 290 }, rateValidity: "Valid till 30 Nov 2026" },
  { id: "mdh-taibah", name: "Al Eiman Taibah", city: "Madinah", location: "Near Gate 21", distance: "450 m from Masjid Nabawi", category: "4 Star", shuttle: false, mealPlan: "Full board", roomType: "Sharing / Quad", rates: { sharing: 175, double: 360, triple: 300, quad: 250 }, rateValidity: "Valid till 31 Dec 2026" },
  { id: "mdh-ohud", name: "Al Eiman Ohud", city: "Madinah", location: "Ohud Street", distance: "500 m from Masjid Nabawi", category: "3 Star", shuttle: false, mealPlan: "Room only", roomType: "Quad sharing", rates: { sharing: 130, double: 270, triple: 220, quad: 185 }, rateValidity: "Valid till 31 Dec 2026" },
];

export const umrahTransportRates: UmrahTransportRate[] = [
  { id: "tr-jed-mkh", route: "Jeddah Airport to Makkah Hotel", vehicle: "Sedan / Car", passengers: "1-3 passengers", luggage: "3 bags", type: "Private", startingFromSar: 180, note: "Meet and greet at arrivals, 24/7 pickup." },
  { id: "tr-mkh-jed", route: "Makkah Hotel to Jeddah Airport", vehicle: "Staria / H1", passengers: "1-6 passengers", luggage: "6 bags", type: "Private", startingFromSar: 250, note: "Departure timing planned 4 hours before flight." },
  { id: "tr-mkh-mdh", route: "Makkah Hotel to Madinah Hotel", vehicle: "GMC / Suburban", passengers: "1-6 passengers", luggage: "6 bags", type: "Private", startingFromSar: 750, note: "Approx 4.5 hours, Miqat stop included on request." },
  { id: "tr-mdh-mkh", route: "Madinah Hotel to Makkah Hotel", vehicle: "Hiace", passengers: "1-10 passengers", luggage: "10 bags", type: "Shared / Private", startingFromSar: 620, note: "Ihram change stop at Dhul Hulaifah." },
  { id: "tr-mdh-med", route: "Madinah Hotel to Madinah Airport", vehicle: "Sedan / Car", passengers: "1-3 passengers", luggage: "3 bags", type: "Private", startingFromSar: 90, note: "Short transfer, approx 30 minutes." },
  { id: "tr-med-mdh", route: "Madinah Airport to Madinah Hotel", vehicle: "Staria / H1", passengers: "1-6 passengers", luggage: "6 bags", type: "Private", startingFromSar: 110, note: "Driver waits with name board." },
  { id: "tr-mdh-jed", route: "Madinah Hotel to Jeddah Airport", vehicle: "Coaster", passengers: "1-18 passengers", luggage: "18 bags", type: "Shared / Private", startingFromSar: 950, note: "Best for groups travelling back via Jeddah." },
  { id: "tr-jed-mdh", route: "Jeddah Airport to Madinah Hotel", vehicle: "Bus", passengers: "20-45 passengers", luggage: "45 bags", type: "Shared / Private", startingFromSar: 1650, note: "Group arrival transfer with luggage handling." },
  { id: "tr-mkh-ziarat", route: "Makkah Ziarat", vehicle: "Hiace", passengers: "1-10 passengers", luggage: "Hand carry", type: "Shared / Private", startingFromSar: 220, note: "Jabal e Noor, Jabal e Rahmah, Mina, Arafat, Muzdalifah." },
  { id: "tr-mdh-ziarat", route: "Madinah Ziarat", vehicle: "Coaster", passengers: "1-18 passengers", luggage: "Hand carry", type: "Shared / Private", startingFromSar: 260, note: "Quba, Uhud, Qiblatain, date market." },
  { id: "tr-train", route: "Train station transfers (Haramain)", vehicle: "Sedan / Staria", passengers: "1-6 passengers", luggage: "6 bags", type: "Private", startingFromSar: 130, note: "Hotel to station both cities, train ticket separate." },
  { id: "tr-full", route: "Complete transport package", vehicle: "As per group size", passengers: "Any group size", luggage: "As per vehicle", type: "Shared / Private", note: "All airport, intercity and ziarat transfers in one quote. Contact for updated price." },
];

export const umrahTierComparison = [
  { tier: "Economy", hotelDistance: "800 m - 1.5 km with shuttle", roomSharing: "Quad / Quint sharing", transport: "Shared transport", bestFor: "Budget travellers and long stays", comfort: "Basic clean stay", priceLevel: "Lowest" },
  { tier: "Standard", hotelDistance: "400 - 800 m walking", roomSharing: "Triple / Quad sharing", transport: "Shared or private", bestFor: "Families wanting value with comfort", comfort: "Comfortable", priceLevel: "Moderate" },
  { tier: "Executive", hotelDistance: "150 - 400 m walking", roomSharing: "Double / Triple sharing", transport: "Private transport", bestFor: "Couples and short premium trips", comfort: "High comfort", priceLevel: "High" },
  { tier: "Premium", hotelDistance: "Haram / Masjid Nabawi facing", roomSharing: "Double sharing", transport: "Private GMC transport", bestFor: "Guests wanting the closest possible stay", comfort: "Luxury", priceLevel: "Highest" },
];

export const umrahNotes = [
  "Prices depend on ticket, hotel, visa and transport availability at the time of booking.",
  "Final price will be confirmed before booking and payment.",
  "Hotel distance and room sharing type directly affect the package price.",
  "Visa and Saudi transport rates may change without prior notice.",
  "Payment and booking confirmation are required before final ticket and visa issuance.",
];

export const umrahFaqs = [
  { q: "Can I request a custom Umrah package?", a: "Yes. Share your travel dates, departure city, hotel preference, room sharing and budget and our team will prepare a package built around your requirements." },
  { q: "Are the prices fixed?", a: "No. All prices are shown as starting-from rates. Final pricing is confirmed after checking ticket, hotel, visa and transport availability for your dates." },
  { q: "Can I choose my hotels?", a: "Yes. You can pick any Makkah and Madinah hotel from our contracted list, or send us the hotel you want and we will quote it." },
  { q: "Can I choose my transport?", a: "Yes. Shared or private transport is available for airport transfers, intercity travel and ziarat in both cities." },
  { q: "Is the visa included?", a: "Umrah visa processing is included in our ready-made packages. For hotel-only or transport-only bookings, visa can be added separately." },
  { q: "Is the air ticket included?", a: "Yes, our ready-made packages include return air tickets. Land-only packages without tickets are also available on request." },
  { q: "Can families and groups get custom pricing?", a: "Yes. Group and family rates improve with passenger count. Send us your passenger list on WhatsApp for a group quote." },
];
