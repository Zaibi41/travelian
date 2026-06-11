import { useEffect, useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AdvancedDatePicker } from "@/components/ui/advanced-date-picker";
import { CountryCodePicker } from "@/components/ui/country-code-picker";
import { CountryPicker } from "@/components/ui/country-picker";
import { Check, Shield, Lock, CreditCard, Wallet, Building2, ChevronRight, AlertCircle, ArrowLeft, Plane, Download, Search, ChevronDown, ChevronUp, Info } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
// SeatMap is intentionally paused in the UI for now. Keep the component available for the future seat-selection phase.
// import { SeatMap } from "@/components/booking/SeatMap";
import { saveServerBooking } from "@/lib/booking-api";
import { saveBooking, type BookingRecord, type BookingTraveler } from "@/lib/booking-store";
import { downloadETicket } from "@/lib/eticket-pdf";
import { toast } from "@/hooks/use-toast";
import { SEO } from "@/components/SEO";
import { AirlineLogo } from "@/components/public/AirlineLogo";
import type { UmrahPackage } from "@/data/models";
import { isPublishedUmrahPackage } from "@/lib/package-availability";
import { format, addDays } from "date-fns";
import { useAdmin } from "@/contexts/AdminStore";
import { CURRENCIES, useLocale, type CurrencyCode } from "@/contexts/LocaleContext";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useRole } from "@/contexts/RoleContext";
import { Loader2 } from "lucide-react";

const steps = [
  { id: 1, label: "Traveler Details" },
  { id: 2, label: "Review" },
  { id: 3, label: "Payment" },
  { id: 4, label: "Confirmation" },
];

const addons: Array<{ id: string; name: string; desc: string; price: number; popular?: boolean }> = [];

const currentYear = new Date().getFullYear();
const RATE_PER_USD: Record<string, number> = {
  ...Object.fromEntries(CURRENCIES.map((currency) => [currency.code, currency.rate])),
  INR: 83,
};

function convertCurrencyAmount(amount: number, fromCurrency: string, toCurrency: CurrencyCode) {
  const fromRate = RATE_PER_USD[String(fromCurrency || toCurrency).toUpperCase()] || RATE_PER_USD[toCurrency] || 1;
  const toRate = RATE_PER_USD[toCurrency] || fromRate;
  return amount / fromRate * toRate;
}

type BookingType = "flight" | "hotel" | "umrah" | "tour" | "visa";

interface ProductCtx {
  type: BookingType;
  title: string;
  subtitle: string;
  meta: string;
  emoji: string;
  base: number;
  currency: string;
  extra?: { airline?: string; flightNumber?: string; from?: string; to?: string; fromCode?: string; toCode?: string; date?: string; cabin?: string; airlineImage?: string; fareTier?: string; farePerks?: string[]; layovers?: BookingLayover[]; segments?: BookingSegment[]; baseFare?: number | null; taxes?: number | null };
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
};

interface PackageInventory {
  packages: UmrahPackage[];
  tourPackages: UmrahPackage[];
  visaPackages: UmrahPackage[];
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
    const cabin = params.get("cabin") || "Economy";
    const fareTier = params.get("fare") || "";
    const airlineImage = params.get("airlineImage") || "";
    const farePerks = (params.get("farePerks") || "").split("|").map((item) => item.trim()).filter(Boolean);
    const layovers = parseJsonParam<BookingLayover[]>(params, "layovers", []);
    const segments = parseJsonParam<BookingSegment[]>(params, "segments", []);
    const baseFare = params.has("baseFare") ? Number(params.get("baseFare")) : null;
    const taxes = params.has("taxes") ? Number(params.get("taxes")) : null;
    const price = Number(params.get("price"));
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
      extra: { airline, flightNumber, from, to, date, cabin, airlineImage, fareTier, farePerks, layovers, segments, baseFare: Number.isFinite(baseFare) ? baseFare : null, taxes: Number.isFinite(taxes) ? taxes : null },
    };
  }
  if (type === "hotel") {
    return null;
  }
  if (type === "umrah") {
    const p = inventory.packages.find(x => x.packageId === id && isPublishedUmrahPackage(x));
    if (!p) return null;
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
  if (type === "tour") {
    const t = inventory.tourPackages.find(x => x.packageId === id && !x.deletedAt);
    if (!t) return null;
    return {
      type: "tour",
      title: t.name,
      subtitle: t.city,
      meta: `${t.duration}`,
      emoji: "",
      base: t.basePrice,
      currency: "PKR",
    };
  }
  if (type === "visa") {
    const v = inventory.visaPackages.find(x => x.packageId === id && !x.deletedAt);
    if (!v) return null;
    return {
      type: "visa",
      title: v.name,
      subtitle: v.city,
      meta: `${v.duration} processing`,
      emoji: "",
      base: v.basePrice,
      currency: "PKR",
    };
  }
  return null;
}

