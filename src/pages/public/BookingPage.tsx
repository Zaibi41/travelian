import { AdminFlightCheckout } from "@/components/admin/search/AdminFlightCheckout";
import { useEffect, useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PassengerFields } from "@/components/booking/PassengerFields";
import { CheckoutActionBar, type CheckoutAction } from "@/components/booking/CheckoutActionBar";
import { createPassengerDetails, genderForTitle, passengerComplete, passengerErrors, requiredDocuments, travelerFullName, type PassengerDetails, type RequiredDocument } from "@/lib/passenger-details";
import { CountryCodePicker } from "@/components/ui/country-code-picker";
import { Check, Shield, Lock, CreditCard, Wallet, Building2, ChevronRight, AlertCircle, ArrowLeft, Plane, Download, Search, Info } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
// SeatMap is intentionally paused in the UI for now. Keep the component available for the future seat-selection phase.
// import { SeatMap } from "@/components/booking/SeatMap";
import { saveServerBooking } from "@/lib/booking-api";
import { bookGroupFare, chooseReceivingAccount, getCardFee, getFlightDocuments, getFlightPaymentOptions, getPaymentMethods, requestPublicFlight, startPayFastCheckout, PublicBookingError, type BankAccountDisplay, type CardFee, type FlightPaymentOptions, type PaymentMethods } from "@/lib/public-booking";
import { BankAccounts, HoldCountdown } from "@/components/public/BankTransferDetails";
import { PaymentSlipUpload } from "@/components/public/PaymentSlipUpload";
import { saveBooking, saveGatewayBooking, type BookingRecord, type BookingTraveler } from "@/lib/booking-store";
import { submitHostedPayment } from "@/lib/payment-api";
import { downloadETicket } from "@/lib/eticket-pdf-lazy";
import { toast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import { SEO } from "@/components/SEO";
import { AirlineLogo } from "@/components/public/AirlineLogo";
import type { UmrahPackage } from "@/data/models";
import { findSeedUmrahOffer, umrahOfferToPackage } from "@/data/services/umrah-adapter";
import { isPublishedUmrahPackage } from "@/lib/package-availability";
import { format, addDays } from "date-fns";
import { checkoutJourneys, stopCountText } from "@/lib/flight-stays";
import { REFUND_LABEL, type RefundStatus } from "@/lib/fare-refund";
import { useAdmin } from "@/contexts/AdminStore";
import { CURRENCIES, useLocale, type CurrencyCode } from "@/contexts/LocaleContext";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useRole } from "@/contexts/RoleContext";
import { whatsappUrl } from "@/lib/site-config";
import { Loader2 } from "lucide-react";
import { CopyPnr } from "@/components/CopyPnr";
import { useSiteSwitches } from "@/lib/site-switches";

const steps = [
  { id: 1, label: "Traveler Details" },
  { id: 2, label: "Review" },
  { id: 3, label: "Payment" },
  { id: 4, label: "Confirmation" },
];

const addons: Array<{ id: string; name: string; desc: string; price: number; popular?: boolean }> = [];

const RATE_PER_USD: Record<string, number> = {
  ...Object.fromEntries(CURRENCIES.map((currency) => [currency.code, currency.rate])),
  INR: 83,
};

function convertCurrencyAmount(amount: number, fromCurrency: string, toCurrency: CurrencyCode) {
  const fromRate = RATE_PER_USD[String(fromCurrency || toCurrency).toUpperCase()] || RATE_PER_USD[toCurrency] || 1;
  const toRate = RATE_PER_USD[toCurrency] || fromRate;
  return amount / fromRate * toRate;
}

type BookingType = "flight" | "hotel" | "umrah";

interface ProductCtx {
  type: BookingType;
  title: string;
  subtitle: string;
  meta: string;
  emoji: string;
  base: number;
  currency: string;
  extra?: { airline?: string; flightNumber?: string; from?: string; to?: string; fromCode?: string; toCode?: string; date?: string; returnDate?: string; cabin?: string; airlineImage?: string; fareTier?: string; farePerks?: string[]; refund?: RefundStatus; layovers?: BookingLayover[]; segments?: BookingSegment[]; baseFare?: number | null; taxes?: number | null; allTravelersTotal?: number | null };
}

type BookingLayover = {
  location?: string | null;
  arrivalTime?: string | null;
  departureTime?: string | null;
  duration?: string | null;
  nextFlightNumber?: string | null;
};

type BookingSegment = {
  flightNumber?: string | null;
  origin?: string | null;
  destination?: string | null;
  departureTime?: string | null;
  arrivalTime?: string | null;
  departureTimestamp?: string | null;
  arrivalTimestamp?: string | null;
  /** The flight's own time from the gateway ("3h 45m"). */
  duration?: string | null;
};

interface PackageInventory {
  packages: UmrahPackage[];
}

function buildCtx(params: URLSearchParams, inventory: PackageInventory): ProductCtx | null {
  const type = (params.get("type") as BookingType) || (params.get("airline") ? "flight" : null);
  if (!type) return null;
  const id = params.get("id") || params.get("flightId") || "";

  if (type === "flight") {
    const airline = params.get("airline") || "";
    const flightNumber = params.get("flightNo") || "";
    const from = params.get("from") || "";
    const to = params.get("to") || "";
    const date = params.get("date") || "";
    const returnDate = params.get("return") || "";
    const cabin = params.get("cabin") || "Economy";
    const fareTier = params.get("fare") || "";
    const airlineImage = params.get("airlineImage") || "";
    const farePerks = (params.get("farePerks") || "").split("|").map((item) => item.trim()).filter(Boolean);
    // #149: only what the fare data said (results put it in the link); anything else is unknown.
    const refundParam = params.get("refund");
    const refund: RefundStatus = refundParam === "refundable" || refundParam === "non_refundable" ? refundParam : null;
    const layovers = parseJsonParam<BookingLayover[]>(params, "layovers", []);
    const segments = parseJsonParam<BookingSegment[]>(params, "segments", []);
    const baseFare = params.has("baseFare") ? Number(params.get("baseFare")) : null;
    const taxes = params.has("taxes") ? Number(params.get("taxes")) : null;
    const price = Number(params.get("price"));
    // #113: the gateway's total for all travelers (from the results), when it priced every passenger type.
    const allTravelersTotal = params.has("total") ? Number(params.get("total")) : null;
    const currency = params.get("currency") || "PKR";
    if (!airline || !flightNumber || !from || !to || !date || !Number.isFinite(price) || price <= 0) return null;
    return {
      type: "flight",
      title: `${airline} - ${flightNumber}`,
      subtitle: `${from} to ${to}`,
      meta: [date, cabin, fareTier].filter(Boolean).join(" - "),
      emoji: "",
      base: price,
      currency,
      extra: { airline, flightNumber, from, to, date, returnDate, cabin, airlineImage, fareTier, farePerks, refund, layovers, segments, baseFare: Number.isFinite(baseFare) ? baseFare : null, taxes: Number.isFinite(taxes) ? taxes : null, allTravelersTotal: allTravelersTotal && Number.isFinite(allTravelersTotal) && allTravelersTotal > 0 ? allTravelersTotal : null },
    };
  }
  if (type === "hotel") {
    return null;
  }
  if (type === "umrah") {
    const stored = inventory.packages.find(x => x.packageId === id);
    const seed = stored ? undefined : findSeedUmrahOffer(id);
    const p = stored ?? (seed ? umrahOfferToPackage(seed) : undefined);
    if (!p || !isPublishedUmrahPackage(p)) return null;
    return {
      type: "umrah",
      title: p.name,
      subtitle: p.city || p.departureCity || "Travelian Umrah",
      meta: [p.duration, p.hotel || [p.makkahHotel, p.madinahHotel].filter(Boolean).join(" / ")].filter(Boolean).join(" | "),
      emoji: "",
      base: p.basePrice,
      currency: "PKR",
    };
  }
  return null;
}

export default function BookingPage({ adminMode = false }: { adminMode?: boolean } = {}) {
  const [params] = useSearchParams();
  // Admin: never use a price from the URL; booking is blocked until the gateway reprices.
  if (adminMode && (params.get("type") === "flight" || params.get("airline"))) return <AdminFlightCheckout params={params} />;
  return <PublicBooking params={params} />;
}