export default function BookingPage() {
  const [params] = useSearchParams();
  const { packages, tourPackages, visaPackages } = useAdmin();
  const { currency: activeCurrency } = useLocale();
  const productCtx = useMemo(() => buildCtx(params, { packages, tourPackages, visaPackages }), [params, packages, tourPackages, visaPackages]);

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
            <h1 className="text-2xl font-bold text-foreground mb-2">No booking selected</h1>
            <p className="text-sm text-muted-foreground mb-6">
              You haven't chosen a flight, hotel or package yet. Start a search and select a product to proceed to checkout.
            </p>
            <div className="flex flex-wrap gap-2 justify-center">
              <Link to="/"><Button className="gradient-primary text-primary-foreground rounded-xl">Search Flights</Button></Link>
              <Link to="/hotels-search"><Button variant="outline" className="rounded-xl">Find Hotels</Button></Link>
              <Link to="/umrah-packages"><Button variant="outline" className="rounded-xl">Umrah Packages</Button></Link>
              <Link to="/tour-packages"><Button variant="outline" className="rounded-xl">Tours</Button></Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

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
  const ctxCabin = productCtx.extra?.cabin || "Economy";
  const ctxFarePerks = productCtx.extra?.farePerks || [];
  const ctxLayovers = productCtx.extra?.layovers || [];
  const ctxSegments = productCtx.extra?.segments || [];
  const ctxBaseFare = productCtx.extra?.baseFare;
  const ctxTaxes = productCtx.extra?.taxes;
  const sourceCurrency = String(productCtx.currency || activeCurrency || "PKR").toUpperCase();
  const displayCurrency = activeCurrency || "PKR";
  const sourceCurrencyLabel = sourceCurrency === displayCurrency ? "" : `Supplier fare received in ${sourceCurrency}. Displayed in ${displayCurrency}.`;
  const knownBaseFare = typeof ctxBaseFare === "number" && Number.isFinite(ctxBaseFare) && ctxBaseFare > 0;
  const knownTaxes = typeof ctxTaxes === "number" && Number.isFinite(ctxTaxes) && ctxTaxes > 0;
  // When the supplier only returns a single total, synthesize an industry-standard split (≈78% base / 22% taxes & fees) so the breakdown card is never a single line.
  const derivedBasePerPax = knownBaseFare ? (ctxBaseFare as number) : Math.round(productCtx.base * 0.78);
  const derivedTaxesPerPax = knownTaxes ? (ctxTaxes as number) : Math.max(0, productCtx.base - derivedBasePerPax);
  const fareBaseTotal = derivedBasePerPax * passengerTotal;
  const fareTaxesTotal = derivedTaxesPerPax * passengerTotal;
  const fareSplitIsEstimated = !knownBaseFare && !knownTaxes;
  const passengerSummary = `${passengerTotal} ${passengerTotal === 1 ? "Adult" : "Travelers"}`;
  const stopCount = Math.max(0, ctxSegments.length > 1 ? ctxSegments.length - 1 : ctxLayovers.length);
  const stopSummary = `${stopCount} Stop${stopCount === 1 ? "" : "s"}`;
  const totalDuration = ctxSegments.length
    ? (() => {
      const first = ctxSegments[0]?.departureTime;
      const last = ctxSegments[ctxSegments.length - 1]?.arrivalTime;
      if (!first || !last) return "";
      const start = new Date(String(first).replace(" ", "T")).getTime();
      const end = new Date(String(last).replace(" ", "T")).getTime();
      if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return "";
      const minutes = Math.round((end - start) / 60000);
      const hours = Math.floor(minutes / 60);
      const mins = minutes % 60;
      return `${hours ? `${hours}h` : ""}${hours && mins ? " " : ""}${mins ? `${mins}m` : ""}`;
    })()
    : "";

  const [step, setStep] = useState(1);
  const [selectedAddons, setSelectedAddons] = useState<string[]>([]);
  const [selectedSeat, setSelectedSeat] = useState<string>("");
  const [paymentMethod, setPaymentMethod] = useState("card");
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
  const [payConfirmOpen, setPayConfirmOpen] = useState(false);
  const { currentRole } = useRole();
  const isCustomer = currentRole === "customer";
  const isAgency = currentRole === "agency_owner" || currentRole === "agency_staff";
  // Mock wallet balance for B2B precheck (real value will come from Cloud later).
  const walletBalance = isAgency ? 250000 : 1000000;

  const docType: "passport" = "passport";

  const [passengerForms, setPassengerForms] = useState<PassengerForm[]>(() =>
    passengerLabels.map((passenger) => createPassengerForm(passenger.type, passenger.label)),
  );
  const [expandedPassengers, setExpandedPassengers] = useState<Set<number>>(() => new Set(passengerLabels.map((_, index) => index)));

  // Contact
  const [email, setEmail] = useState("");
  const [phoneCode, setPhoneCode] = useState("+92");
  const [phone, setPhone] = useState("");
  const [altPhoneCode, setAltPhoneCode] = useState("+92");
  const [altPhone, setAltPhone] = useState("");

  // Validation touch tracking
  const [touched, setTouched] = useState(false);

  const requiresPassport = true;

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

  const passengerDocValid = (passenger: PassengerForm) => {
    if (requiresPassport) return /^[A-Z0-9]{6,12}$/i.test(passenger.docNumber);
    return /^\d{13}$/.test(passenger.docNumber.replace(/-/g, ""));
  };

  const passengerComplete = (passenger: PassengerForm) => Boolean(
    passenger.firstName.trim() &&
    passenger.lastName.trim() &&
    passenger.dob &&
    passenger.docNumber.trim() &&
    passengerDocValid(passenger) &&
    (!requiresPassport || passenger.expiryDate),
  );

  const togglePassengerExpanded = (index: number) => {
    setExpandedPassengers((current) => {
      const next = new Set(current);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  useEffect(() => {
    setExpandedPassengers((current) => {
      const next = new Set(current);
      passengerForms.forEach((passenger, index) => {
        if (passengerComplete(passenger)) next.delete(index);
        else next.add(index);
      });
      return next;
    });
  }, [passengerForms]);

  const toggleAddon = (id: string) => {
    setSelectedAddons(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const seatFee = 0;
  const addonsTotal = addons.filter(a => selectedAddons.includes(a.id)).reduce((sum, a) => sum + a.price, 0) + seatFee;
  const baseTotal = isFlight ? productCtx.base * passengerTotal : productCtx.base;
  const taxes = 0;
  const grandTotal = baseTotal + addonsTotal + taxes;
  const displayAmount = (amount: number) => convertCurrencyAmount(amount, sourceCurrency, displayCurrency);
  const formatMoney = (amount: number) => `${displayCurrency} ${Math.round(displayAmount(amount)).toLocaleString()}`;

  // Validation
  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const phoneValid = /^\d{6,15}$/.test(phone);
  const altPhoneValid = altPhone === "" || /^\d{6,15}$/.test(altPhone);
  const errors = useMemo(() => {
    const e: Record<string, string> = {};
    passengerForms.forEach((passenger, index) => {
      if (!passenger.firstName.trim()) e[`passenger-${index}-firstName`] = "First name is required";
      if (!passenger.lastName.trim()) e[`passenger-${index}-lastName`] = "Last name is required";
      if (!passenger.dob) e[`passenger-${index}-dob`] = "Date of birth is required";
      if (!passenger.docNumber.trim()) e[`passenger-${index}-docNumber`] = `${requiresPassport ? "Passport" : "CNIC"} number is required`;
      else if (!passengerDocValid(passenger)) e[`passenger-${index}-docNumber`] = requiresPassport
        ? "Enter a valid passport number (6-12 letters/digits)"
        : "Enter a valid 13-digit CNIC";
      if (requiresPassport && !passenger.expiryDate) e[`passenger-${index}-expiryDate`] = "Expiry date is required";
    });
    if (email.trim() && !emailValid) e.email = "Enter a valid email address";
    if (!phone.trim()) e.phone = "Mobile number is required";
    else if (!phoneValid) e.phone = "Enter a valid numeric phone (6-15 digits)";
    if (!altPhoneValid) e.altPhone = "Enter a valid numeric phone (6-15 digits)";
    return e;
  }, [passengerForms, requiresPassport, email, emailValid, phone, phoneValid, altPhoneValid]);

  const isStep1Valid = Object.keys(errors).length === 0;

  const handleContinue = () => {
    setTouched(true);
    if (!isStep1Valid) return;
    if (recheckAccepted) { setStep(2); return; }
    // Fare recheck interstitial: deterministic mock based on flight + total so behaviour is testable.
    setRecheckLoading(true);
    setRecheckOpen(true);
    const seed = `${ctxFlightNo}-${grandTotal}-${passengerTotal}`;
    let hash = 0;
    for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
    const willChange = (hash % 100) < 15; // 15% mocked recheck change
    window.setTimeout(() => {
      setRecheckLoading(false);
      if (willChange) {
        setRecheckResult({ oldPrice: grandTotal, newPrice: Math.round(grandTotal * 1.02) });
      } else {
        setRecheckResult(null);
        setRecheckAccepted(true);
        setRecheckOpen(false);
        setStep(2);
      }
    }, 1200);
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
        setPassengerForms(draft.passengerForms);
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

  const saveProgress = () => {
    try {
      localStorage.setItem(draftKey, JSON.stringify({
        passengerForms,
        email,
        phoneCode,
        phone,
        altPhoneCode,
        altPhone,
        savedAt: new Date().toISOString(),
      }));
      toast({
        title: "Progress saved",
        description: "This booking draft is saved on this device.",
      });
    } catch {
      toast({
        title: "Unable to save draft",
        description: "Browser storage is unavailable. Please keep this page open.",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [step]);

  // Numeric-only phone handler
  const onPhoneChange = (setter: (v: string) => void) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setter(e.target.value.replace(/[^\d]/g, ""));
  };

  if (productCtx.type !== "flight") {
    return <ServiceBookingRequest productCtx={productCtx} />;
  }

  // Payment validation (card only)
  const cardNumberValid = cardNumber.replace(/\s/g, "").length >= 13 && /^\d+$/.test(cardNumber.replace(/\s/g, ""));
  const cardExpiryValid = /^(0[1-9]|1[0-2])\/\d{2}$/.test(cardExpiry);
  const cardCvvValid = /^\d{3,4}$/.test(cardCvv);
  const cardNameValid = cardName.trim().length >= 3;
  const paymentValid = paymentMethod !== "card" || (cardNumberValid && cardExpiryValid && cardCvvValid && cardNameValid);

  const requestPay = () => {
    setPaymentTouched(true);
    if (!paymentValid) return;
    setPayConfirmOpen(true);
  };

  const handlePay = async () => {
    setPayConfirmOpen(false);
    await persistBooking({
      status: "pending_payment",
      paymentMethod,
      paymentStatus: "pending",
      toastTitle: "Payment request saved",
      toastDescription: "Travelian has saved this booking and will complete payment processing from the admin panel.",
    });
  };

  const buildTravelers = (): BookingTraveler[] => {
    return passengerForms.map((passenger) => ({
      passengerType: passenger.passengerType,
      title: passenger.title,
      firstName: passenger.firstName.trim(),
      lastName: passenger.lastName.trim(),
      gender: passenger.gender,
      dob: passenger.dob ? format(passenger.dob, "yyyy-MM-dd") : undefined,
      docType,
      docNumber: passenger.docNumber,
      nationality: passenger.nationality,
      issuanceCountry: passenger.issuanceCountry,
      expiryDate: passenger.expiryDate ? format(passenger.expiryDate, "yyyy-MM-dd") : undefined,
    }));
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
  }) => {
    setTouched(true);
    if (!isStep1Valid) {
      setStep(1);
      return;
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
          description: "The admin database save did not complete. Please retry if it does not appear in the admin panel.",
          variant: "destructive",
        });
      }
      setSavedBooking(saved);
      setStep(4);
      toast({
        title: toastTitle,
        description: toastDescription,
      });
    } finally {
      setProcessing(false);
    }
  };

  const handleHoldBooking = async () => {
    await persistBooking({
      status: "held",
      paymentMethod: "hold",
      paymentStatus: "unpaid",
      toastTitle: "Booking held",
      toastDescription: "Payment is not required yet. Travelian can process this booking from the booking queue.",
    });
  };
  const formatCardNumber = (v: string) => v.replace(/\D/g, "").slice(0, 19).replace(/(.{4})/g, "$1 ").trim();
  const formatExpiry = (v: string) => {
    const d = v.replace(/\D/g, "").slice(0, 4);
    return d.length > 2 ? `${d.slice(0, 2)}/${d.slice(2)}` : d;
  };

  const backLink: string = isFlight
    ? "/flights-search"
    : (productCtx.type as string) === "hotel" ? "/hotels-search"
    : (productCtx.type as string) === "umrah" ? "/umrah-packages"
    : (productCtx.type as string) === "tour" ? "/tour-packages"
    : "/visa-services";

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
          <div className="flex items-center gap-2 mt-4">
            {steps.map((s, i) => (
              <div key={s.id} className="flex items-center gap-2 flex-1">
                <div className={`h-9 w-9 rounded-full flex items-center justify-center text-xs font-bold shrink-0 transition-all duration-300 ${
                  step >= s.id ? 'gradient-primary text-primary-foreground shadow-sm' : 'bg-muted text-muted-foreground'
                }`}>
                  {step > s.id ? <Check className="h-4 w-4" /> : s.id}
                </div>
                <span className={`text-xs font-medium hidden sm:block transition-colors ${step >= s.id ? 'text-foreground' : 'text-muted-foreground'}`}>
                  {s.label}
                </span>
                {i < steps.length - 1 && <div className={`h-0.5 flex-1 rounded transition-all ${step > s.id ? 'bg-primary' : 'bg-muted'}`} />}
              </div>
            ))}
          </div>
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
                    <h2 className="text-lg font-bold text-foreground mb-1">Traveler Information</h2>
                    <p className="text-sm text-muted-foreground mb-6">Enter details for each traveler exactly as shown on the identity document.</p>
                    <div className="grid gap-2 rounded-xl border bg-muted/30 p-3 text-xs text-muted-foreground sm:grid-cols-3">
                      <div><span className="font-semibold text-foreground">{adultCount}</span> Adult{adultCount === 1 ? "" : "s"}</div>
                      <div><span className="font-semibold text-foreground">{childCount}</span> Child{childCount === 1 ? "" : "ren"}</div>
                      <div><span className="font-semibold text-foreground">{infantCount}</span> Infant{infantCount === 1 ? "" : "s"}</div>
                    </div>
                  </CardContent>
                </Card>

                {passengerForms.map((passenger, index) => {
                  const isComplete = passengerComplete(passenger);
                  const isExpanded = expandedPassengers.has(index);
                  const passengerName = [passenger.title, passenger.firstName, passenger.lastName].filter(Boolean).join(" ");
                  const nameHelperId = `passenger-${index}-name-helper`;
                  const docHelperId = `passenger-${index}-document-helper`;
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
                          <Button type="button" variant="ghost" size="sm" onClick={() => togglePassengerExpanded(index)} className="h-8 gap-1 rounded-lg">
                            {isExpanded ? "Collapse" : "Edit"}
                            {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                          </Button>
                        </div>
                      </div>

                      <div className={isExpanded ? "grid grid-cols-1 md:grid-cols-2 gap-4" : "hidden"}>
                        <div>
                          <Label className="text-sm font-medium">Title *</Label>
                          <Select value={passenger.title} onValueChange={(value) => updatePassenger(index, { title: value })}>
                            <SelectTrigger className="mt-1.5 h-11 rounded-xl">
                              <SelectValue placeholder="Select title" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="mr">Mr</SelectItem>
                              <SelectItem value="ms">Ms</SelectItem>
                              <SelectItem value="mrs">Mrs</SelectItem>
                              <SelectItem value="master">Master</SelectItem>
                              <SelectItem value="miss">Miss</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label className="text-sm font-medium">Gender (Optional)</Label>
                          <Select value={passenger.gender} onValueChange={(value) => updatePassenger(index, { gender: value })}>
                            <SelectTrigger className="mt-1.5 h-11 rounded-xl">
                              <SelectValue placeholder="Select gender" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="male">Male</SelectItem>
                              <SelectItem value="female">Female</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label className="text-sm font-medium">First Name *</Label>
                          <Input
                            placeholder="Given Name"
                            className="mt-1.5 h-11 rounded-xl"
                            value={passenger.firstName}
                            onChange={e => updatePassenger(index, { firstName: e.target.value })}
                            aria-describedby={nameHelperId}
                          />
                          {touched && errors[`passenger-${index}-firstName`] && <p className="text-xs text-destructive mt-1">{errors[`passenger-${index}-firstName`]}</p>}
                        </div>
                        <div>
                          <Label className="text-sm font-medium">Last Name *</Label>
                          <Input
                            placeholder="Surnames"
                            className="mt-1.5 h-11 rounded-xl"
                            value={passenger.lastName}
                            onChange={e => updatePassenger(index, { lastName: e.target.value })}
                            aria-describedby={nameHelperId}
                          />
                          {touched && errors[`passenger-${index}-lastName`] && <p className="text-xs text-destructive mt-1">{errors[`passenger-${index}-lastName`]}</p>}
                        </div>
                        <p id={nameHelperId} className="md:col-span-2 -mt-2 text-xs text-muted-foreground">
                          Name must match exactly as shown on your {requiresPassport ? "passport" : "CNIC"}.
                        </p>

                        <div>
                          <Label className="text-sm font-medium">Date of Birth *</Label>
                          <div className="mt-1.5">
                            <AdvancedDatePicker
                              date={passenger.dob}
                              onSelect={(date) => updatePassenger(index, { dob: date })}
                              placeholder="Select date of birth"
                              fromYear={1925}
                              toYear={currentYear}
                              disabled={(d) => d > new Date()}
                            />
                          </div>
                          {touched && errors[`passenger-${index}-dob`] && <p className="text-xs text-destructive mt-1">{errors[`passenger-${index}-dob`]}</p>}
                        </div>
                        <div>
                          <Label className="text-sm font-medium">
                            {requiresPassport ? "Passport Number *" : "CNIC Number *"}
                          </Label>
                          <Input
                            placeholder={requiresPassport ? "e.g. AB1234567" : "e.g. 3520112345671"}
                            className="mt-1.5 h-11 rounded-xl"
                            value={passenger.docNumber}
                            onChange={e => updatePassenger(index, { docNumber: requiresPassport ? e.target.value.toUpperCase() : e.target.value.replace(/[^\d]/g, "") })}
                            maxLength={requiresPassport ? 12 : 13}
                            aria-describedby={docHelperId}
                          />
                          <p id={docHelperId} className="mt-1 text-xs text-muted-foreground">
                            {requiresPassport ? "Use the passport number without spaces." : "Use 13 digits without dashes."}
                          </p>
                          {touched && errors[`passenger-${index}-docNumber`] && <p className="text-xs text-destructive mt-1">{errors[`passenger-${index}-docNumber`]}</p>}
                        </div>
                        <div>
                          <Label className="text-sm font-medium">Nationality *</Label>
                          <div className="mt-1.5">
                            <CountryPicker value={passenger.nationality} onChange={(value) => updatePassenger(index, { nationality: value })} />
                          </div>
                        </div>
                        {requiresPassport && (
                          <>
                            <div>
                              <Label className="text-sm font-medium">Country of Issuance *</Label>
                              <div className="mt-1.5">
                                <CountryPicker value={passenger.issuanceCountry} onChange={(value) => updatePassenger(index, { issuanceCountry: value })} />
                              </div>
                            </div>
                            <div className="md:col-span-2">
                              <Label className="text-sm font-medium">Date of Expiry *</Label>
                              <div className="mt-1.5">
                                <AdvancedDatePicker
                                  date={passenger.expiryDate}
                                  onSelect={(date) => updatePassenger(index, { expiryDate: date })}
                                  placeholder="Select expiry date"
                                  fromYear={currentYear}
                                  toYear={currentYear + 25}
                                  disabled={(d) => d < new Date()}
                                />
                              </div>
                              {touched && errors[`passenger-${index}-expiryDate`] && <p className="text-xs text-destructive mt-1">{errors[`passenger-${index}-expiryDate`]}</p>}
                            </div>
                          </>
                        )}
                      </div>
                      {!isExpanded && (
                        <div className="rounded-2xl border bg-muted/30 p-4">
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <div>
                              <p className="text-sm font-bold text-foreground">{passengerName || passenger.label}</p>
                              <p className="text-xs text-muted-foreground">
                                {[passenger.docNumber || "Document pending", passenger.dob ? format(passenger.dob, "dd MMM yyyy") : "DOB pending"].join(" - ")}
                              </p>
                            </div>
                            <Button type="button" variant="outline" size="sm" onClick={() => togglePassengerExpanded(index)} className="rounded-lg">
                              Edit Details
                            </Button>
                          </div>
                        </div>
                      )}
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
                      <div className="md:col-span-2">
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
                      <div className="md:col-span-2">
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
                      <div className="md:col-span-2">
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
                  <p id="passport-match-hint" className="text-xs text-muted-foreground">Name must match exactly as shown on your {requiresPassport ? "passport" : "CNIC"}.</p>
                </div>
                <div className="grid gap-2 rounded-2xl border bg-card p-3 text-xs text-muted-foreground sm:grid-cols-3">
                  <span className="flex items-center gap-1.5"><Shield className="h-3.5 w-3.5 text-success" /> Secure SSL checkout</span>
                  <span className="flex items-center gap-1.5"><Lock className="h-3.5 w-3.5 text-success" /> Your card is not charged yet</span>
                  <span className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-success" /> Supplier verification before ticketing</span>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <Badge variant="outline" className="gap-1 rounded-full border-success/30 bg-success/10 px-2.5 py-1 text-success">
                      <Check className="h-3 w-3" /> Free cancellation until {format(addDays(new Date(), 1), "MMM d, HH:mm")}
                    </Badge>
                    <span className="text-muted-foreground">Refundable per supplier fare rules. Review terms before payment.</span>
                  </div>
                  <div className="flex flex-wrap justify-end gap-2">
                    <Button variant="ghost" onClick={saveProgress} disabled={processing} className="rounded-xl h-11 px-5">
                      Save & Continue Later
                    </Button>
                    {!isCustomer && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="outline" onClick={handleHoldBooking} disabled={processing} className="rounded-xl h-11 px-5">
                          Hold Booking
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs">
                        Free 24-hour PNR hold. We will contact you to confirm before charging.
                      </TooltipContent>
                    </Tooltip>
                    )}
                    <Button onClick={handleContinue} className="gradient-primary text-primary-foreground rounded-xl h-11 px-6">
                      Continue <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-6 animate-fade-in">
                <Card className="shadow-card border-0">
                  <CardContent className="p-6">
                    <h2 className="text-lg font-bold text-foreground mb-1">Review Booking</h2>
                    <p className="text-sm text-muted-foreground">
                      Seat selection and trip enhancements are paused for now. Continue to payment or hold this booking for admin follow-up.
                    </p>
                    {/*
                      Future seat and add-on UI:
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
                          <TooltipContent className="max-w-xs">
                            Free 24-hour PNR hold. Travelian can verify fare rules and confirm before payment.
                          </TooltipContent>
                        </Tooltip>
                        )}
                        <Button onClick={() => setStep(3)} className="gradient-primary text-primary-foreground rounded-xl h-11 px-6">
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
                      { id: "card", label: "Credit/Debit Card", icon: CreditCard, desc: "Available after gateway configuration", badges: ["Visa", "Mastercard"] as string[] },
                      { id: "wallet", label: "Digital Wallet", icon: Wallet, desc: "Available after wallet payment configuration", badges: ["JazzCash", "Easypaisa"] as string[] },
                      { id: "bank", label: "Bank Transfer", icon: Building2, desc: "Direct bank transfer", badges: [] as string[] },
                    ]).map(method => (
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

                  {paymentMethod === "card" && (
                    <div className="space-y-4 border-t pt-5">
                      <div>
                        <Label className="text-sm font-medium">Card Number *</Label>
                        <Input
                          inputMode="numeric"
                          placeholder="1234 5678 9012 3456"
                          className="mt-1.5 h-11 rounded-xl"
                          value={cardNumber}
                          onChange={e => setCardNumber(formatCardNumber(e.target.value))}
                        />
                        {paymentTouched && !cardNumberValid && <p className="text-xs text-destructive mt-1">Enter a valid card number</p>}
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label className="text-sm font-medium">Expiry *</Label>
                          <Input
                            placeholder="MM/YY"
                            className="mt-1.5 h-11 rounded-xl"
                            value={cardExpiry}
                            onChange={e => setCardExpiry(formatExpiry(e.target.value))}
                          />
                          {paymentTouched && !cardExpiryValid && <p className="text-xs text-destructive mt-1">MM/YY required</p>}
                        </div>
                        <div>
                          <Label className="text-sm font-medium">CVV *</Label>
                          <Input
                            inputMode="numeric"
                            placeholder="123"
                            maxLength={4}
                            className="mt-1.5 h-11 rounded-xl"
                            value={cardCvv}
                            onChange={e => setCardCvv(e.target.value.replace(/\D/g, ""))}
                          />
                          {paymentTouched && !cardCvvValid && <p className="text-xs text-destructive mt-1">3-4 digits</p>}
                        </div>
                      </div>
                      <div>
                        <Label className="text-sm font-medium">Cardholder Name *</Label>
                        <Input
                          placeholder="Name on card"
                          className="mt-1.5 h-11 rounded-xl"
                          value={cardName}
                          onChange={e => setCardName(e.target.value)}
                        />
                        {paymentTouched && !cardNameValid && <p className="text-xs text-destructive mt-1">Cardholder name required</p>}
                      </div>
                      <p className="text-xs text-muted-foreground">Online card payment will be enabled after the payment gateway is connected.</p>
                    </div>
                  )}

                  <div className="flex items-start gap-2 mt-5 p-3 bg-success/5 rounded-xl border border-success/20">
                    <Lock className="h-4 w-4 text-success shrink-0 mt-0.5" />
                    <p className="text-xs text-muted-foreground">Online payment remains unavailable until the payment gateway configuration is complete.</p>
                  </div>

                  <div className="flex justify-between mt-6">
                    <Button variant="outline" onClick={() => setStep(2)} className="rounded-xl" disabled={processing}>Back</Button>
                    <div className="flex flex-wrap justify-end gap-2">
                      {!isCustomer && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="outline" onClick={handleHoldBooking} disabled={processing} className="rounded-xl h-11 px-5">
                            {isFlight ? "Book Only" : "Request Without Payment"}
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs">
                          Creates a saved booking with payment pending. Ticketing starts only after payment or admin approval.
                        </TooltipContent>
                      </Tooltip>
                      )}
                      <Button onClick={requestPay} disabled={processing} className="gradient-primary text-primary-foreground rounded-xl h-11 px-6">
                        {processing ? "Processing..." : `${isCustomer ? "Pay & Book" : "Pay & Issue"} ${formatMoney(grandTotal)}`} <ChevronRight className="h-4 w-4 ml-1" />
                      </Button>
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
                  <h2 className="text-2xl font-bold text-foreground mb-2">{savedBooking.status === "held" ? "Booking Held" : "Booking Confirmed"}</h2>
                  <p className="text-muted-foreground mb-6">
                    {savedBooking.status === "held"
                      ? "Your booking request has been saved with payment pending. Travelian will process payment and ticketing next."
                      : "Your reservation has been successfully processed."}
                  </p>

                  <div className="bg-gradient-to-br from-primary/5 to-accent border rounded-2xl p-6 text-left max-w-lg mx-auto">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-lg gradient-primary flex items-center justify-center">
                          <Plane className="h-4 w-4 text-primary-foreground" />
                        </div>
                        <span className="font-bold text-sm">Travelian E-Ticket</span>
                      </div>
                      <Badge className="bg-success/10 text-success border-0 text-xs rounded-md">{savedBooking.status === "held" ? "Held" : "Confirmed"}</Badge>
                    </div>
                    <div className="space-y-3">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">PNR</span>
                        <span className="font-bold font-mono text-foreground">{savedBooking.pnr}</span>
                      </div>
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
                      <Download className="h-4 w-4" /> Download Receipt
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
                <div className="mb-4 flex gap-3 border-b pb-4">
                  <div className="shrink-0">
                    {isFlight ? (
                      <AirlineLogo airline={ctxAirline || productCtx.title} flightNumber={ctxFlightNo} />
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
                                <p className="text-[11px] text-muted-foreground">{bookingShortDate(segment.departureTime)}</p>
                              </div>
                              <div className="flex min-w-[86px] flex-col items-center">
                                <div className="mb-1 text-[10px] font-semibold text-primary">{segment.flightNumber || "Flight TBA"}</div>
                                <div className="h-px w-full bg-border" />
                                <Plane className="-mt-2 h-4 w-4 rotate-90 text-primary" />
                              </div>
                              <div className="text-right">
                                <p className="text-lg font-black text-foreground">{bookingTime(segment.arrivalTime)}</p>
                                <p className="font-bold text-foreground">{segment.destination || "Destination TBA"}</p>
                                <p className="text-[11px] text-muted-foreground">{bookingShortDate(segment.arrivalTime)}</p>
                              </div>
                            </div>
                            {ctxLayovers[index] && (
                              <div className="my-3 rounded-full bg-primary/10 px-3 py-1 text-center text-[11px] font-semibold text-primary">
                                Layover in {ctxLayovers[index].location || "connection"} &bull; {ctxLayovers[index].duration || "Duration TBA"}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                    {(totalDuration || ctxSegments.length > 0) && (
                      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t pt-3 text-xs font-semibold text-slate-700">
                        {totalDuration && <span>Total Duration: {totalDuration}</span>}
                        <span>{stopSummary}</span>
                      </div>
                    )}
                  </div>
                )}
                <div className="rounded-2xl border bg-white p-3 text-sm">
                  <p className="mb-2 font-bold text-foreground">Fare Summary</p>
                  {sourceCurrencyLabel && <p className="mb-2 text-[11px] text-muted-foreground">{sourceCurrencyLabel}</p>}
                  {isFlight && passengerTotal > 1 && (
                    <p className="mb-1 text-[11px] text-muted-foreground">{passengerSummary} · fares shown for the whole party</p>
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
                    <div className="mt-3 rounded-xl border border-primary/10 bg-accent/40 p-3 text-[11px] text-muted-foreground">
                      <p className="flex items-start gap-1.5 font-semibold text-foreground">
                        <Info className="mt-0.5 h-3.5 w-3.5 text-primary" />
                        Fare rules summary
                      </p>
                      <p className="mt-1">Includes 7kg carry-on.</p>
                      <p className="mt-1">Free cancellation until {format(addDays(new Date(), 1), "MMM d, HH:mm")}.</p>
                      <p className="mt-1">Refundability and change fees follow supplier fare rules and are verified before ticketing.</p>
                      {fareSplitIsEstimated && <p className="mt-1">Base/tax split is estimated until the supplier confirms the fare.</p>}
                    </div>
                  )}
                  <div className="mt-2 flex justify-between border-t pt-2 text-base font-black">
                    <span>Total</span>
                    <span className="text-primary">{formatMoney(grandTotal)}</span>
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Badge variant="outline" className="gap-1 rounded-full px-2.5 py-1 text-[11px]"><Shield className="h-3 w-3 text-success" /> Live Supplier Fare</Badge>
                  <Badge variant="outline" className="gap-1 rounded-full px-2.5 py-1 text-[11px]"><Lock className="h-3 w-3 text-success" /> Instant Verification</Badge>
                  <Badge variant="outline" className="rounded-full px-2.5 py-1 text-[11px]">{passengerSummary}</Badge>
                  <Badge variant="outline" className="rounded-full px-2.5 py-1 text-[11px]">{ctxCabin}</Badge>
                  {ctxFarePerks.slice(0, 4).map((perk) => (
                    <Badge key={perk} variant="outline" className="gap-1 rounded-full px-2.5 py-1 text-[11px]"><Check className="h-3 w-3 text-success" /> {perk}</Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
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

interface PassengerForm {
  passengerType: "adult" | "child" | "infant";
  label: string;
  title: string;
  firstName: string;
  lastName: string;
  gender: string;
  dob?: Date;
  docNumber: string;
  nationality: string;
  issuanceCountry: string;
  expiryDate?: Date;
}

function createPassengerForm(passengerType: PassengerForm["passengerType"], label: string): PassengerForm {
  return {
    passengerType,
    label,
    title: passengerType === "adult" ? "mr" : "master",
    firstName: "",
    lastName: "",
    gender: "",
    docNumber: "",
    nationality: "Pakistan",
    issuanceCountry: "Pakistan",
  };
}

function ServiceBookingRequest({ productCtx }: { productCtx: ProductCtx }) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [touched, setTouched] = useState(false);
  const [saved, setSaved] = useState<BookingRecord | null>(null);
  const [saving, setSaving] = useState(false);
  const backLink = productCtx.type === "umrah" ? "/umrah-packages" : productCtx.type === "tour" ? "/tour-packages" : "/visa-services";
  const formatMoney = (amount: number) => `${productCtx.currency || "PKR"} ${Math.round(amount).toLocaleString()}`;
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
        title: "Request submitted",
        description: "Travelian has received your request and will contact you shortly.",
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
                  <h1 className="text-2xl font-black text-foreground">Request received</h1>
                  <p className="mx-auto mt-2 max-w-xl text-sm text-muted-foreground">
                    Your {productCtx.type} request is saved with reference {saved.id}. Travelian will contact you on {cleanPhone}.
                  </p>
                  <div className="mt-6 flex flex-wrap justify-center gap-2">
                    <Link to="/my-bookings"><Button className="rounded-xl">View Requests</Button></Link>
                    <Link to={backLink}><Button variant="outline" className="rounded-xl">Back</Button></Link>
                  </div>
                </div>
              ) : (
                <>
                  <h1 className="text-2xl font-black text-foreground">Request booking</h1>
                  <p className="mt-1 text-sm text-muted-foreground">Only your contact details are required at this stage. Travelian will confirm availability, documents and payment next.</p>
                  <div className="mt-6 grid gap-4">
                    <div>
                      <Label>Name *</Label>
                      <Input value={name} onChange={(event) => setName(event.target.value)} className="mt-1.5 h-11 rounded-xl" placeholder="Your full name" />
                      {touched && !name.trim() && <p className="mt-1 text-xs text-destructive">Name is required</p>}
                    </div>
                    <div>
                      <Label>Phone number *</Label>
                      <Input value={phone} onChange={(event) => setPhone(event.target.value)} className="mt-1.5 h-11 rounded-xl" placeholder="+92 300 1234567" />
                      {touched && cleanPhone.replace(/\D/g, "").length < 7 && <p className="mt-1 text-xs text-destructive">Valid phone number is required</p>}
                    </div>
                    <div>
                      <Label>Email</Label>
                      <Input type="email" value={email} onChange={(event) => setEmail(event.target.value)} className="mt-1.5 h-11 rounded-xl" placeholder="Optional email" />
                    </div>
                  </div>
                  <Button onClick={handleSubmit} disabled={saving} className="mt-6 h-11 rounded-xl gradient-primary text-primary-foreground">
                    {saving ? "Submitting..." : "Submit Request"}
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