function PublicBooking({ params }: { params: URLSearchParams }) {
  const { umrah: umrahOn } = useSiteSwitches(); // D39
  const { packages, packageLoadStatus } = useAdmin();
  const productCtx = useMemo(() => buildCtx(params, { packages }), [params, packages]);

  if (!productCtx && params.get("type") === "umrah" && params.get("id") && (packageLoadStatus === "idle" || packageLoadStatus === "loading")) {
    return <div role="status" className="travelian-container py-16 text-center">Loading package details…</div>;
  }

  // Empty state if no booking context provided
  if (!productCtx) {
    return (
      <div className="min-h-[calc(100vh-4rem)] bg-muted/30 flex items-center justify-center px-4 py-16">
        <SEO title="Secure Checkout - Travelian" description="Complete your booking securely with Travelian." />
        <Card className="max-w-lg w-full shadow-elevated border-0">
          <CardContent className="p-10 text-center">
            <div className="h-16 w-16 rounded-2xl bg-accent flex items-center justify-center mx-auto mb-5">
              <Search className="h-7 w-7 text-primary" />
            </div>
            <h1 className="text-2xl font-bold text-foreground mb-2">{params.get("id") ? "Package unavailable" : "No booking selected"}</h1>
            <p className="text-sm text-muted-foreground mb-6">
              {params.get("id") && packageLoadStatus === "error"
                ? "We couldn't load this package. Please try again or contact Travelian to confirm availability."
                : "Start a search and select an available flight, hotel or package to proceed to checkout."}
            </p>
            <div className="flex flex-wrap gap-2 justify-center">
              <Link to="/"><Button className="gradient-primary text-primary-foreground rounded-xl">Search Flights</Button></Link>
              <Link to="/hotels-search"><Button variant="outline" className="rounded-xl">Find Hotels</Button></Link>
              {umrahOn && <Link to="/umrah-packages"><Button variant="outline" className="rounded-xl">Umrah Packages</Button></Link>}
                          </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (productCtx.type !== "flight") return <ServiceBookingRequest productCtx={productCtx} />;
  return <FlightCheckout productCtx={productCtx} params={params} />;
}

function FlightCheckout({ productCtx, params }: { productCtx: ProductCtx; params: URLSearchParams }) {
  const { currency: activeCurrency } = useLocale();
  const isFlight = productCtx.type === "flight";
  const adultCount = isFlight ? Math.max(1, Number(params.get("adults") || "1") || 1) : 1;
  const childCount = isFlight ? Math.max(0, Number(params.get("children") || "0") || 0) : 0;
  const infantCount = isFlight ? Math.max(0, Number(params.get("infants") || "0") || 0) : 0;
  const passengerTotal = adultCount + childCount + infantCount;
  const passengerLabels = useMemo(() => [
    ...Array.from({ length: adultCount }, (_, index) => ({ type: "adult" as const, label: `Adult ${index + 1}` })),
    ...Array.from({ length: childCount }, (_, index) => ({ type: "child" as const, label: `Child ${index + 1}` })),
    ...Array.from({ length: infantCount }, (_, index) => ({ type: "infant" as const, label: `Infant ${index + 1}` })),
  ], [adultCount, childCount, infantCount]);
  const ctxAirline = productCtx.extra?.airline || "";
  const ctxFlightNo = productCtx.extra?.flightNumber || "";
  const ctxFrom = productCtx.extra?.from || "";
  const ctxTo = productCtx.extra?.to || "";
  const ctxFromCode = productCtx.extra?.fromCode || "";
  const ctxToCode = productCtx.extra?.toCode || "";
  const ctxDate = productCtx.extra?.date || format(addDays(new Date(), 14), "MMM dd, yyyy");
  // The last travel date (ISO) when the booking has one: the return date of a round trip, else the latest flight day,
  // else the departure date. Passport expiry must be after it, and ages are taken on it (issue #52, airline rule).
  const travelDateIso = useMemo(() => {
    const iso = (raw?: string | null) => {
      if (!raw) return undefined;
      if (/^\d{4}-\d{2}-\d{2}/.test(raw)) return raw.slice(0, 10);
      const parsed = new Date(raw);
      return Number.isNaN(parsed.getTime()) ? undefined : format(parsed, "yyyy-MM-dd");
    };
    const days = [productCtx.extra?.date, productCtx.extra?.returnDate, ...(productCtx.extra?.segments ?? []).map(segment => segment.departureTime)]
      .map(iso).filter((day): day is string => Boolean(day));
    return days.length ? days.sort()[days.length - 1] : undefined;
  }, [productCtx.extra?.date, productCtx.extra?.returnDate, productCtx.extra?.segments]);
  const ctxCabin = productCtx.extra?.cabin || "Economy";
  const ctxFarePerks = productCtx.extra?.farePerks || [];
  const ctxLayovers = productCtx.extra?.layovers || [];
  const ctxSegments = useMemo(() => productCtx.extra?.segments || [], [productCtx.extra?.segments]);
  const ctxBaseFare = productCtx.extra?.baseFare;
  const ctxTaxes = productCtx.extra?.taxes;
  const sourceCurrency = String(productCtx.currency || activeCurrency || "PKR").toUpperCase();
  const displayCurrency = activeCurrency || "PKR";
  const sourceCurrencyLabel = sourceCurrency === displayCurrency ? "" : `Fare received in ${sourceCurrency}. Displayed in ${displayCurrency}.`;
  const knownBaseFare = typeof ctxBaseFare === "number" && Number.isFinite(ctxBaseFare) && ctxBaseFare > 0;
  const knownTaxes = typeof ctxTaxes === "number" && Number.isFinite(ctxTaxes) && ctxTaxes > 0;
  // When the supplier only returns a single total, synthesize an industry-standard split (≈78% base / 22% taxes & fees) so the breakdown card is never a single line.
  const derivedBasePerPax = knownBaseFare ? (ctxBaseFare as number) : Math.round(productCtx.base * 0.78);
  const derivedTaxesPerPax = knownTaxes ? (ctxTaxes as number) : Math.max(0, productCtx.base - derivedBasePerPax);
  const fareSplitIsEstimated = !knownBaseFare && !knownTaxes;
  // #113: with the gateway's total for all travelers, the (estimated) split is of that total, so the lines add up to it.
  const ctxAllTravelersTotal = productCtx.extra?.allTravelersTotal ?? null;
  const splitOfGatewayTotal = Boolean(ctxAllTravelersTotal && fareSplitIsEstimated);
  const fareBaseTotal = splitOfGatewayTotal ? Math.round((ctxAllTravelersTotal as number) * 0.78) : derivedBasePerPax * passengerTotal;
  const fareTaxesTotal = splitOfGatewayTotal ? (ctxAllTravelersTotal as number) - fareBaseTotal : derivedTaxesPerPax * passengerTotal;
  const passengerSummary = `${passengerTotal} ${passengerTotal === 1 ? "Adult" : "Travelers"}`;
  // #153: each journey's time from the flights' own durations (gateway minutes) and the stays between them, never
  // local arrival minus local departure (airports are in different time zones). Same wording as the results card.
  const journeys = useMemo(() => checkoutJourneys(ctxSegments, { destination: ctxTo, trip: params.get("trip") }), [ctxSegments, ctxTo, params]);
  const layoverStops = Math.max(0, ctxLayovers.length);
  const stopSummary = journeys.length
    ? Array.from(new Set(journeys.map((journey) => journey.stopText))).join(" / ")
    : stopCountText(layoverStops);

  const [step, setStep] = useState(1);
  const [selectedAddons, setSelectedAddons] = useState<string[]>([]);
  const [selectedSeat, setSelectedSeat] = useState<string>("");
  const [paymentMethod, setPaymentMethod] = useState("card");
  // B3/B4: what checkout can offer, from the gateway (bank transfer only with an active account; JazzCash only when enabled).
  const [methods, setMethods] = useState<PaymentMethods | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    getPaymentMethods(controller.signal).then(setMethods).catch(() => setMethods(null));
    return () => controller.abort();
  }, []);
  const [cardNumber, setCardNumber] = useState("");
  const [cardExpiry, setCardExpiry] = useState("");
  const [cardCvv, setCardCvv] = useState("");
  const [cardName, setCardName] = useState("");
  const [paymentTouched, setPaymentTouched] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [savedBooking, setSavedBooking] = useState<BookingRecord | null>(null);
  const [recheckOpen, setRecheckOpen] = useState(false);
  const [recheckLoading, setRecheckLoading] = useState(false);
  const [recheckResult, setRecheckResult] = useState<{ oldPrice: number; newPrice: number } | null>(null);
  const [recheckAccepted, setRecheckAccepted] = useState(false);
  // #155: the "names match the passport" check is on the Review step, under the travelers' names (no separate dialog).
  const [nameAcknowledged, setNameAcknowledged] = useState(false);
  const [reviewTouched, setReviewTouched] = useState(false);
  // A group fare from the Travelian gateway: booked and priced by the gateway, never by this page.
  const groupTicketId = params.get("groupTicketId") || "";
  // A live flight fare from the gateway search (B19, D43): sent to the gateway as a booking request by these ids.
  const gatewaySearchId = params.get("searchId") || "";
  const gatewayFareIds = (params.get("fareIds") || "").split(",").map((id) => id.trim()).filter(Boolean);
  const gatewayFlight = Boolean(gatewaySearchId && gatewayFareIds.length);
  // D45: card / 1Link / bank / JazzCash are offered only where the gateway can actually take that payment for this
  // booking: group fares, and live flight fares once the gateway holds them (methods.flights). Everything else is a
  // request: no payment option, Travelian contacts the customer.
  // Flights: the gateway says per fare whether it is held and which methods it takes (no card where issuing isn't wired).
  const [flightOptions, setFlightOptions] = useState<FlightPaymentOptions | null>(null);
  const fareIdsKey = gatewayFareIds.join(",");
  useEffect(() => {
    if (!gatewayFlight || !methods?.flights) { setFlightOptions(null); return; }
    const controller = new AbortController();
    getFlightPaymentOptions(gatewaySearchId, fareIdsKey.split(","), controller.signal).then(setFlightOptions).catch(() => setFlightOptions(null));
    return () => controller.abort();
  }, [gatewayFlight, gatewaySearchId, fareIdsKey, methods?.flights]);
  // CNIC up front: the gateway reads which travelers the airline needs a CNIC (or passport) from, before submit.
  const [fareDocuments, setFareDocuments] = useState<RequiredDocument[] | null>(null);
  useEffect(() => {
    if (!gatewayFlight) { setFareDocuments(null); return; }
    const controller = new AbortController();
    getFlightDocuments(gatewaySearchId, fareIdsKey.split(","), controller.signal).then(answer => setFareDocuments(answer.documents)).catch(() => setFareDocuments(null));
    return () => controller.abort();
  }, [gatewayFlight, gatewaySearchId, fareIdsKey]);
  const flightPayable = gatewayFlight && Boolean(flightOptions?.held);
  // #149: Refundable / Non-refundable only when the fare data says so. Group fares are always non-refundable.
  const ctxRefund: RefundStatus = isFlight ? (groupTicketId ? "non_refundable" : productCtx.extra?.refund ?? null) : null;
  const paymentOptions = groupTicketId ? {
    card: Boolean(methods?.card), bank: Boolean(methods?.bank_transfer), wallet: Boolean(methods?.jazzcash),
  } : flightPayable ? {
    card: Boolean(flightOptions?.card), bank: Boolean(flightOptions?.bank_transfer), wallet: Boolean(flightOptions?.jazzcash),
  } : { card: false, bank: false, wallet: false };
  const canPayHere = paymentOptions.card || paymentOptions.bank || paymentOptions.wallet;
  const firstMethod = paymentOptions.card ? "card" : paymentOptions.bank ? "bank" : paymentOptions.wallet ? "wallet" : "";
  useEffect(() => {
    // Keep the selection on a method this booking can actually use.
    const usable = (paymentMethod === "card" || paymentMethod === "1link") ? paymentOptions.card
      : paymentMethod === "bank" ? paymentOptions.bank : paymentMethod === "wallet" ? paymentOptions.wallet : false;
    if (!usable && firstMethod) setPaymentMethod(firstMethod);
  }, [paymentMethod, firstMethod, paymentOptions.card, paymentOptions.bank, paymentOptions.wallet]);
  const [fareTermsAccepted, setFareTermsAccepted] = useState(false);
  const [payConfirmOpen, setPayConfirmOpen] = useState(false);
  // #74: the card / 1Link fee, worked out by the gateway, shown before payment ("Card fee (3%): Rs X · Total Rs Y").
  const [cardFee, setCardFee] = useState<CardFee | null>(null);
  const { currentRole } = useRole();
  const isCustomer = currentRole === "customer";

  // B27: each traveler travels on a passport or a Pakistani CNIC / B-form (the gateway accepts both: PSPT or NATI).
  // The fields, order, labels and checks are shared with the admin hold form (lib/passenger-details, PassengerFields).
  const [passengerForms, setPassengerForms] = useState<PassengerForm[]>(() =>
    passengerLabels.map((passenger) => createPassengerForm(passenger.type, passenger.label)),
  );

  // Contact
  const [email, setEmail] = useState("");
  const [phoneCode, setPhoneCode] = useState("+92");
  const [phone, setPhone] = useState("");
  const [altPhoneCode, setAltPhoneCode] = useState("+92");
  const [altPhone, setAltPhone] = useState("");

  const requiredDocs = useMemo(() => requiredDocuments(passengerForms, fareDocuments), [passengerForms, fareDocuments]);

  // Validation touch tracking
  const [touched, setTouched] = useState(false);


  useEffect(() => {
    setPassengerForms((current) =>
      passengerLabels.map((passenger, index) => {
        const existing = current[index];
        return existing && existing.passengerType === passenger.type
          ? { ...existing, label: passenger.label }
          : createPassengerForm(passenger.type, passenger.label);
      }),
    );
  }, [passengerLabels]);

  const updatePassenger = (index: number, patch: Partial<PassengerForm>) => {
    setPassengerForms((current) => current.map((passenger, passengerIndex) => passengerIndex === index ? { ...passenger, ...patch } : passenger));
  };


  const toggleAddon = (id: string) => {
    setSelectedAddons(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const seatFee = 0;
  const addonsTotal = addons.filter(a => selectedAddons.includes(a.id)).reduce((sum, a) => sum + a.price, 0) + seatFee;
  const baseTotal = isFlight ? (ctxAllTravelersTotal ?? productCtx.base * passengerTotal) : productCtx.base;
  const taxes = 0;
  const grandTotal = baseTotal + addonsTotal + taxes;
  const displayAmount = (amount: number) => convertCurrencyAmount(amount, sourceCurrency, displayCurrency);
  const formatMoney = (amount: number) => `${displayCurrency} ${Math.round(displayAmount(amount)).toLocaleString()}`;
  const rs = (minor: number) => `Rs ${Math.round(minor / 100).toLocaleString("en-PK")}`;
  const cardMethod = paymentMethod === "card" || paymentMethod === "1link";
  useEffect(() => {
    if (!payConfirmOpen || !cardMethod || !(grandTotal > 0)) { setCardFee(null); return; }
    const controller = new AbortController();
    getCardFee(Math.round(grandTotal * 100), groupTicketId ? "group" : "flight", controller.signal)
      .then(setCardFee).catch(() => setCardFee(null));
    return () => controller.abort();
  }, [payConfirmOpen, cardMethod, grandTotal, groupTicketId]);
  // #76: the booking remembers which receiving account the customer chose (staff see it; it helps matching the money).
  const rememberAccount = (account: BankAccountDisplay) => {
    const gateway = savedBooking?.gateway;
    if (!gateway || !account.id) return;
    chooseReceivingAccount(gateway.reference, account.id, { token: gateway.token }).catch(() => undefined);
  };

  // Validation
  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const phoneValid = /^\d{6,15}$/.test(phone);
  const altPhoneValid = altPhone === "" || /^\d{6,15}$/.test(altPhone);
  const errors = useMemo(() => {
    const e: Record<string, string> = {};
    passengerForms.forEach((passenger, index) => {
      for (const [field, message] of Object.entries(passengerErrors(passenger, travelDateIso, requiredDocs[index]))) e[`passenger-${index}-${field}`] = message as string;
    });
    if (email.trim() && !emailValid) e.email = "Enter a valid email address";
    if (!phone.trim()) e.phone = "Mobile number is required";
    else if (!phoneValid) e.phone = "Enter a valid numeric phone (6-15 digits)";
    if (!altPhoneValid) e.altPhone = "Enter a valid numeric phone (6-15 digits)";
    return e;
  }, [passengerForms, email, emailValid, phone, phoneValid, altPhoneValid, travelDateIso, requiredDocs]);

  const isStep1Valid = Object.keys(errors).length === 0;

  const focusFirstInvalidField = () => {
    const firstErrorKey = Object.keys(errors)[0];
    if (!firstErrorKey) return;
    window.requestAnimationFrame(() => {
      const container = document.querySelector<HTMLElement>(`[data-error-key="${firstErrorKey}"]`);
      if (!container) return;
      container.scrollIntoView({ behavior: "smooth", block: "center" });
      const field = container.matches("input, button, [tabindex]")
        ? container
        : container.querySelector<HTMLElement>("input, button, [tabindex]");
      window.setTimeout(() => field?.focus({ preventScroll: true }), 350);
    });
  };

  const handleContinue = () => {
    setTouched(true);
    if (!isStep1Valid) {
      focusFirstInvalidField();
      return;
    }
    // B19: no simulated "fare confirmed with the airline" step. The gateway reprices a fare for real when the booking or
    // request is sent; this page never claims a check it didn't make. Names are confirmed again after any change.
    setNameAcknowledged(false);
    setReviewTouched(false);
    setStep(2);
  };

  const reviewConfirmed = nameAcknowledged && (!groupTicketId || fareTermsAccepted);
  const continueFromReview = () => {
    if (!reviewConfirmed) {
      setReviewTouched(true);
      const box = document.querySelector<HTMLElement>(!nameAcknowledged ? "#review-names-confirm" : "#review-fare-terms");
      box?.scrollIntoView({ behavior: "smooth", block: "center" });
      box?.focus({ preventScroll: true });
      return;
    }
    setStep(3);
  };

  const draftKey = useMemo(() => `travelian.bookingDraft.${params.toString()}`, [params]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(draftKey);
      if (!raw) return;
      const draft = JSON.parse(raw) as {
        passengerForms?: PassengerForm[];
        email?: string;
        phoneCode?: string;
        phone?: string;
        altPhoneCode?: string;
        altPhone?: string;
      };
      if (Array.isArray(draft.passengerForms) && draft.passengerForms.length === passengerLabels.length) {
        setPassengerForms(draft.passengerForms.map((passenger) => ({ ...passenger, dob: draftDay(passenger.dob), expiryDate: draftDay(passenger.expiryDate) })));
      }
      if (draft.email) setEmail(draft.email);
      if (draft.phoneCode) setPhoneCode(draft.phoneCode);
      if (draft.phone) setPhone(draft.phone);
      if (draft.altPhoneCode) setAltPhoneCode(draft.altPhoneCode);
      if (draft.altPhone) setAltPhone(draft.altPhone);
    } catch {
      localStorage.removeItem(draftKey);
    }
  }, [draftKey, passengerLabels.length]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [step]);

  // Numeric-only phone handler
  const onPhoneChange = (setter: (v: string) => void) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setter(e.target.value.replace(/[^\d]/g, ""));
  };

  // Hosted online payments are collected on PayFast, not inside Travelian.
  const cardNumberValid = cardNumber.replace(/\s/g, "").length >= 13 && /^\d+$/.test(cardNumber.replace(/\s/g, ""));
  const cardExpiryValid = /^(0[1-9]|1[0-2])\/\d{2}$/.test(cardExpiry);
  const cardCvvValid = /^\d{3,4}$/.test(cardCvv);
  const cardNameValid = cardName.trim().length >= 3;
  const paymentValid = true;

  const requestPay = () => {
    setPaymentTouched(true);
    if (!paymentValid) return;
    setPayConfirmOpen(true);
  };

  const handlePay = async () => {
    setPayConfirmOpen(false);
    const online = Boolean(groupTicketId) || flightPayable; // only gateway bookings can be paid online (verified by the gateway)
    const saved = await persistBooking({
      status: online ? "pending_payment" : "requested",
      paymentMethod,
      paymentStatus: online ? "pending" : "unpaid",
      toastTitle: online ? "Redirecting to payment" : "Booking request saved",
      toastDescription: online
        ? "Travelian has saved this booking and is opening the secure PayFast checkout."
        : "Online payment isn't available for this booking. Travelian's team will contact you to confirm the fare and arrange payment. Nothing has been charged.",
    });
    if (!saved || !["card", "1link"].includes(paymentMethod)) return;
    if (saved.gateway) {
      if (!saved.gateway.live) return; // a request: Travelian confirms the fare before any payment
      try {
        setProcessing(true);
        const checkout = await startPayFastCheckout(saved.gateway.reference, saved.gateway.token);
        submitHostedPayment({ method: "POST", action: checkout.action, fields: checkout.fields });
      } catch (error) {
        toast({
          title: "Online payment unavailable",
          description: error instanceof PublicBookingError ? error.message : "Please try again, or contact Travelian to pay.",
          variant: "destructive",
        });
      } finally {
        setProcessing(false);
      }
      return;
    }

    // B2: the legacy Lambda checkout marked bookings paid without verifying PayFast, so it is never called. Non-gateway
    // bookings are saved as requests (above) for Travelian's team to confirm and take payment.
  };

  const buildTravelers = (): BookingTraveler[] => {
    return passengerForms.map((passenger) => ({
      passengerType: passenger.passengerType,
      title: passenger.title,
      firstName: passenger.firstName.trim(),
      lastName: passenger.lastName.trim(),
      gender: passenger.gender,
      dob: passenger.dob || undefined,
      docType: passenger.docType ?? "passport",
      docNumber: passenger.docNumber,
      nationality: passenger.nationality,
      issuanceCountry: passenger.issuanceCountry,
      expiryDate: passenger.expiryDate || undefined,
    }));
  };

  // Live flight fares (B19, D43, D45, D48, D49). The gateway reprices the fare and saves the customer and travelers. With
  // website flight booking on it holds the fare at the airline (card then goes to PayFast; bank transfer / JazzCash wait for
  // Travelian to confirm the money); otherwise it is a request. This page never confirms, tickets or shows a PNR itself.
  const persistGatewayFlightRequest = async (paymentMethod: string): Promise<BookingRecord | null> => {
    if (savedBooking?.gateway) return savedBooking;
    if (!emailValid) {
      setStep(1);
      toast({ title: "Enter your email", description: "Travelian sends the fare confirmation and payment details by email.", variant: "destructive" });
      return null;
    }
    setProcessing(true);
    try {
      const travelers = buildTravelers();
      const lead = travelers.find((traveler) => (traveler.passengerType ?? "adult") === "adult") ?? travelers[0];
      const result = await requestPublicFlight({
        searchId: gatewaySearchId, fareIds: gatewayFareIds, travelers,
        contact: { firstName: lead?.firstName || "", lastName: lead?.lastName || "", phoneCode, phone, email: email.trim() },
        paymentMethod: paymentMethod === "bank" ? "bank_transfer" : paymentMethod === "wallet" ? "jazzcash" : paymentMethod === "hold" ? "book_only" : "card",
      });
      const total = result.booking.total.amount_minor / 100;
      const live = result.booking.live;
      const saved = saveGatewayBooking({
        type: "flight", status: live ? "held" : "requested", holdExpiresAt: live ? result.booking.hold_expires_at : undefined,
        flight: { airline: ctxAirline, flightNumber: ctxFlightNo, from: ctxFrom, fromCode: ctxFrom, to: ctxTo, toCode: ctxTo, date: ctxDate, cabin: ctxCabin },
        travelers,
        contact: { email: email.trim(), phone: `${phoneCode}${phone}`, altPhone: altPhone ? `${altPhoneCode}${altPhone}` : undefined },
        addons: [], paymentMethod: live ? paymentMethod : "request", paymentStatus: "unpaid", ticketStatus: "not_issued",
        pricing: { base: total, addons: 0, taxes: 0, total, currency: result.booking.total.currency },
        gateway: { reference: result.reference, token: result.access_token, live },
      }, result.reference);
      setSavedBooking(saved);
      setStep(4);
      toast(live
        ? { title: "Fare held", description: `Booking ${result.reference} is held. Pay before the time limit to keep it.` }
        : { title: "Booking request received", description: `Reference ${result.reference}. Travelian will confirm the fare and arrange payment with you.` });
      return saved;
    } catch (error) {
      const message = error instanceof PublicBookingError ? error.message : "The booking request couldn't be sent. Please try again.";
      toast({ title: "Booking request not sent", description: message, variant: "destructive" });
      return null;
    } finally {
      setProcessing(false);
    }
  };

  // Group fares: the gateway checks the fare, prices it and (when live booking is on) holds the seats at the supplier;
  // otherwise it saves a request for Travelian staff. Nothing is booked from this page's own price.
  const persistGatewayGroupBooking = async (paymentMethod: string): Promise<BookingRecord | null> => {
    if (savedBooking?.gateway) return savedBooking;
    setProcessing(true);
    try {
      const travelers = buildTravelers();
      const lead = travelers[0];
      const result = await bookGroupFare({
        ticketId: groupTicketId,
        passengers: travelers.map((traveler) => ({
          title: traveler.title, firstName: traveler.firstName, lastName: traveler.lastName, gender: traveler.gender, dob: traveler.dob,
          docNumber: traveler.docNumber, nationality: traveler.nationality, issuanceCountry: traveler.issuanceCountry, expiryDate: traveler.expiryDate,
        })),
        contact: { firstName: lead?.firstName || "", lastName: lead?.lastName || "", phone: `${phoneCode}${phone}`, email: email.trim() || undefined },
        fareTermsAcknowledged: fareTermsAccepted,
        paymentMethod: paymentMethod === "bank" ? "bank_transfer" : paymentMethod === "wallet" ? "jazzcash" : "card",
      });
      const booking = result.booking;
      const total = booking.total.amount_minor / 100;
      const saved = saveGatewayBooking({
        type: productCtx.type,
        status: booking.status === "requested" ? "requested" : "held",
        flight: isFlight ? { airline: ctxAirline, flightNumber: ctxFlightNo, from: ctxFrom, fromCode: ctxFrom, to: ctxTo, toCode: ctxTo, date: ctxDate, cabin: ctxCabin } : undefined,
        travelers,
        contact: { email: email.trim() || undefined, phone: `${phoneCode}${phone}`, altPhone: altPhone ? `${altPhoneCode}${altPhone}` : undefined },
        addons: [],
        paymentMethod,
        paymentStatus: "unpaid",
        ticketStatus: "not_issued",
        holdExpiresAt: booking.hold_expires_at,
        pricing: { base: total, addons: 0, taxes: 0, total, currency: booking.total.currency },
        gateway: { reference: result.reference, token: result.access_token, live: booking.live },
      }, result.reference);
      setSavedBooking(saved);
      setStep(4);
      toast(booking.live
        ? { title: "Seats held", description: `Booking ${result.reference} is held. Pay before the time limit to keep it.` }
        : { title: "Booking request received", description: `Reference ${result.reference}. Travelian will confirm the fare and seats with you.` });
      return saved;
    } catch (error) {
      const message = error instanceof PublicBookingError ? error.message : "The booking couldn't be completed. Please try again.";
      toast({ title: "Booking not completed", description: message, variant: "destructive" });
      return null;
    } finally {
      setProcessing(false);
    }
  };

  const persistBooking = async ({
    status,
    paymentMethod,
    paymentStatus,
    toastTitle,
    toastDescription,
  }: {
    status: BookingRecord["status"];
    paymentMethod: string;
    paymentStatus: BookingRecord["paymentStatus"];
    toastTitle: string;
    toastDescription: string;
  }): Promise<BookingRecord | null> => {
    setTouched(true);
    if (!isStep1Valid) {
      setStep(1);
      return null;
    }
    if (groupTicketId) return persistGatewayGroupBooking(paymentMethod);
    if (gatewayFlight) return persistGatewayFlightRequest(paymentMethod);
    if (isFlight) {
      // A flight without the gateway's fare reference can't be priced or requested: never save one from the page's own
      // price or show it as booked (B19).
      toast({ title: "Search again to book this flight", description: "This fare's details have expired. Search again and choose the fare.", variant: "destructive" });
      return null;
    }
    setProcessing(true);
    try {
      const saved = saveBooking({
        type: productCtx.type,
        status,
        flight: isFlight ? {
          airline: ctxAirline,
          flightNumber: ctxFlightNo,
          from: ctxFrom,
          fromCode: ctxFrom,
          to: ctxTo,
          toCode: ctxTo,
          date: ctxDate,
          cabin: ctxCabin,
        } : undefined,
        travelers: buildTravelers(),
        contact: {
          email: email.trim() || undefined,
          phone: `${phoneCode}${phone}`,
          altPhone: altPhone ? `${altPhoneCode}${altPhone}` : undefined,
        },
        seat: selectedSeat || undefined,
        addons: addons.filter((addon) => selectedAddons.includes(addon.id)).map((addon) => ({ id: addon.id, name: addon.name, price: addon.price })),
        paymentMethod,
        paymentStatus,
        ticketStatus: "not_issued",
        holdExpiresAt: addDays(new Date(), 1).toISOString(),
        pricing: {
          base: Math.round(displayAmount(baseTotal)),
          addons: Math.round(displayAmount(addonsTotal)),
          taxes: Math.round(displayAmount(taxes)),
          total: Math.round(displayAmount(grandTotal)),
          currency: displayCurrency,
        },
      });
      try {
        await saveServerBooking(saved);
      } catch (error) {
        console.error("Unable to persist booking to Travelian API", error);
        toast({
          title: "Booking saved locally",
          description: "It was not sent to Travelian. Please try again or contact our team.",
          variant: "destructive",
        });
      }
      setSavedBooking(saved);
      setStep(4);
      toast({
        title: toastTitle,
        description: toastDescription,
      });
      return saved;
    } finally {
      setProcessing(false);
    }
  };

  const handleHoldBooking = async () => {
    await persistBooking({
      status: "requested",
      paymentMethod: "hold",
      paymentStatus: "unpaid",
      toastTitle: "Booking request saved",
      toastDescription: "Nothing has been charged. Travelian's team will contact you to confirm the fare and arrange payment.",
    });
  };

  const bookingWhatsAppUrl = whatsappUrl([
    "Hello Travelian,",
    "",
    "I need help with this booking:",
    `Service: ${productCtx.type}`,
    `Item: ${productCtx.title}`,
    `Route/Details: ${productCtx.subtitle}`,
    `Date: ${productCtx.meta}`,
    `Total: ${formatMoney(grandTotal)}`,
  ].join("\n"));
  const formatCardNumber = (v: string) => v.replace(/\D/g, "").slice(0, 19).replace(/(.{4})/g, "$1 ").trim();
  const formatExpiry = (v: string) => {
    const d = v.replace(/\D/g, "").slice(0, 4);
    return d.length > 2 ? `${d.slice(0, 2)}/${d.slice(2)}` : d;
  };

  const backLink: string = isFlight
    ? "/flights-search"
    : (productCtx.type as string) === "hotel" ? "/hotels-search"
    : (productCtx.type as string) === "umrah" ? "/umrah-packages"
    : "/umrah-packages";

  // The flight and fare summary: the sidebar on wide screens, a sheet from the bottom bar on phones (#156).
  const fareSummaryContent = (
    <>
      <div className="mb-4 flex gap-3 border-b pb-4">
        <div className="shrink-0">
          {isFlight ? (
            <AirlineLogo airline={ctxAirline || productCtx.title} flightNumber={ctxFlightNo} imageUrl={productCtx.extra?.airlineImage} />
          ) : (
            <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-xl bg-accent text-2xl">
              {productCtx.emoji}
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="truncate text-base font-bold text-foreground">{ctxAirline || productCtx.title}</h3>
              <p className="mt-0.5 text-xs font-semibold text-foreground">{flightNumbersForDisplay(ctxFlightNo)}</p>
            </div>
            {isFlight && <Badge className="shrink-0 rounded-md bg-primary/10 text-primary hover:bg-primary/10">{stopSummary}</Badge>}
          </div>
          <p className="mt-2 text-sm font-semibold text-foreground">{ctxFrom} &rarr; {ctxTo}</p>
          <p className="text-xs text-muted-foreground">{ctxDate} &bull; {passengerSummary} &bull; {ctxCabin}</p>
        </div>
      </div>
      {isFlight && (ctxSegments.length > 0 || ctxLayovers.length > 0) && (
        <div className="mb-4 rounded-2xl border bg-slate-50/80 p-3 text-xs text-slate-600">
          {ctxSegments.length > 0 && (
            <div className="space-y-3">
              {ctxSegments.map((segment, index) => (
                <div key={`${segment.flightNumber || "segment"}-${index}`}>
                  <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
                    <div className="text-left">
                      <p className="text-lg font-black text-foreground">{bookingTime(segment.departureTime)}</p>
                      <p className="font-bold text-foreground">{segment.origin || "Origin TBA"}</p>
                      <p className="text-xs text-muted-foreground">{bookingShortDate(segment.departureTime)}</p>
                    </div>
                    <div className="flex min-w-[86px] flex-col items-center">
                      <div className="mb-1 text-xs font-semibold text-primary">{segment.flightNumber || "Flight TBA"}</div>
                      <div className="h-px w-full bg-border" />
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-black text-foreground">{bookingTime(segment.arrivalTime)}</p>
                      <p className="font-bold text-foreground">{segment.destination || "Destination TBA"}</p>
                      <p className="text-xs text-muted-foreground">{bookingShortDate(segment.arrivalTime)}</p>
                    </div>
                  </div>
                  {ctxLayovers[index] && (
                    <div className="my-3 rounded-full bg-primary/10 px-3 py-1 text-center text-xs font-semibold text-primary">
                      Layover in {ctxLayovers[index].location || "connection"} &bull; {ctxLayovers[index].duration || "Duration TBA"}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
          {journeys.length > 0 && (
            <div className="mt-3 space-y-1 border-t pt-3 text-xs font-semibold text-slate-700" data-testid="checkout-journeys">
              {journeys.map((journey, index) => (
                <div key={`${journey.label}-${index}`} className="flex flex-wrap items-center justify-between gap-2">
                  {journey.duration
                    ? <span>{journey.label ? `${journey.label}: ` : "Total Duration: "}{journey.duration}</span>
                    : <span>{journey.label}</span>}
                  <span>{journey.stopText}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      <div className="rounded-2xl border bg-white p-3 text-sm">
        <p className="mb-2 font-bold text-foreground">Fare Summary</p>
        {sourceCurrencyLabel && <p className="mb-2 text-xs text-muted-foreground">{sourceCurrencyLabel}</p>}
        {isFlight && passengerTotal > 1 && (
          <p className="mb-1 text-xs text-muted-foreground">{passengerSummary} · fares shown for the whole party</p>
        )}
        <div className="flex justify-between">
          <span className="text-muted-foreground">Base Fare{isFlight && passengerTotal > 1 ? ` x ${passengerTotal}` : ""}</span>
          <span className="font-semibold text-foreground">{formatMoney(fareBaseTotal)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Taxes &amp; fees</span>
          <span className="font-semibold text-foreground">{formatMoney(fareTaxesTotal)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Seat/baggage add-ons{selectedAddons.length > 0 ? ` (${selectedAddons.length})` : ""}</span>
          <span className="text-foreground font-medium">{formatMoney(addonsTotal)}</span>
        </div>
        {isFlight && (
          <div className="mt-3 rounded-xl border border-primary/10 bg-accent/40 p-3 text-xs text-muted-foreground">
            <p className="flex items-start gap-1.5 font-semibold text-foreground">
              <Info className="mt-0.5 h-3.5 w-3.5 text-primary" />
              Fare rules summary
            </p>
            <p className="mt-1">Includes 7kg carry-on.</p>
            {ctxRefund && <p className="mt-1">{REFUND_LABEL[ctxRefund]}.</p>}
            <p className="mt-1">Refund and change fees follow the airline's fare rules. We confirm them before ticketing.</p>
            {fareSplitIsEstimated && <p className="mt-1">Base/tax split is estimated until the airline confirms the fare.</p>}
          </div>
        )}
        <div className="mt-2 flex justify-between border-t pt-2 text-base font-black">
          <span>Total</span>
          <span className="text-primary">{formatMoney(grandTotal)}</span>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <Badge variant="outline" className="gap-1 rounded-full px-2.5 py-1 text-xs"><Lock className="h-3 w-3 text-success" /> Instant Verification</Badge>
        <Badge variant="outline" className="rounded-full px-2.5 py-1 text-xs">{passengerSummary}</Badge>
        <Badge variant="outline" className="rounded-full px-2.5 py-1 text-xs">{ctxCabin}</Badge>
        {ctxFarePerks.slice(0, 4).map((perk) => (
          <Badge key={perk} variant="outline" className="gap-1 rounded-full px-2.5 py-1 text-xs"><Check className="h-3 w-3 text-success" /> {perk}</Badge>
        ))}
      </div>
    </>
  );

  // #156: each step's one main action, repeated in the phone's bottom bar next to the total.
  const isPhone = useIsMobile();
  const mobileAction: CheckoutAction | null = step === 1
    ? { label: "Continue", onClick: handleContinue }
    : step === 2
      ? { label: "Continue", onClick: continueFromReview }
      : step === 3
        ? canPayHere
          ? { label: processing ? "Processing..." : "Pay & Book", onClick: requestPay, disabled: processing }
          : { label: isCustomer ? "Reserve / Request Booking" : isFlight ? "Reserve now, pay later" : "Request Without Payment", onClick: handleHoldBooking, disabled: processing }
        : null;

  return (
    <div className="bg-muted/20 min-h-screen">
      <SEO title="Secure Checkout - Travelian" description={`Complete your ${productCtx.type} booking securely with Travelian.`} />
      <h1 className="sr-only">Secure Checkout</h1>
      {/* Progress Header */}
      <div className="sticky top-0 z-50 border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/85">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <Link to={backLink} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="h-4 w-4" /> Back to results
            </Link>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Lock className="h-3 w-3 text-success" /> Secure Checkout
            </div>
          </div>
          <ol aria-label="Checkout progress" className="flex items-center gap-2 mt-4">
            {steps.map((s, i) => (
              <li key={s.id} aria-current={step === s.id ? "step" : undefined} className="flex items-center gap-2 flex-1">
                <span className="sr-only">{`Step ${s.id} of ${steps.length}: ${s.label}${step > s.id ? " (done)" : ""}`}</span>
                <div aria-hidden="true" className={`h-9 w-9 rounded-full flex items-center justify-center text-xs font-bold shrink-0 transition-all duration-300 ${
                  step >= s.id ? 'gradient-primary text-primary-foreground shadow-sm' : 'bg-muted text-muted-foreground'
                }`}>
                  {step > s.id ? <Check className="h-4 w-4" /> : s.id}
                </div>
                <span aria-hidden="true" className={`text-xs font-medium hidden sm:block transition-colors ${step >= s.id ? 'text-foreground' : 'text-muted-foreground'}`}>
                  {s.label}
                </span>
                {i < steps.length - 1 && <div aria-hidden="true" className={`h-0.5 flex-1 rounded transition-all ${step > s.id ? 'bg-primary' : 'bg-muted'}`} />}
              </li>
            ))}
          </ol>
          {/* Phones hide the step names beside the circles; name the current step so the traveller knows where they are. */}
          <p aria-hidden="true" className="mt-2 text-xs font-semibold text-foreground sm:hidden">
            Step {Math.min(step, steps.length)} of {steps.length}: {steps.find(s => s.id === step)?.label ?? steps[steps.length - 1].label}
          </p>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main */}
          <div className="lg:col-span-2 space-y-6">
            {step === 1 && (
              <div className="space-y-6 animate-fade-in">
                <Card className="shadow-card border-0">
                  <CardContent className="p-6">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <h2 className="text-lg font-bold text-foreground">Traveler Information</h2>
                        <p className="mt-1 text-sm text-muted-foreground">Enter details exactly as shown on the identity document.</p>
                      </div>
                      <div className="grid w-full grid-cols-3 gap-2 rounded-xl border bg-muted/30 p-2 text-center text-xs text-muted-foreground sm:w-auto sm:min-w-[18rem]">
                        <div className="rounded-lg bg-card px-3 py-2"><span className="block font-bold tabular-nums text-foreground">{adultCount}</span> Adult{adultCount === 1 ? "" : "s"}</div>
                        <div className="rounded-lg bg-card px-3 py-2"><span className="block font-bold tabular-nums text-foreground">{childCount}</span> Child{childCount === 1 ? "" : "ren"}</div>
                        <div className="rounded-lg bg-card px-3 py-2"><span className="block font-bold tabular-nums text-foreground">{infantCount}</span> Infant{infantCount === 1 ? "" : "s"}</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {passengerForms.map((passenger, index) => {
                  const isComplete = passengerComplete(passenger, travelDateIso, requiredDocs[index]);
                  return (
                  <Card key={`${passenger.passengerType}-${index}`} className="shadow-card border-0">
                    <CardContent className="p-6">
                      <div className="mb-5 flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <h2 className="text-lg font-bold text-foreground">{passenger.label}</h2>
                          <p className="text-sm text-muted-foreground">
                            {passenger.passengerType === "adult" ? "12+ years" : passenger.passengerType === "child" ? "2-11 years" : "Under 2 years"}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          {isComplete && <Badge className="rounded-full bg-success/10 text-success hover:bg-success/10">Complete</Badge>}
                          <Badge variant="outline" className="capitalize">{passenger.passengerType}</Badge>
                        </div>
                      </div>

                      <PassengerFields
                        idPrefix={`passenger-${index}`}
                        value={passenger}
                        onChange={(patch) => updatePassenger(index, patch)}
                        travelDate={travelDateIso}
                        requiredDoc={requiredDocs[index]}
                        errors={touched ? Object.fromEntries(Object.entries(errors)
                          .filter(([key]) => key.startsWith(`passenger-${index}-`))
                          .map(([key, message]) => [key.slice(`passenger-${index}-`.length), message])) : {}}
                      />
                    </CardContent>
                  </Card>
                  );
                })}

                {/* Contact Information */}
                <Card className="shadow-card border-0">
                  <CardContent className="p-6">
                    <h2 className="text-lg font-bold text-foreground mb-1">Contact Information</h2>
                    <p className="text-sm text-muted-foreground mb-6">We'll use the mobile number for booking follow-up. Email is optional.</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="md:col-span-2" data-error-key="email">
                        <Label htmlFor="contact-email" className="text-sm font-medium">Email</Label>
                        <Input
                          id="contact-email"
                          type="email"
                          placeholder="Optional email"
                          className="mt-1.5 h-11 rounded-xl"
                          value={email}
                          onChange={e => setEmail(e.target.value)}
                          aria-describedby="contact-email-hint"
                        />
                        {touched && errors.email && <p className="text-xs text-destructive mt-1">{errors.email}</p>}
                        {!email.trim() && <p id="contact-email-hint" className="text-xs text-muted-foreground mt-1">Optional, but recommended for e-ticket delivery.</p>}
                      </div>
                      <div className="md:col-span-2" data-error-key="phone">
                        <Label htmlFor="contact-phone" className="text-sm font-medium">Mobile Number *</Label>
                        <div className="flex gap-2 mt-1.5">
                          <CountryCodePicker value={phoneCode} onChange={setPhoneCode} />
                          <Input
                            id="contact-phone"
                            inputMode="numeric"
                            placeholder="3001234567"
                            className="h-11 rounded-xl flex-1"
                            value={phone}
                            onChange={onPhoneChange(setPhone)}
                            aria-describedby="contact-phone-hint"
                          />
                        </div>
                        <p id="contact-phone-hint" className="text-xs text-muted-foreground mt-1">Travelian will use this number for ticketing updates and support.</p>
                        {touched && errors.phone && <p className="text-xs text-destructive mt-1">{errors.phone}</p>}
                      </div>
                      <div className="md:col-span-2" data-error-key="altPhone">
                        <Label className="text-sm font-medium">Alternate Mobile Number</Label>
                        <div className="flex gap-2 mt-1.5">
                          <CountryCodePicker value={altPhoneCode} onChange={setAltPhoneCode} />
                          <Input
                            inputMode="numeric"
                            placeholder="3001234567"
                            className="h-11 rounded-xl flex-1"
                            value={altPhone}
                            onChange={onPhoneChange(setAltPhone)}
                          />
                        </div>
                        {touched && errors.altPhone && <p className="text-xs text-destructive mt-1">{errors.altPhone}</p>}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <div className="flex items-start gap-2 p-3 bg-accent/50 rounded-xl border border-primary/10">
                  <AlertCircle className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                  <p id="passport-match-hint" className="text-xs text-muted-foreground">Name must match exactly as shown on each traveler's passport or CNIC.</p>
                </div>
                <div className="grid gap-2 rounded-2xl border bg-card p-3 text-xs text-muted-foreground sm:grid-cols-3">
                  <span className="flex items-center gap-1.5"><Shield className="h-3.5 w-3.5 text-success" /> Secure SSL checkout</span>
                  <span className="flex items-center gap-1.5"><Lock className="h-3.5 w-3.5 text-success" /> Your card is not charged yet</span>
                  <span className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-success" /> We confirm your fare before ticketing</span>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    {/* #149: no invented free-cancellation deadline; refundability only when the fare data says so. */}
                    {ctxRefund && <RefundBadge status={ctxRefund} />}
                    <span className="text-muted-foreground">Cancellation and refund rules: as per airline fare rules.</span>
                  </div>
                  <Button onClick={handleContinue} className="gradient-primary hidden h-11 rounded-xl px-6 text-primary-foreground md:inline-flex">
                    Continue <ChevronRight className="ml-1 h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-6 animate-fade-in">
                <Card className="shadow-card border-0">
                  <CardContent className="p-6">
                    <h2 className="text-lg font-bold text-foreground mb-1">Review Booking</h2>
                    <p className="text-sm text-muted-foreground">Check the traveler names before payment. They must match each passport or CNIC exactly.</p>

                    {/* #155: what is being booked, so names are checked here, not in a dialog without them. */}
                    <section aria-labelledby="review-travelers" className="mt-5">
                      <div className="flex items-center justify-between gap-2">
                        <h3 id="review-travelers" className="text-sm font-bold text-foreground">Travelers</h3>
                        <button type="button" onClick={() => setStep(1)} className="min-h-11 rounded-lg px-2 text-sm font-semibold text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">Edit</button>
                      </div>
                      <ul className="mt-1 divide-y rounded-xl border" data-testid="review-travelers">
                        {passengerForms.map((passenger, index) => (
                          <li key={`${passenger.label}-${index}`} className="flex items-center justify-between gap-3 px-4 py-3">
                            <span className="min-w-0 break-words text-sm font-semibold text-foreground">{travelerFullName(passenger)}</span>
                            <span className="shrink-0 text-xs text-muted-foreground">{passenger.label}</span>
                          </li>
                        ))}
                      </ul>
                    </section>

                    <section aria-labelledby="review-contact" className="mt-5">
                      <h3 id="review-contact" className="text-sm font-bold text-foreground">Contact</h3>
                      <dl className="mt-1 grid gap-1 rounded-xl border px-4 py-3 text-sm">
                        <div className="flex flex-wrap justify-between gap-2"><dt className="text-muted-foreground">Mobile</dt><dd className="font-medium text-foreground">{phoneCode} {phone}</dd></div>
                        {email.trim() && <div className="flex flex-wrap justify-between gap-2"><dt className="text-muted-foreground">Email</dt><dd className="min-w-0 break-all font-medium text-foreground">{email.trim()}</dd></div>}
                      </dl>
                    </section>

                    <section aria-labelledby="review-fare" className="mt-5">
                      <h3 id="review-fare" className="text-sm font-bold text-foreground">Fare</h3>
                      <div className="mt-1 flex flex-wrap items-center justify-between gap-2 rounded-xl border px-4 py-3 text-sm">
                        <span className="text-muted-foreground">Total · {passengerSummary}</span>
                        <span className="font-bold text-primary">{formatMoney(grandTotal)}</span>
                      </div>
                    </section>

                    <div className="mt-5 space-y-3">
                      <label className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 text-sm leading-5 ${reviewTouched && !nameAcknowledged ? "border-destructive" : ""}`}>
                        <Checkbox
                          id="review-names-confirm"
                          checked={nameAcknowledged}
                          onCheckedChange={(checked) => setNameAcknowledged(checked === true)}
                          aria-invalid={reviewTouched && !nameAcknowledged ? true : undefined}
                          aria-describedby={reviewTouched && !nameAcknowledged ? "review-names-error" : undefined}
                          className="mt-0.5"
                        />
                        <span>I have checked each traveler’s first and last name, and they match the passport.</span>
                      </label>
                      {reviewTouched && !nameAcknowledged && <p id="review-names-error" className="-mt-2 text-xs text-destructive">Tick the box to confirm the names before you continue.</p>}
                      {groupTicketId && (
                        <>
                          <label className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 text-sm leading-5 ${reviewTouched && !fareTermsAccepted ? "border-destructive" : ""}`}>
                            <Checkbox
                              id="review-fare-terms"
                              checked={fareTermsAccepted}
                              onCheckedChange={(checked) => setFareTermsAccepted(checked === true)}
                              aria-invalid={reviewTouched && !fareTermsAccepted ? true : undefined}
                              aria-describedby={reviewTouched && !fareTermsAccepted ? "review-terms-error" : undefined}
                              className="mt-0.5"
                            />
                            <span>I understand this group fare is non-refundable and non-changeable. Names and dates cannot be changed after booking.</span>
                          </label>
                          {reviewTouched && !fareTermsAccepted && <p id="review-terms-error" className="-mt-2 text-xs text-destructive">Tick the box to accept the group fare terms.</p>}
                        </>
                      )}
                    </div>
                    {/*
                      Future seat and add-on UI (paused):
                      <SeatMap selected={selectedSeat} onSelect={setSelectedSeat} />
                      {addons.map(addon => (...))}
                    */}
                    <div className="flex justify-between mt-6 gap-3">
                      <Button variant="outline" onClick={() => setStep(1)} className="rounded-xl">Back</Button>
                      <div className="flex flex-wrap justify-end gap-2">
                        {!isCustomer && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="outline" onClick={handleHoldBooking} disabled={processing} className="rounded-xl h-11 px-5">
                              Hold Booking
                            </Button>
                          </TooltipTrigger>
                          {/* <TooltipContent className="max-w-xs">
                            Free 24-hour PNR hold. Travelian can verify fare rules and confirm before payment.
                          </TooltipContent> */}
                        </Tooltip>
                        )}
                        <Button onClick={continueFromReview} className="gradient-primary text-primary-foreground rounded-xl h-11 px-6 hidden md:inline-flex">
                          Continue <ChevronRight className="h-4 w-4 ml-1" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {step === 3 && (
              <Card className="shadow-card border-0 animate-fade-in">
                <CardContent className="p-6">
                  <h2 className="text-lg font-bold text-foreground mb-1">Payment Method</h2>
                  <p className="text-sm text-muted-foreground mb-6">Choose how you'd like to pay</p>
                  <div className="space-y-3 mb-6">
                    {([
                      { id: "card", label: "Credit/Debit Card", icon: CreditCard, desc: "Pay online through secure PayFast checkout", badges: ["Visa", "Mastercard"] as string[] },
                      { id: "1link", label: "1Link", icon: Wallet, desc: "Pay through PayFast 1Link checkout", badges: ["1Link"] as string[] },
                      { id: "wallet", label: "Digital Wallet", icon: Wallet, desc: "Pay from your mobile wallet", badges: ["JazzCash", "Easypaisa"] as string[] },
                      { id: "bank", label: "Bank Transfer", icon: Building2, desc: "Direct bank transfer", badges: [] as string[] },
                    ]).filter(method => (method.id === "bank" ? paymentOptions.bank : method.id === "wallet" ? paymentOptions.wallet : paymentOptions.card))
                    .map(method => (
                      <div
                        key={method.id}
                        className={`border rounded-xl p-4 cursor-pointer transition-all duration-200 ${
                          paymentMethod === method.id ? 'border-primary bg-accent/30 shadow-sm' : 'hover:border-primary/30'
                        }`}
                        onClick={() => setPaymentMethod(method.id)}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`h-11 w-11 rounded-xl flex items-center justify-center transition-all ${
                            paymentMethod === method.id ? 'gradient-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                          }`}>
                            <method.icon className="h-5 w-5" />
                          </div>
                          <div className="flex-1">
                            <h4 className="text-sm font-semibold text-foreground">{method.label}</h4>
                            <p className="text-xs text-muted-foreground">{method.desc}</p>
                          </div>
                          {method.badges && (
                            <div className="flex gap-1">
                              {method.badges.map(b => (
                                <span key={b} className="text-xs bg-muted px-2 py-0.5 rounded-md">{b}</span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  {!canPayHere && (
                    <div role="status" className="rounded-xl border border-primary/10 bg-accent/30 p-4 text-sm text-muted-foreground">
                      Online payment isn't available for this booking. Send your booking request and Travelian's team will contact you to
                      confirm the fare and arrange payment. Nothing is charged and no ticket is issued until then.
                    </div>
                  )}

                  {canPayHere && paymentMethod === "card" && (
                    <div className="rounded-xl border border-primary/10 bg-accent/30 p-4 text-sm text-muted-foreground">
                      You will be redirected to PayFast to enter card details securely. Travelian does not collect or store card numbers.
                    </div>
                  )}

                  {paymentMethod === "bank" && methods?.bank_accounts?.length ? (
                    <div className="rounded-xl border border-primary/10 bg-accent/30 p-4 text-sm text-muted-foreground space-y-3">
                      <p>Your seats are held at the airline while you transfer the amount. Travelian confirms the payment and then issues your tickets. Pay before the hold time ends, or the booking expires.</p>
                      <BankAccounts accounts={methods.bank_accounts} />
                    </div>
                  ) : null}

                  {paymentMethod === "wallet" && methods?.jazzcash_accounts?.length ? (
                    <div className="rounded-xl border border-primary/10 bg-accent/30 p-4 text-sm text-muted-foreground space-y-3">
                      <p>Your seats are held at the airline while you send the amount by JazzCash. Travelian confirms the payment and then issues your tickets. Pay before the hold time ends, or the booking expires.</p>
                      <BankAccounts accounts={methods.jazzcash_accounts} />
                    </div>
                  ) : null}

                  {canPayHere && paymentMethod === "1link" && (
                    <div className="rounded-xl border border-primary/10 bg-accent/30 p-4 text-sm text-muted-foreground">
                      You will be redirected to PayFast 1Link checkout. Your booking will stay pending until payment is confirmed.
                    </div>
                  )}

                  <div className="flex items-start gap-2 mt-5 p-3 bg-success/5 rounded-xl border border-success/20">
                    <Lock className="h-4 w-4 text-success shrink-0 mt-0.5" />
                    <p className="text-xs text-muted-foreground">Online payments are processed by PayFast. Booking details are saved before redirecting to payment.</p>
                  </div>

                  <div className="flex justify-between mt-6">
                    <Button variant="outline" onClick={() => setStep(2)} className="rounded-xl" disabled={processing}>Back</Button>
                    <div className="flex flex-wrap justify-end gap-2">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="outline" onClick={handleHoldBooking} disabled={processing} className={`rounded-xl h-11 px-5 ${canPayHere ? "" : "hidden md:inline-flex"}`}>
                            {isCustomer ? "Reserve / Request Booking" : isFlight ? "Reserve now, pay later" : "Request Without Payment"}
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs">
                          {isCustomer
                            ? "Reserve now and let Travelian confirm the itinerary before payment."
                            : "Saves your booking with payment pending. Tickets are issued only after payment or confirmation by our team."}
                        </TooltipContent>
                      </Tooltip>
                      <Button asChild variant="outline" className="rounded-xl h-11 px-5">
                        <a href={bookingWhatsAppUrl} target="_blank" rel="noreferrer">WhatsApp Help</a>
                      </Button>
                      {canPayHere && (
                        <Button onClick={requestPay} disabled={processing} className="gradient-primary text-primary-foreground rounded-xl h-11 px-6 hidden md:inline-flex">
                          {processing ? "Processing..." : `Pay & Book ${formatMoney(grandTotal)}`} <ChevronRight className="h-4 w-4 ml-1" />
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {step === 4 && savedBooking && (
              <Card className="shadow-card border-0 animate-fade-in-up">
                <CardContent className="p-8 text-center">
                  <div className="h-20 w-20 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-5 animate-scale-in">
                    <Check className="h-10 w-10 text-success" />
                  </div>
                  <h2 className="text-2xl font-bold text-foreground mb-2">{savedBooking.status === "requested" ? "Booking Request Received" : savedBooking.status === "held" ? "Booking Held" : savedBooking.ticketStatus === "issued" ? "Booking Confirmed" : "Booking Saved"}</h2>
                  <p className="text-muted-foreground mb-6">
                    {savedBooking.status === "requested"
                      ? "Travelian will confirm the fare and seats with you, then send payment details. Nothing has been charged."
                      : savedBooking.status === "held"
                      ? "Your booking request has been saved with payment pending. Travelian will process payment and ticketing next."
                      : "Your booking is saved. You'll receive your ticket only after the payment is verified."}
                  </p>

                  {savedBooking.gateway?.live && savedBooking.holdExpiresAt && (
                    <div className="mx-auto mb-4 max-w-lg text-left"><HoldCountdown until={savedBooking.holdExpiresAt} /></div>
                  )}
                  {savedBooking.gateway?.live && savedBooking.paymentMethod === "bank" && methods?.bank_accounts?.length ? (
                    <div className="mx-auto mb-4 max-w-lg space-y-2 text-left">
                      <p className="text-sm font-semibold text-foreground">Pay by bank transfer</p>
                      <p className="text-sm text-muted-foreground">Transfer {savedBooking.pricing.currency === "PKR" ? "Rs" : savedBooking.pricing.currency} {savedBooking.pricing.total.toLocaleString("en-PK")} and use {savedBooking.id} as the reference. Travelian confirms the payment and then issues your tickets.</p>
                      <BankAccounts accounts={methods.bank_accounts} onChoose={rememberAccount}
                        facts={{ amount: `${savedBooking.pricing.currency === "PKR" ? "Rs" : savedBooking.pricing.currency} ${savedBooking.pricing.total.toLocaleString("en-PK")}`, reference: savedBooking.gateway.reference }}>
                        {(account: BankAccountDisplay) => (
                          <PaymentSlipUpload reference={savedBooking.gateway!.reference} access={{ token: savedBooking.gateway!.token }}
                            details={{ method: "bank_transfer", accountId: account.id, amountMinor: Math.round(savedBooking.pricing.total * 100), via: "checkout" }} />
                        )}
                      </BankAccounts>
                    </div>
                  ) : null}
                  {savedBooking.gateway?.live && savedBooking.paymentMethod === "wallet" && methods?.jazzcash_accounts?.length ? (
                    <div className="mx-auto mb-4 max-w-lg space-y-2 text-left">
                      <p className="text-sm font-semibold text-foreground">Pay by JazzCash</p>
                      <p className="text-sm text-muted-foreground">Send {savedBooking.pricing.currency === "PKR" ? "Rs" : savedBooking.pricing.currency} {savedBooking.pricing.total.toLocaleString("en-PK")} by JazzCash and use {savedBooking.id} as the reference. Travelian confirms the payment and then issues your tickets.</p>
                      <BankAccounts accounts={methods.jazzcash_accounts} onChoose={rememberAccount}
                        facts={{ amount: `${savedBooking.pricing.currency === "PKR" ? "Rs" : savedBooking.pricing.currency} ${savedBooking.pricing.total.toLocaleString("en-PK")}`, reference: savedBooking.gateway.reference }}>
                        {(account: BankAccountDisplay) => (
                          <PaymentSlipUpload reference={savedBooking.gateway!.reference} access={{ token: savedBooking.gateway!.token }}
                            details={{ method: "jazzcash", accountId: account.id, amountMinor: Math.round(savedBooking.pricing.total * 100), via: "checkout" }} />
                        )}
                      </BankAccounts>
                    </div>
                  ) : null}
                  <div className="bg-gradient-to-br from-primary/5 to-accent border rounded-2xl p-6 text-left max-w-lg mx-auto">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-lg gradient-primary flex items-center justify-center">
                          <Plane className="h-4 w-4 text-primary-foreground" />
                        </div>
                        <span className="font-bold text-sm">{savedBooking.ticketStatus === "issued" ? "Travelian E-Ticket" : "Booking summary"}</span>
                      </div>
                      <Badge className={`${savedBooking.ticketStatus === "issued" ? "bg-success/10 text-success" : "bg-muted text-foreground"} border-0 text-xs rounded-md`}>
                        {savedBooking.ticketStatus === "issued" ? "Ticketed" : savedBooking.status === "requested" ? "Requested" : savedBooking.status === "held" ? "Held" : savedBooking.status === "pending_payment" ? "Awaiting payment" : "Not ticketed"}
                      </Badge>
                    </div>
                    <div className="space-y-3">
                      {savedBooking.pnr && (
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">PNR</span>
                          <span className="inline-flex items-center gap-1 font-bold font-mono text-foreground">{savedBooking.pnr}<CopyPnr pnr={savedBooking.pnr} /></span>
                        </div>
                      )}
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Booking ID</span>
                        <span className="font-mono text-foreground">{savedBooking.id}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground capitalize">{productCtx.type}</span>
                        <span className="font-medium text-foreground">{productCtx.title}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Details</span>
                        <span className="font-medium text-foreground">{productCtx.subtitle}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">When</span>
                        <span className="font-medium text-foreground">{productCtx.meta}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Passenger</span>
                        <span className="font-medium text-foreground">{passengerForms[0]?.firstName} {passengerForms[0]?.lastName}</span>
                      </div>
                      {isFlight && (
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Seat</span>
                          <span className="font-medium text-foreground">{selectedSeat || "Auto-assign at check-in"}</span>
                        </div>
                      )}
                      <div className="flex justify-between font-bold border-t pt-3 text-base">
                        <span>{savedBooking.paymentStatus === "unpaid" ? "Total Due" : "Total Paid"}</span>
                        <span className="text-primary">{formatMoney(grandTotal)}</span>
                      </div>
                    </div>
                  </div>

                  <p className="text-xs text-muted-foreground mt-4">
                    {savedBooking.contact.email
                      ? `Travelian has saved this booking and can follow up at ${savedBooking.contact.email}.`
                      : `Travelian has saved this booking and can follow up on ${savedBooking.contact.phone}.`}
                  </p>
                  <div className="flex flex-wrap gap-3 justify-center mt-6">
                    <Button variant="outline" className="rounded-xl gap-2" onClick={() => downloadETicket(savedBooking)}>
                      <Download className="h-4 w-4" /> {savedBooking.ticketStatus === "issued" ? "Download E-Ticket" : "Download Summary"}
                    </Button>
                    <Link to="/my-bookings">
                      <Button className="gradient-primary text-primary-foreground rounded-xl">View My Bookings</Button>
                    </Link>
                    <Link to="/">
                      <Button variant="ghost" className="rounded-xl">Back to Home</Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div>
            <Card className="sticky top-32 shadow-card border-0">
              <CardContent className="p-5">
                {fareSummaryContent}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {isPhone && mobileAction && (
        <CheckoutActionBar total={formatMoney(grandTotal)} travelers={passengerSummary} action={mobileAction} summary={fareSummaryContent} />
      )}

      {/* Fare recheck interstitial */}
      <Dialog open={recheckOpen} onOpenChange={(open) => { if (!open) { setRecheckOpen(false); setRecheckResult(null); } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{recheckLoading ? "Verifying fare with airline…" : recheckResult ? "Fare has changed" : "Fare confirmed"}</DialogTitle>
            <DialogDescription>
              {recheckLoading
                ? "We are re-pricing this itinerary with the airline to make sure the fare is still available."
                : recheckResult
                  ? `The airline returned a new price. Previous total ${formatMoney(recheckResult.oldPrice)} → New total ${formatMoney(recheckResult.newPrice)}.`
                  : "Your fare is confirmed at the displayed total."}
            </DialogDescription>
          </DialogHeader>
          {recheckLoading && (
            <div className="flex items-center justify-center py-6"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
          )}
          {!recheckLoading && recheckResult && (
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => { setRecheckOpen(false); setRecheckResult(null); }}>Decline</Button>
              <Button onClick={() => { setRecheckOpen(false); setRecheckResult(null); setRecheckAccepted(true); setStep(2); toast({ title: "New price accepted" }); }}>
                Accept new price
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>

      {/* Payment confirmation modal */}
      <Dialog open={payConfirmOpen} onOpenChange={setPayConfirmOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Confirm payment</DialogTitle>
            <DialogDescription>
              Review the amount. Online payments are made on PayFast; tickets are issued only after the payment is verified.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Method</span><span className="font-semibold capitalize">{paymentMethod === "1link" ? "1Link" : paymentMethod}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">{cardFee ? "Fare" : "Payable"}</span><span className="font-bold text-foreground">{formatMoney(grandTotal)}</span></div>
            {cardFee && (
              <p className="rounded-lg bg-accent/40 px-3 py-2 font-semibold text-foreground">
                Card fee ({cardFee.percent}): {rs(cardFee.fee.amount_minor)} · Total {rs(cardFee.total.amount_minor)}
              </p>
            )}
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setPayConfirmOpen(false)} disabled={processing}>Cancel</Button>
            <Button
              onClick={handlePay}
              disabled={processing}
              className="gradient-primary text-primary-foreground"
            >
              {processing ? "Processing..." : `Confirm ${cardFee ? rs(cardFee.total.amount_minor) : formatMoney(grandTotal)}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// #149: the fare's refundability, shown only when the fare data says so (colour always with icon and text).
function RefundBadge({ status }: { status: Exclude<RefundStatus, null> }) {
  const refundable = status === "refundable";
  return (
    <Badge variant="outline" className={`gap-1 rounded-full px-2.5 py-1 ${refundable ? "border-success/30 bg-success/10 text-success" : "border-warning/30 bg-warning/10 text-foreground"}`}>
      {refundable ? <Check className="h-3 w-3" /> : <AlertCircle className="h-3 w-3 text-warning" />} {REFUND_LABEL[status]}
    </Badge>
  );
}

function parseJsonParam<T>(params: URLSearchParams, key: string, fallback: T): T {
  const raw = params.get(key);
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function compactBookingDateTime(value?: string | null) {
  if (!value) return "TBA";
  const [date, time] = String(value).split(" ");
  return [date, time].filter(Boolean).join(" ");
}

function bookingTime(value?: string | null) {
  return String(value || "").split(" ")[1] || "TBA";
}

function bookingShortDate(value?: string | null) {
  if (!value) return "";
  const text = String(value);
  const datePart = text.split(" ")[0];
  const parsed = new Date(`${datePart}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return datePart;
  return format(parsed, "dd MMM yyyy");
}

function flightNumbersForDisplay(value: string) {
  return String(value || "Flight TBA").replace(/\s*\/\s*/g, " • ");
}

type PassengerForm = PassengerDetails;
// #155: the title sets the gender (the default Mr: Male); the traveler can still change it.
const createPassengerForm = (type: PassengerDetails["passengerType"], label: string): PassengerForm => {
  const details = createPassengerDetails(type, label);
  return { ...details, gender: genderForTitle(details.title) };
};

/** A draft date saved by an older version (a Date as a UTC timestamp) or now (ISO day) -> ISO day in local time. */
function draftDay(value?: string) {
  if (!value) return undefined;
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : format(date, "yyyy-MM-dd");
}

function ServiceBookingRequest({ productCtx }: { productCtx: ProductCtx }) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [touched, setTouched] = useState(false);
  const [saved, setSaved] = useState<BookingRecord | null>(null);
  const [saving, setSaving] = useState(false);
  const backLink = "/umrah-packages";
  const formatMoney = (amount: number) => amount > 0 ? `${productCtx.currency || "PKR"} ${Math.round(amount).toLocaleString()}` : "On request";
  const cleanPhone = phone.replace(/[^\d+]/g, "");
  const valid = name.trim().length >= 2 && cleanPhone.replace(/\D/g, "").length >= 7;

  const handleSubmit = () => {
    setTouched(true);
    if (!valid) return;
    setSaving(true);
    try {
      const [firstName, ...rest] = name.trim().split(/\s+/);
      const savedRequest = saveBooking({
        type: productCtx.type,
        status: "held",
        travelers: [{
          passengerType: "adult",
          title: "mr",
          firstName,
          lastName: rest.join(" "),
          docType: "passport",
          docNumber: "",
        }],
        contact: {
          email,
          phone: cleanPhone,
        },
        addons: [],
        paymentMethod: "request",
        paymentStatus: "unpaid",
        ticketStatus: "not_issued",
        pricing: {
          base: productCtx.base,
          addons: 0,
          taxes: 0,
          total: productCtx.base,
          currency: productCtx.currency || "PKR",
        },
      });
      setSaved(savedRequest);
      toast({
        title: "Request saved on this device",
        description: "Contact Travelian to share your request and confirm availability.",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-muted/30">
      <SEO title={`${productCtx.title} Request - Travelian`} description={`Request booking support for ${productCtx.title}.`} />
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        <Link to={backLink} className="mb-5 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Back to service
        </Link>

        <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
          <Card className="border-0 shadow-card">
            <CardContent className="p-6">
              {saved ? (
                <div className="py-10 text-center">
                  <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-success/10">
                    <Check className="h-8 w-8 text-success" />
                  </div>
                  <h1 className="text-2xl font-black text-foreground">Request saved on this device</h1>
                  <p className="mx-auto mt-2 max-w-xl text-sm text-muted-foreground">
                    Your {productCtx.type} request is saved with reference {saved.id}. It has not been sent to Travelian. Please contact our team to confirm availability and share your details.
                  </p>
                  <div className="mt-6 flex flex-wrap justify-center gap-2">
                    <Link to="/my-bookings"><Button className="rounded-xl">View Requests</Button></Link>
                    <Link to={backLink}><Button variant="outline" className="rounded-xl">Back</Button></Link>
                  </div>
                </div>
              ) : (
                <>
                  <h1 className="text-2xl font-black text-foreground">Request booking</h1>
                  <p className="mt-1 text-sm text-muted-foreground">Save your contact details on this device, then contact Travelian to confirm availability, documents and payment.</p>
                  <div className="mt-6 grid gap-4">
                    <div>
                      <Label htmlFor="request-name">Name *</Label>
                      <Input id="request-name" required autoComplete="name" value={name} onChange={(event) => setName(event.target.value)} className="mt-1.5 h-11 rounded-xl" placeholder="Your full name" />
                      {touched && !name.trim() && <p className="mt-1 text-xs text-destructive">Name is required</p>}
                    </div>
                    <div>
                      <Label htmlFor="request-phone">Phone number *</Label>
                      <Input id="request-phone" required type="tel" autoComplete="tel" value={phone} onChange={(event) => setPhone(event.target.value)} className="mt-1.5 h-11 rounded-xl" placeholder="+92 300 1234567" />
                      {touched && cleanPhone.replace(/\D/g, "").length < 7 && <p className="mt-1 text-xs text-destructive">Valid phone number is required</p>}
                    </div>
                    <div>
                      <Label htmlFor="request-email">Email</Label>
                      <Input id="request-email" autoComplete="email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} className="mt-1.5 h-11 rounded-xl" placeholder="Optional email" />
                    </div>
                  </div>
                  <Button onClick={handleSubmit} disabled={saving} className="mt-6 h-11 rounded-xl gradient-primary text-primary-foreground">
                    {saving ? "Saving..." : "Save Request"}
                  </Button>
                </>
              )}
            </CardContent>
          </Card>

          <Card className="h-fit border-0 shadow-card">
            <CardContent className="p-5">
              <Badge className="mb-3 capitalize">{productCtx.type} request</Badge>
              <h2 className="text-lg font-black text-foreground">{productCtx.title}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{productCtx.subtitle}</p>
              <p className="mt-1 text-sm text-muted-foreground">{productCtx.meta}</p>
              <div className="mt-5 border-t pt-4">
                <p className="text-sm text-muted-foreground">Starting price</p>
                <p className="text-2xl font-black text-primary">{formatMoney(productCtx.base)}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
