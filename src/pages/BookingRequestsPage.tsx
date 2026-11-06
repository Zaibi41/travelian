import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { endOfDay, format, startOfDay } from "date-fns";
import { Bell, CalendarDays, ClipboardCheck, Download, Eye, FileText, Loader2, MoreHorizontal, Search, ArrowUpDown, PencilLine, SlidersHorizontal, X } from "lucide-react";
import type { DateRange } from "react-day-picker";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { EmptyState } from "@/components/EmptyState";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import type { BookingRequest, BookingRequestStatus, TravelTicket } from "@/data/models";
import { listBookingRequests, updateBookingRequest } from "@/lib/booking-request-api";
import type { BookingRecord } from "@/lib/booking-store";
import { downloadETicket } from "@/lib/eticket-pdf";
import { downloadTicketInvoice } from "@/lib/ticket-invoice-pdf";
import { bookingReportPeriods, filterRecordsByPeriod, type BookingReportPeriod } from "@/lib/booking-report-period";
import { INITIAL_PROVIDERS } from "@/lib/provider-systems";

const statusOptions: { value: BookingRequestStatus; label: string }[] = [
  { value: "new", label: "New" },
  { value: "contacted", label: "Contacted" },
  { value: "in_progress", label: "In Progress" },
  { value: "waiting_for_documents", label: "Waiting for Documents" },
  { value: "payment_pending", label: "Payment Pending" },
  { value: "confirmed", label: "Confirmed" },
  { value: "cancelled_lost", label: "Cancelled / Lost" },
];

const flightGroupStatusOptions: { value: BookingRequestStatus; label: string }[] = [
  { value: "issued", label: "Issued" },
  { value: "pending", label: "Pending" },
  { value: "expired", label: "Expired" },
  { value: "refund", label: "Refund" },
  { value: "cancel", label: "Cancel" },
];

const bookingActions: { value: BookingRequestStatus; label: string }[] = [
  { value: "pending", label: "Mark pending" },
  { value: "issued", label: "Mark issued" },
  { value: "refund", label: "Refund review" },
  { value: "cancel", label: "Mark cancelled" },
  { value: "expired", label: "Mark expired" },
];

const requestTabs = [
  { value: "flights", label: "Flights" },
  { value: "group", label: "Group Ticketing" },
  { value: "hotels", label: "Hotels" },
  { value: "umrah", label: "Umrah" },
] as const;

const requestPeriodValues = new Set<BookingReportPeriod>([
  "all",
  "today",
  "yesterday",
  "last-week",
  "this-month",
  "last-month",
]);
const requestPeriodOptions = bookingReportPeriods.filter(option => requestPeriodValues.has(option.value));

type RequestTab = typeof requestTabs[number]["value"];
type RequestPeriod = BookingReportPeriod | "custom";

const STAFF_PICKER = ["Asad", "Maira", "Fahad", "Bilal"];
const DEMO_REQUEST_PREFIX = "DEMO-";
const demoBookingAmounts: Record<string, number> = {
  "DEMO-FLT-1001": 275000,
  "DEMO-FLT-1002": 412500,
  "DEMO-FLT-1003": 198000,
  "DEMO-GRP-2001": 3150000,
  "DEMO-GRP-2002": 4875000,
  "DEMO-GRP-2003": 5920000,
  "DEMO-HTL-3001": 285000,
  "DEMO-HTL-3002": 164000,
  "DEMO-HTL-3003": 218000,
};
const demoPaymentStatuses: Record<string, "paid" | "unpaid"> = {
  "DEMO-FLT-1001": "unpaid",
  "DEMO-FLT-1002": "paid",
  "DEMO-FLT-1003": "paid",
  "DEMO-GRP-2001": "unpaid",
  "DEMO-GRP-2002": "paid",
  "DEMO-GRP-2003": "unpaid",
  "DEMO-HTL-3001": "unpaid",
  "DEMO-HTL-3002": "paid",
  "DEMO-HTL-3003": "unpaid",
};
const demoTravelerIssuanceDates: Record<string, string> = {
  "TRV-1001-1": "2021-08-21",
  "TRV-1001-2": "2020-05-15",
  "TRV-1001-3": "2022-02-07",
  "TRV-1001-4": "2019-11-04",
  "TRV-1001-5": "2018-07-26",
};

function bookingAmount(item: BookingRequest) {
  return item.amount ?? demoBookingAmounts[item.requestId];
}

function formatBookingAmount(item: BookingRequest) {
  const amount = bookingAmount(item);
  return typeof amount === "number" ? `Rs ${amount.toLocaleString()}` : "—";
}

function bookingPaymentStatus(item: BookingRequest) {
  return item.paymentStatus ?? demoPaymentStatuses[item.requestId];
}

function bookingRecordForDownload(item: BookingRequest): BookingRecord | null {
  if (!item.pnr || !item.flightDetails) return null;
  const amount = bookingAmount(item) || 0;
  const travelers = item.travelers?.length
    ? item.travelers.map(traveler => ({
      passengerType: traveler.passengerType,
      title: traveler.title || "",
      firstName: traveler.firstName,
      lastName: traveler.lastName,
      dob: traveler.dateOfBirth,
      docType: traveler.identityDocumentType === "id_card" ? "cnic" as const : "passport" as const,
      docNumber: traveler.identityDocumentNumber || "—",
      expiryDate: traveler.identityDocumentExpiry,
    }))
    : [{ title: "", firstName: item.customerName, lastName: "", docType: "passport" as const, docNumber: "—" }];
  return {
    id: item.requestId,
    pnr: item.pnr,
    provider: item.provider,
    type: "flight",
    status: item.status === "issued" ? "ticket_issued" : item.status === "expired" ? "expired" : item.status === "cancel" ? "cancelled" : "confirmed",
    createdAt: item.createdAt,
    flight: {
      airline: item.flightDetails.airline || "—",
      flightNumber: item.flightDetails.flightNumber || "—",
      from: item.flightDetails.originCity || item.flightDetails.originCode || "—",
      fromCode: item.flightDetails.originCode,
      to: item.flightDetails.destinationCity || item.flightDetails.destinationCode || "—",
      toCode: item.flightDetails.destinationCode,
      date: item.flightDetails.departureAt || "",
      departTime: item.flightDetails.departureAt,
      arriveTime: item.flightDetails.arrivalAt,
      duration: item.flightDetails.duration,
      cabin: item.flightDetails.cabinClass,
    },
    travelers,
    contact: { email: item.email, phone: item.phone },
    addons: [],
    paymentMethod: "",
    paymentStatus: bookingPaymentStatus(item),
    ticketStatus: item.status === "issued" ? "issued" : "not_issued",
    holdExpiresAt: item.expiresAt,
    pricing: { base: amount, addons: 0, taxes: 0, total: amount, currency: "PKR" },
  };
}

function ticketForInvoice(item: BookingRequest): TravelTicket | null {
  if (!item.pnr || !item.flightDetails) return null;
  const traveler = item.travelers?.[0];
  const amount = bookingAmount(item) || 0;
  return {
    ticketId: item.requestId,
    bookingId: item.requestId,
    passengerName: traveler ? `${traveler.firstName} ${traveler.lastName}` : item.customerName,
    type: "flight",
    origin: item.flightDetails.originCode || "—",
    destination: item.flightDetails.destinationCode || "—",
    departureDate: item.flightDetails.departureAt || "",
    arrivalDate: item.flightDetails.arrivalAt,
    departureTime: item.flightDetails.departureAt,
    arrivalTime: item.flightDetails.arrivalAt,
    seatNumber: "",
    status: item.status === "issued" ? "issued" : item.status === "cancel" ? "cancelled" : "pending",
    price: amount,
    ticketNumber: traveler?.ticketNumber || item.pnr,
    pnr: item.pnr,
    airline: item.flightDetails.airline,
    flightNumber: item.flightDetails.flightNumber,
    firstName: traveler?.firstName,
    lastName: traveler?.lastName,
    passengerType: traveler ? (traveler.passengerType === "child" ? "Child" : traveler.passengerType === "infant" ? "Infant" : "Adult") : undefined,
    dateOfBirth: traveler?.dateOfBirth,
    passportNumber: traveler?.identityDocumentNumber,
    passportExpiry: traveler?.identityDocumentExpiry,
    originCity: item.flightDetails.originCity,
    destinationCity: item.flightDetails.destinationCity,
    duration: item.flightDetails.duration,
    cabinClass: item.flightDetails.cabinClass,
    baseFare: amount,
    tax: 0,
    invoiceNumber: `INV-${item.requestId.replace(/[^a-z0-9]/gi, "").slice(-8).toUpperCase()}`,
    customerEmail: item.email,
    customerPhone: item.phone,
    source: "admin_manual",
    createdAt: item.createdAt,
  };
}

function demoCreatedAt(daysAgo: number, hour: number) {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  date.setHours(hour, 15, 0, 0);
  return date.toISOString();
}

function demoExpiresAt(hoursFromNow: number) {
  const date = new Date();
  date.setHours(date.getHours() + hoursFromNow);
  return date.toISOString();
}

const demoBookingRequests: BookingRequest[] = [
  { requestId: "DEMO-FLT-1001", type: "manual_flight", pnr: "TR7K2P", provider: "sooperfare", packageName: "Lahore → Dubai · One-way", flightDetails: { originCode: "LHE", originCity: "Lahore", destinationCode: "DXB", destinationCity: "Dubai", tripType: "One-way", airline: "Airblue", flightNumber: "PA-410", duration: "3h 25m", baggage: "30 kg", cabinClass: "Economy", departureAt: "2026-11-03T08:30:00+05:00", arrivalAt: "2026-11-03T10:55:00+04:00", passengers: 5 }, bookerIsTraveler: true, travelers: [{ travelerId: "TRV-1001-1", firstName: "Ahmed", lastName: "Raza", passengerType: "adult", dateOfBirth: "1988-04-12", identityDocumentType: "passport", identityDocumentNumber: "PK1234567", identityDocumentExpiry: "2031-08-20", ticketNumber: "PA-410-001" }, { travelerId: "TRV-1001-2", firstName: "Sara", lastName: "Raza", passengerType: "adult", dateOfBirth: "1990-09-23", identityDocumentType: "passport", identityDocumentNumber: "PK2345678", identityDocumentExpiry: "2030-05-14", ticketNumber: "PA-410-002" }, { travelerId: "TRV-1001-3", firstName: "Hina", lastName: "Raza", passengerType: "adult", dateOfBirth: "1994-02-07", identityDocumentType: "id_card", identityDocumentNumber: "35202-1234567-8", identityDocumentExpiry: "2032-02-06", ticketNumber: "PA-410-003" }, { travelerId: "TRV-1001-4", firstName: "Ali", lastName: "Raza", passengerType: "child", dateOfBirth: "2016-06-18", identityDocumentType: "passport", identityDocumentNumber: "PK3456789", identityDocumentExpiry: "2029-11-03", ticketNumber: "PA-410-004" }, { travelerId: "TRV-1001-5", firstName: "Zoya", lastName: "Raza", passengerType: "child", dateOfBirth: "2019-01-30", identityDocumentType: "passport", identityDocumentNumber: "PK4567890", identityDocumentExpiry: "2028-07-25", ticketNumber: "PA-410-005" }], customerName: "Ahmed Raza", phone: "+92 300 1112233", email: "ahmed@example.com", status: "pending", assignedStaff: "Asad", expiresAt: demoExpiresAt(5), createdAt: demoCreatedAt(0, 10) },
  { requestId: "DEMO-FLT-1002", type: "manual_flight", pnr: "Q8M4LX", provider: "travelport", packageName: "Islamabad → Jeddah · Round-trip", flightDetails: { originCode: "ISB", originCity: "Islamabad", destinationCode: "JED", destinationCity: "Jeddah", tripType: "Round-trip", airline: "Pakistan International Airlines", flightNumber: "PK-741", duration: "5h 15m", baggage: "40 kg", cabinClass: "Economy", departureAt: "2026-11-06T10:20:00+05:00", arrivalAt: "2026-11-06T13:35:00+03:00", passengers: 2 }, customerName: "Sana Malik", phone: "+92 301 2223344", email: "sana@example.com", status: "issued", assignedStaff: "Maira", expiresAt: demoExpiresAt(18), createdAt: demoCreatedAt(1, 14) },
  { requestId: "DEMO-FLT-1003", type: "manual_flight", pnr: "V2HF9A", provider: "sooperfare", packageName: "Karachi → Istanbul · One-way", flightDetails: { originCode: "KHI", originCity: "Karachi", destinationCode: "IST", destinationCity: "Istanbul", tripType: "One-way", airline: "Turkish Airlines", flightNumber: "TK-709", duration: "6h 05m", baggage: "30 kg", cabinClass: "Economy", departureAt: "2026-11-08T06:10:00+05:00", arrivalAt: "2026-11-08T10:15:00+03:00", passengers: 1 }, customerName: "Usman Ali", phone: "+92 302 3334455", status: "refund", assignedStaff: "Fahad", expiresAt: demoExpiresAt(-10), createdAt: demoCreatedAt(4, 9) },
  { requestId: "DEMO-GRP-2001", type: "group", pnr: "GRP18J", provider: "skypass", packageName: "Lahore → Jeddah · 18 seats", flightDetails: { originCode: "LHE", originCity: "Lahore", destinationCode: "JED", destinationCity: "Jeddah", tripType: "One-way", airline: "AirSial", flightNumber: "PF-786", duration: "5h 20m", baggage: "30 kg", cabinClass: "Economy", departureAt: "2026-11-12T09:00:00+05:00", arrivalAt: "2026-11-12T12:20:00+03:00", seats: 18 }, customerName: "Al Noor Travels", phone: "+92 303 4445566", email: "sales@alnoor.example", status: "pending", assignedStaff: "Bilal", expiresAt: demoExpiresAt(8), createdAt: demoCreatedAt(0, 11) },
  { requestId: "DEMO-GRP-2002", type: "group", pnr: "GRP25M", provider: "alhaider", packageName: "Islamabad → Madinah · 25 seats", flightDetails: { originCode: "ISB", originCity: "Islamabad", destinationCode: "MED", destinationCity: "Madinah", tripType: "One-way", airline: "Pakistan International Airlines", flightNumber: "PK-713", duration: "5h 10m", baggage: "40 kg", cabinClass: "Economy", departureAt: "2026-11-15T11:30:00+05:00", arrivalAt: "2026-11-15T14:40:00+03:00", seats: 25 }, customerName: "Rahman Tours", phone: "+92 304 5556677", status: "issued", assignedStaff: "Asad", expiresAt: demoExpiresAt(22), createdAt: demoCreatedAt(2, 15) },
  { requestId: "DEMO-GRP-2003", type: "group", pnr: "GRP32K", provider: "dhilluandsahi", packageName: "Karachi → Jeddah · 32 seats", flightDetails: { originCode: "KHI", originCity: "Karachi", destinationCode: "JED", destinationCity: "Jeddah", tripType: "One-way", airline: "SereneAir", flightNumber: "ER-811", duration: "4h 45m", baggage: "30 kg", cabinClass: "Economy", departureAt: "2026-11-20T07:45:00+05:00", arrivalAt: "2026-11-20T10:30:00+03:00", seats: 32 }, customerName: "Haramain Services", phone: "+92 305 6667788", status: "expired", expiresAt: demoExpiresAt(-24), createdAt: demoCreatedAt(8, 12) },
  { requestId: "DEMO-HTL-3001", type: "hotel", provider: "travelport-hotels", packageName: "Makkah · 5 nights · 2 rooms", customerName: "Faisal Khan", phone: "+92 306 7778899", email: "faisal@example.com", status: "pending", assignedStaff: "Maira", expiresAt: demoExpiresAt(12), createdAt: demoCreatedAt(0, 13) },
  { requestId: "DEMO-HTL-3002", type: "hotel", provider: "travelport-hotels", packageName: "Dubai · 3 nights · 1 room", customerName: "Hira Saeed", phone: "+92 307 8889900", status: "issued", assignedStaff: "Fahad", expiresAt: demoExpiresAt(30), createdAt: demoCreatedAt(3, 16) },
  { requestId: "DEMO-HTL-3003", type: "hotel", packageName: "Madinah · 4 nights · 2 rooms", customerName: "Bilal Ahmed", phone: "+92 308 9990011", status: "cancel", expiresAt: demoExpiresAt(-48), createdAt: demoCreatedAt(10, 10) },
  { requestId: "DEMO-UMR-4001", type: "umrah", provider: "Travelian", packageId: "umrah-economy-14", packageName: "Economy Umrah · 14 days", customerName: "Nadia Iqbal", phone: "+92 309 1001122", email: "nadia@example.com", status: "new", assignedStaff: "Bilal", createdAt: demoCreatedAt(0, 9) },
  { requestId: "DEMO-UMR-4002", type: "umrah", provider: "Travelian", packageId: "umrah-family-21", packageName: "Family Umrah · 21 days", customerName: "Imran Shah", phone: "+92 310 2112233", status: "in_progress", assignedStaff: "Asad", createdAt: demoCreatedAt(2, 11) },
  { requestId: "DEMO-UMR-4003", type: "umrah", packageId: "umrah-premium-10", packageName: "Premium Umrah · 10 days", customerName: "Ayesha Tariq", phone: "+92 311 3223344", status: "waiting_for_documents", assignedStaff: "Maira", createdAt: demoCreatedAt(6, 14) },
];

function withMissingSectionDemos(items: BookingRequest[]) {
  const missingTypes = new Set<RequestTab>();
  if (!items.some(item => item.type === "manual_flight")) missingTypes.add("flights");
  if (!items.some(item => item.type === "group")) missingTypes.add("group");
  if (!items.some(item => item.type === "hotel")) missingTypes.add("hotels");
  if (!items.some(item => item.type === "umrah" || item.type === "package")) missingTypes.add("umrah");

  return [
    ...items,
    ...demoBookingRequests.filter(item =>
      (item.type === "manual_flight" && missingTypes.has("flights"))
      || (item.type === "group" && missingTypes.has("group"))
      || (item.type === "hotel" && missingTypes.has("hotels"))
      || ((item.type === "umrah" || item.type === "package") && missingTypes.has("umrah"))),
  ];
}

function statusLabel(value: BookingRequestStatus) {
  return [...statusOptions, ...flightGroupStatusOptions].find(option => option.value === value)?.label || value;
}

function usesBookingStatuses(item: Pick<BookingRequest, "type">) {
  return item.type === "manual_flight" || item.type === "group" || item.type === "hotel";
}

function statusOptionsFor(item: Pick<BookingRequest, "type">) {
  return usesBookingStatuses(item) ? flightGroupStatusOptions : statusOptions;
}

function requestTypeLabel(type: BookingRequest["type"]) {
  if (type === "manual_flight") return "Flight";
  if (type === "group") return "Group Ticketing";
  if (type === "hotel") return "Hotel";
  if (type === "umrah" || type === "package") return "Umrah";
  return type.replace(/_/g, " ").replace(/\b\w/g, letter => letter.toUpperCase());
}

function ageDays(createdAt: string) {
  const ms = Date.now() - new Date(createdAt).getTime();
  return Math.floor(ms / (1000 * 60 * 60 * 24));
}

function AgingBadge({ createdAt }: { createdAt: string }) {
  const days = ageDays(createdAt);
  if (days >= 5) return <Badge variant="destructive">{days}d old</Badge>;
  if (days >= 2) return <Badge className="bg-amber-500 text-white hover:bg-amber-500/90">{days}d old</Badge>;
  return <Badge variant="secondary">{days}d</Badge>;
}

function BookingDetailField({ label, children, className = "" }: { label: string; children: ReactNode; className?: string }) {
  return (
    <div className={`min-w-0 rounded-lg border bg-background px-4 py-3.5 shadow-sm ${className}`}>
      <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-1.5 min-w-0 break-words text-[15px] font-semibold leading-6 text-foreground">{children}</div>
    </div>
  );
}

function BookingDetailsSectionHeading({ children }: { children: ReactNode }) {
  return (
    <div className="border-b pb-2 sm:col-span-2">
      <h3 className="text-sm font-bold text-foreground">{children}</h3>
    </div>
  );
}

export default function BookingRequestsPage() {
  const [params, setParams] = useSearchParams();
  const tabParam = params.get("tab") as RequestTab | null;
  const activeTab: RequestTab = requestTabs.some(tab => tab.value === tabParam) ? tabParam! : "flights";
  const [items, setItems] = useState<BookingRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [provider, setProvider] = useState("all");
  const [period, setPeriod] = useState<RequestPeriod>("all");
  const [customDateRange, setCustomDateRange] = useState<DateRange | undefined>();
  const [customCalendarOpen, setCustomCalendarOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<BookingRequestStatus | "all">("all");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [sortDesc, setSortDesc] = useState(true);
  const [savingId, setSavingId] = useState("");
  const [viewing, setViewing] = useState<BookingRequest | null>(null);
  const [editing, setEditing] = useState<BookingRequest | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      setItems(withMissingSectionDemos(await listBookingRequests()));
    } catch (error) {
      console.error(error);
      setItems(demoBookingRequests);
      toast.warning("Live bookings could not be loaded. Showing demo data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);
  useEffect(() => {
    if (!tabParam || !requestTabs.some(tab => tab.value === tabParam)) {
      setParams({ tab: "flights" }, { replace: true });
    }
  }, [setParams, tabParam]);
  useEffect(() => {
    setStatusFilter("all");
    if (activeTab !== "flights" && activeTab !== "group") setProvider("all");
  }, [activeTab]);

  const visibleItems = useMemo(() => items.filter(item => !["tour", "visa", "study_visa", "visit_visa"].includes(item.type)), [items]);

  const matchesRequestTab = (item: BookingRequest, tab: RequestTab) => {
    if (tab === "flights") return item.type === "manual_flight";
    if (tab === "group") return item.type === "group";
    if (tab === "umrah") return item.type === "umrah" || item.type === "package";
    if (tab === "hotels") return item.type === "hotel";
    return true;
  };

  const providerOptions = useMemo(() => {
    const configured = INITIAL_PROVIDERS
      .filter(item => item.category === "flight")
      .map(item => ({ value: item.id.toLowerCase(), label: item.name }));
    const configuredIds = new Set(configured.map(item => item.value));
    const requestProviders = visibleItems
      .map(item => String(item.provider || "").trim())
      .filter(Boolean)
      .filter((value, index, values) => values.findIndex(candidate => candidate.toLowerCase() === value.toLowerCase()) === index)
      .filter(value => !configuredIds.has(value.toLowerCase()))
      .map(value => ({ value: value.toLowerCase(), label: value }));
    return [...configured, ...requestProviders];
  }, [visibleItems]);

  const supplierLabel = (value?: string) => {
    if (!value) return "—";
    return INITIAL_PROVIDERS.find(item => item.id.toLowerCase() === value.toLowerCase())?.name || value;
  };
  const customerHref = (item: BookingRequest) => {
    const term = encodeURIComponent(item.email || item.phone || item.customerName);
    return item.type === "group" ? `/admin/agencies?search=${term}` : `/admin/customers?search=${term}`;
  };

  const scopedItems = useMemo(() => {
    const providerItems = provider === "all"
      ? visibleItems
      : visibleItems.filter(item => String(item.provider || "").toLowerCase() === provider);
    if (period === "custom") {
      if (!customDateRange?.from) return providerItems;
      const startTime = startOfDay(customDateRange.from).getTime();
      const endTime = endOfDay(customDateRange.to || customDateRange.from).getTime();
      return providerItems.filter(item => {
        const createdTime = new Date(item.createdAt).getTime();
        return Number.isFinite(createdTime) && createdTime >= startTime && createdTime <= endTime;
      });
    }
    return filterRecordsByPeriod(providerItems, period);
  }, [customDateRange, period, provider, visibleItems]);

  const typeCounts = useMemo(() => {
    const counts: Record<RequestTab, number> = { flights: 0, group: 0, hotels: 0, umrah: 0 };
    scopedItems.forEach(item => {
      requestTabs.forEach(tab => {
        if (matchesRequestTab(item, tab.value)) counts[tab.value] += 1;
      });
    });
    return counts;
  }, [scopedItems]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    const matchesStatus = (item: BookingRequest) => {
      if (statusFilter === "all") return true;
      if (statusFilter === "pending") return item.status === "pending" || item.status === "payment_pending";
      if (statusFilter === "cancel") return item.status === "cancel" || item.status === "cancelled_lost";
      return item.status === statusFilter;
    };
    return scopedItems
      .filter(item => matchesRequestTab(item, activeTab))
      .filter(matchesStatus)
      .filter(item => !term || [
        item.requestId, item.pnr, item.type, item.customerName, item.phone, item.email, item.packageName, item.provider, item.status,
        item.flightDetails?.originCode, item.flightDetails?.originCity, item.flightDetails?.destinationCode,
        item.flightDetails?.destinationCity, item.flightDetails?.airline, item.flightDetails?.flightNumber,
        ...(item.travelers || []).flatMap(traveler => [traveler.firstName, traveler.lastName, traveler.ticketNumber, traveler.identityDocumentNumber]),
      ].filter(Boolean).join(" ").toLowerCase().includes(term))
      .sort((a, b) => sortDesc
        ? b.createdAt.localeCompare(a.createdAt)
        : a.createdAt.localeCompare(b.createdAt));
  }, [activeTab, scopedItems, search, sortDesc, statusFilter]);

  const activeStatusOptions = activeTab === "umrah" ? statusOptions : flightGroupStatusOptions;
  const supportsProviderFilter = activeTab === "flights" || activeTab === "group";
  const selectedProviderLabel = providerOptions.find(option => option.value === provider)?.label;
  const selectedPeriodLabel = period === "custom"
    ? customDateRange?.from
      ? customDateRange.to && customDateRange.to.getTime() !== customDateRange.from.getTime()
        ? `${format(customDateRange.from, "dd MMM yyyy")} – ${format(customDateRange.to, "dd MMM yyyy")}`
        : format(customDateRange.from, "dd MMM yyyy")
      : "Custom date"
    : requestPeriodOptions.find(option => option.value === period)?.label;
  const activeFilterCount = Number(Boolean(search.trim()))
    + Number(supportsProviderFilter && provider !== "all")
    + Number(period !== "all")
    + Number(statusFilter !== "all");
  const hasDemoData = items.some(item => item.requestId.startsWith(DEMO_REQUEST_PREFIX));

  const clearFilters = () => {
    setSearch("");
    setProvider("all");
    setPeriod("all");
    setCustomDateRange(undefined);
    setStatusFilter("all");
  };

  const change = (requestId: string, changes: Partial<BookingRequest>) => {
    if (editing && editing.requestId === requestId) setEditing({ ...editing, ...changes });
  };

  const save = async (item: BookingRequest) => {
    setSavingId(item.requestId);
    try {
      if (item.requestId.startsWith(DEMO_REQUEST_PREFIX)) {
        setItems(current => current.map(entry => entry.requestId === item.requestId ? item : entry));
        toast.success("Demo booking updated locally");
        setEditing(null);
        return;
      }
      const updated = await updateBookingRequest(item.requestId, {
        status: item.status,
        assignedStaff: item.assignedStaff,
        commission: item.commission,
        notes: item.notes,
      });
      setItems(current => current.map(entry => entry.requestId === updated.requestId ? updated : entry));
      toast.success("Booking request updated");
      setEditing(null);
    } catch (error) {
      console.error(error);
      toast.error("Booking request could not be updated");
      await load();
    } finally {
      setSavingId("");
    }
  };

  const downloadBookingETicket = (item: BookingRequest) => {
    const booking = bookingRecordForDownload(item);
    if (!booking) {
      toast.error("E-Ticket requires flight details and an airline-issued PNR.");
      return;
    }
    downloadETicket(booking);
  };

  const downloadBookingInvoice = async (item: BookingRequest) => {
    const ticket = ticketForInvoice(item);
    if (!ticket) {
      toast.error("Invoice download requires flight details and an airline-issued PNR.");
      return;
    }
    try {
      await downloadTicketInvoice(ticket);
    } catch (error) {
      console.error(error);
      toast.error("Invoice could not be downloaded.");
    }
  };

  const sendBookingNotification = () => {
    toast.info("Notification delivery is not connected to the backend yet.");
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold font-display">Bookings</h1>
            {hasDemoData && <Badge variant="secondary">Demo data</Badge>}
          </div>
          <p className="text-sm text-muted-foreground">Manage flight, group ticketing, hotel, and Umrah booking activity.</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {requestTabs.map(opt => {
          const active = activeTab === opt.value;
          const count = typeCounts[opt.value] || 0;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => setParams({ tab: opt.value })}
              className={`inline-flex items-center gap-1.5 rounded-xl border px-4 py-2 text-sm font-bold transition-colors ${
                active ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background hover:bg-muted"
              }`}
            >
              {opt.label}
              <Badge variant={active ? "secondary" : "outline"} className="h-5 px-1.5 text-[10px]">{count}</Badge>
            </button>
          );
        })}
      </div>

      <div className="rounded-2xl border bg-card p-3 shadow-card sm:p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
        <div className="min-w-0 flex-1 space-y-1.5">
          <Label htmlFor="request-search" className="text-xs text-muted-foreground">Search</Label>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <Input id="request-search" value={search} onChange={event => setSearch(event.target.value)} placeholder="Request, customer, phone, package, or status" className="pl-9 pr-9" />
            {search && (
              <button type="button" onClick={() => setSearch("")} aria-label="Clear request search" className="absolute right-1.5 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            )}
          </div>
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={() => setFiltersOpen(open => !open)}
          aria-expanded={filtersOpen}
          aria-controls="request-secondary-filters"
          className="justify-between gap-2 lg:hidden"
        >
          <span className="inline-flex items-center gap-2"><SlidersHorizontal className="h-4 w-4" aria-hidden="true" /> Filters</span>
          {activeFilterCount > 0 && <Badge variant="secondary" className="h-5 min-w-5 px-1.5">{activeFilterCount}</Badge>}
        </Button>
        <div
          id="request-secondary-filters"
          className={`${filtersOpen ? "grid" : "hidden"} gap-3 sm:grid-cols-2 lg:flex lg:items-end`}
        >
        {supportsProviderFilter && <div className="space-y-1.5 lg:w-44">
          <Label htmlFor="request-provider" className="text-xs text-muted-foreground">Provider</Label>
          <Select value={provider} onValueChange={setProvider}>
            <SelectTrigger id="request-provider" aria-label={provider === "all" ? "Provider, all providers" : undefined}>
              {provider === "all" ? <span className="sr-only">All providers</span> : <SelectValue />}
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All providers</SelectItem>
              {providerOptions.map(option => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>}
        <div className="space-y-1.5 lg:w-44">
          <Label htmlFor="request-period" className="text-xs text-muted-foreground">Request date</Label>
          <Select value={period} onValueChange={value => setPeriod(value as RequestPeriod)}>
            <SelectTrigger id="request-period" aria-label={period === "all" ? "Request date, all requests" : undefined}>
              {period === "all" ? <span className="sr-only">All request dates</span> : <SelectValue />}
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="custom">Custom</SelectItem>
              {requestPeriodOptions.filter(option => option.value !== "all").map(option => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        {period === "custom" && (
          <div className="space-y-1.5 lg:w-60">
            <Label className="text-xs text-muted-foreground">Custom dates</Label>
            <Popover open={customCalendarOpen} onOpenChange={setCustomCalendarOpen}>
              <PopoverTrigger asChild>
                <Button type="button" variant="outline" className="w-full justify-start gap-2 px-3 font-normal">
                  <CalendarDays className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                  <span className="truncate">{selectedPeriodLabel}</span>
                </Button>
              </PopoverTrigger>
              <PopoverContent align="start" className="w-auto max-w-[calc(100vw-2rem)] p-0">
                <Calendar
                  mode="range"
                  selected={customDateRange}
                  onSelect={range => {
                    setCustomDateRange(range);
                    if (range?.from && range.to) setCustomCalendarOpen(false);
                  }}
                  numberOfMonths={2}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
        )}
        <div className="space-y-1.5 lg:w-48">
          <Label htmlFor="request-status" className="text-xs text-muted-foreground">Status</Label>
          <Select value={statusFilter} onValueChange={value => setStatusFilter(value as BookingRequestStatus | "all")}>
            <SelectTrigger id="request-status" aria-label={statusFilter === "all" ? "Status, all statuses" : undefined}>
              {statusFilter === "all" ? <span className="sr-only">All statuses</span> : <SelectValue />}
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {activeStatusOptions.map(option => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        {activeFilterCount > 0 && (
          <Button type="button" variant="ghost" onClick={clearFilters} className="text-muted-foreground hover:text-foreground sm:self-end">
            Clear filters
          </Button>
        )}
        </div>
        </div>

        {activeFilterCount > 0 && (
          <div className="mt-3 flex flex-wrap items-center gap-2 border-t pt-3" aria-label="Active filters">
            {search.trim() && (
              <Badge variant="secondary" className="gap-1.5 py-1 pl-2.5 pr-1">
                Search: {search.trim()}
                <button type="button" onClick={() => setSearch("")} aria-label="Remove search filter" className="rounded-full p-0.5 hover:bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><X className="h-3 w-3" /></button>
              </Badge>
            )}
            {supportsProviderFilter && provider !== "all" && (
              <Badge variant="secondary" className="gap-1.5 py-1 pl-2.5 pr-1">
                Provider: {selectedProviderLabel || provider}
                <button type="button" onClick={() => setProvider("all")} aria-label="Remove provider filter" className="rounded-full p-0.5 hover:bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><X className="h-3 w-3" /></button>
              </Badge>
            )}
            {period !== "all" && (
              <Badge variant="secondary" className="gap-1.5 py-1 pl-2.5 pr-1">
                Date: {selectedPeriodLabel}
                <button type="button" onClick={() => { setPeriod("all"); setCustomDateRange(undefined); }} aria-label="Remove date filter" className="rounded-full p-0.5 hover:bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><X className="h-3 w-3" /></button>
              </Badge>
            )}
            {statusFilter !== "all" && (
              <Badge variant="secondary" className="gap-1.5 py-1 pl-2.5 pr-1">
                Status: {statusLabel(statusFilter)}
                <button type="button" onClick={() => setStatusFilter("all")} aria-label="Remove status filter" className="rounded-full p-0.5 hover:bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><X className="h-3 w-3" /></button>
              </Badge>
            )}
          </div>
        )}
      </div>

      {loading ? (
        <div className="flex min-h-48 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      ) : filtered.length === 0 ? (
        <EmptyState icon={ClipboardCheck} title="No booking requests" description="Requests submitted from the public website will appear here." />
      ) : (
        <>
          {/* Desktop table */}
          <Card className="hidden md:block shadow-card border-0"><CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{activeTab === "hotels" ? "Booking ID" : "PNR"}</TableHead>
                  <TableHead>Customer / Agency</TableHead>
                  <TableHead>Supplier</TableHead>
                  <TableHead>Status</TableHead>
                  {activeTab !== "umrah" && <TableHead>Amount</TableHead>}
                  <TableHead>
                    <button type="button" onClick={() => setSortDesc(s => !s)} className="inline-flex items-center gap-1 font-semibold hover:text-foreground">
                      Created At <ArrowUpDown className="h-3 w-3" />
                    </button>
                  </TableHead>
                  {activeTab !== "umrah" && <TableHead>Expiry At</TableHead>}
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(item => (
                  <TableRow key={item.requestId}>
                    <TableCell className={`text-sm ${activeTab === "hotels" ? "font-mono font-semibold" : "font-bold text-foreground [font-family:Arial,sans-serif]"}`}>
                      {activeTab === "hotels" ? item.requestId : item.pnr || "—"}
                    </TableCell>
                    <TableCell className="text-sm">
                      <Link
                        to={customerHref(item)}
                        className="font-semibold text-primary underline-offset-4 hover:underline focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        {item.customerName}
                      </Link>
                    </TableCell>
                    <TableCell className="max-w-[150px] truncate text-sm" title={supplierLabel(item.provider)}>{supplierLabel(item.provider)}</TableCell>
                    <TableCell><Badge variant="outline">{statusLabel(item.status)}</Badge></TableCell>
                    {activeTab !== "umrah" && (
                      <TableCell className="whitespace-nowrap text-sm">
                        <div className="font-semibold">{formatBookingAmount(item)}</div>
                        {bookingPaymentStatus(item) && (
                          <Badge variant={bookingPaymentStatus(item) === "paid" ? "secondary" : "outline"} className="mt-1 capitalize">
                            {bookingPaymentStatus(item)}
                          </Badge>
                        )}
                      </TableCell>
                    )}
                    <TableCell className="text-xs">
                      <div>{new Date(item.createdAt).toLocaleString()}</div>
                      <div className="mt-1"><AgingBadge createdAt={item.createdAt} /></div>
                    </TableCell>
                    {activeTab !== "umrah" && (
                      <TableCell className="whitespace-nowrap text-xs font-medium">
                        {item.expiresAt ? new Date(item.expiresAt).toLocaleString() : "—"}
                      </TableCell>
                    )}
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8"
                          onClick={() => setViewing(item)}
                          aria-label={`View booking for ${item.customerName}`}
                          title="View booking"
                        >
                          <Eye aria-hidden="true" />
                        </Button>
                        <DropdownMenu modal={false}>
                          <DropdownMenuTrigger asChild>
                            <Button type="button" size="icon" variant="ghost" className="h-8 w-8" aria-label={`More actions for ${item.customerName}`}>
                              <MoreHorizontal aria-hidden="true" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-52">
                            <DropdownMenuItem onSelect={() => setEditing(item)}><PencilLine aria-hidden="true" className="mr-2 h-4 w-4" />Edit / Manage Booking</DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onSelect={() => downloadBookingETicket(item)}><Download aria-hidden="true" className="mr-2 h-4 w-4" />Download E-Ticket</DropdownMenuItem>
                            <DropdownMenuItem onSelect={() => void downloadBookingInvoice(item)}><FileText aria-hidden="true" className="mr-2 h-4 w-4" />Download Invoice</DropdownMenuItem>
                            <DropdownMenuItem onSelect={sendBookingNotification}><Bell aria-hidden="true" className="mr-2 h-4 w-4" />Send Notification</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent></Card>

          {/* Mobile cards */}
          <div className="grid gap-3 md:hidden">
            {filtered.map(item => (
              <Card key={item.requestId} className="shadow-card"><CardContent className="p-4 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    {activeTab === "hotels" && <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Booking ID</div>}
                    <span className={`block truncate ${activeTab === "hotels" ? "font-mono text-xs font-semibold" : "text-sm font-bold text-foreground [font-family:Arial,sans-serif]"}`}>
                      {activeTab === "hotels" ? item.requestId : item.pnr || item.requestId}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <AgingBadge createdAt={item.createdAt} />
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8"
                      onClick={() => setViewing(item)}
                      aria-label={`View booking for ${item.customerName}`}
                      title="View booking"
                    >
                      <Eye aria-hidden="true" />
                    </Button>
                    <DropdownMenu modal={false}>
                      <DropdownMenuTrigger asChild>
                        <Button type="button" size="icon" variant="ghost" className="h-8 w-8" aria-label={`More actions for ${item.customerName}`}>
                          <MoreHorizontal aria-hidden="true" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-52">
                        <DropdownMenuItem onSelect={() => setEditing(item)}><PencilLine aria-hidden="true" className="mr-2 h-4 w-4" />Edit / Manage Booking</DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onSelect={() => downloadBookingETicket(item)}><Download aria-hidden="true" className="mr-2 h-4 w-4" />Download E-Ticket</DropdownMenuItem>
                        <DropdownMenuItem onSelect={() => void downloadBookingInvoice(item)}><FileText aria-hidden="true" className="mr-2 h-4 w-4" />Download Invoice</DropdownMenuItem>
                        <DropdownMenuItem onSelect={sendBookingNotification}><Bell aria-hidden="true" className="mr-2 h-4 w-4" />Send Notification</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
                <div>
                  <Link
                    to={customerHref(item)}
                    className="font-semibold text-primary underline-offset-4 hover:underline focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {item.customerName}
                  </Link>
                </div>
                <div className="text-xs text-muted-foreground">Supplier: <span className="text-foreground">{supplierLabel(item.provider)}</span></div>
                {activeTab !== "umrah" && (
                  <>
                    <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                      <span>Amount: <span className="font-semibold text-foreground">{formatBookingAmount(item)}</span></span>
                      {bookingPaymentStatus(item) && <Badge variant={bookingPaymentStatus(item) === "paid" ? "secondary" : "outline"} className="capitalize">{bookingPaymentStatus(item)}</Badge>}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Expiry At: <span className="font-medium text-foreground">{item.expiresAt ? new Date(item.expiresAt).toLocaleString() : "—"}</span>
                    </div>
                  </>
                )}
                <div className="flex items-center justify-between text-xs">
                  <span>{new Date(item.createdAt).toLocaleString()}</span>
                  <Badge variant="outline">{statusLabel(item.status)}</Badge>
                </div>
              </CardContent></Card>
            ))}
          </div>
        </>
      )}

      <Dialog open={Boolean(viewing)} onOpenChange={open => { if (!open) setViewing(null); }}>
        <DialogContent className="flex max-h-[min(90vh,calc(100dvh-2rem))] w-[calc(100vw-2rem)] max-w-4xl flex-col gap-0 overflow-hidden p-0">
          {viewing && (
            <>
              <DialogHeader className="shrink-0 border-b px-5 py-5 pr-16 sm:px-7 sm:py-6">
                <DialogTitle>Booking details</DialogTitle>
                <DialogDescription className="pt-1">
                  {viewing.pnr ? (
                    <span className="inline-flex w-fit items-center gap-3 rounded-xl border border-primary/20 bg-primary/10 px-4 py-2 text-primary">
                      <span className="text-xs font-bold uppercase tracking-wider">PNR</span>
                      <span className="font-mono text-xl font-bold tracking-wide">{viewing.pnr}</span>
                    </span>
                  ) : "Booking overview"}
                </DialogDescription>
              </DialogHeader>
              <div className="min-h-0 flex-1 overflow-y-auto px-5 py-6 sm:px-7 sm:py-7">
                <div className="grid gap-3 sm:grid-cols-2 sm:gap-4">
                  <BookingDetailsSectionHeading>Customer / Contact</BookingDetailsSectionHeading>
                  <BookingDetailField label="Booked by / Contact">
                    <span>{viewing.customerName}</span>
                  </BookingDetailField>
                  <BookingDetailField label="Status"><Badge variant="outline">{statusLabel(viewing.status)}</Badge></BookingDetailField>
                  <BookingDetailField label="Phone">{viewing.phone || "—"}</BookingDetailField>
                  <BookingDetailField label="Email">{viewing.email || "—"}</BookingDetailField>
                  <BookingDetailField label="Service">{requestTypeLabel(viewing.type)}</BookingDetailField>
                  <BookingDetailField label="Supplier">{supplierLabel(viewing.provider)}</BookingDetailField>
                  {viewing.flightDetails ? (
                    <>
                      <BookingDetailsSectionHeading>Flight</BookingDetailsSectionHeading>
                      <BookingDetailField label="Route" className="sm:col-span-2">
                        <span className="font-mono">{viewing.flightDetails.originCode || "—"} → {viewing.flightDetails.destinationCode || "—"}</span>
                        <span className="mt-0.5 block text-sm font-normal text-muted-foreground">{viewing.flightDetails.originCity || "—"} to {viewing.flightDetails.destinationCity || "—"}</span>
                      </BookingDetailField>
                      <BookingDetailField label="Trip type">{viewing.flightDetails.tripType || "—"}</BookingDetailField>
                      <BookingDetailField label="Airline">{viewing.flightDetails.airline || "—"}</BookingDetailField>
                      <BookingDetailField label="Flight number"><span className="font-mono">{viewing.flightDetails.flightNumber || "—"}</span></BookingDetailField>
                      <BookingDetailField label="Duration">{viewing.flightDetails.duration || "—"}</BookingDetailField>
                      <BookingDetailField label="Baggage">{viewing.flightDetails.baggage || "Baggage info not available"}</BookingDetailField>
                      <BookingDetailField label="Cabin class">{viewing.flightDetails.cabinClass || "—"}</BookingDetailField>
                      <BookingDetailField label="Departure">{viewing.flightDetails.departureAt ? new Date(viewing.flightDetails.departureAt).toLocaleString() : "—"}</BookingDetailField>
                      <BookingDetailField label="Arrival">{viewing.flightDetails.arrivalAt ? new Date(viewing.flightDetails.arrivalAt).toLocaleString() : "—"}</BookingDetailField>
                      {typeof viewing.flightDetails.passengers === "number" && !viewing.travelers?.length && <BookingDetailField label="Passengers">{viewing.flightDetails.passengers}</BookingDetailField>}
                      {typeof viewing.flightDetails.seats === "number" && <BookingDetailField label="Group seats">{viewing.flightDetails.seats}</BookingDetailField>}
                    </>
                  ) : (
                    <>
                      <BookingDetailsSectionHeading>Booking</BookingDetailsSectionHeading>
                      <BookingDetailField label="Booking" className="sm:col-span-2">{viewing.packageName || "—"}</BookingDetailField>
                    </>
                  )}
                  {viewing.travelers?.length ? (
                    <div className="min-w-0 sm:col-span-2">
                      <div className="mb-3 flex items-center justify-between gap-3 border-b pb-2">
                        <h3 className="text-sm font-bold text-foreground">Travelers</h3>
                        <Badge variant="secondary">{viewing.travelers.length}</Badge>
                      </div>
                      <div className="space-y-3">
                        {viewing.travelers.map((traveler, index) => (
                          <div key={traveler.travelerId} className="rounded-lg border bg-background px-4 py-4 shadow-sm">
                            <div className="flex flex-wrap items-start justify-between gap-3">
                              <div className="min-w-0">
                                <div className="font-semibold">
                                  <span className="mr-2 text-xs font-normal text-muted-foreground">{index + 1}.</span>
                                  {[traveler.title, traveler.firstName, traveler.lastName].filter(Boolean).join(" ")}
                                </div>
                                {traveler.ticketNumber && <div className="mt-0.5 truncate font-mono text-xs text-muted-foreground">Ticket {traveler.ticketNumber}</div>}
                              </div>
                              <div className="flex shrink-0 flex-wrap items-center gap-2">
                                <Badge variant="secondary" className="capitalize">{traveler.passengerType}</Badge>
                              </div>
                            </div>
                            <dl className="mt-3 grid gap-x-5 gap-y-4 border-t pt-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
                              <div><dt className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">First name</dt><dd className="mt-1 text-sm font-semibold text-foreground">{traveler.firstName}</dd></div>
                              <div><dt className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Last name</dt><dd className="mt-1 text-sm font-semibold text-foreground">{traveler.lastName}</dd></div>
                              <div><dt className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Date of birth</dt><dd className="mt-1 text-sm font-semibold text-foreground">{traveler.dateOfBirth ? new Date(`${traveler.dateOfBirth}T00:00:00`).toLocaleDateString() : "—"}</dd></div>
                              <div className="sm:col-span-1 lg:col-span-2"><dt className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Passport / ID Card Number</dt><dd className="mt-1 break-all font-mono text-sm font-semibold text-foreground">{traveler.identityDocumentNumber || "—"}</dd></div>
                              <div className="sm:col-span-1"><dt className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Passport / ID Card Issuance Date</dt><dd className="mt-1 text-sm font-semibold text-foreground">{traveler.passportOrIdCardIssuanceDate || demoTravelerIssuanceDates[traveler.travelerId] ? new Date(`${traveler.passportOrIdCardIssuanceDate || demoTravelerIssuanceDates[traveler.travelerId]}T00:00:00`).toLocaleDateString() : "—"}</dd></div>
                              <div className="sm:col-span-1 lg:col-span-2"><dt className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Passport / ID Card Expiry</dt><dd className="mt-1 text-sm font-semibold text-foreground">{traveler.identityDocumentExpiry ? new Date(`${traveler.identityDocumentExpiry}T00:00:00`).toLocaleDateString() : "—"}</dd></div>
                            </dl>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}
                  <BookingDetailsSectionHeading>Record</BookingDetailsSectionHeading>
                  {viewing.selectedOption && <BookingDetailField label="Selected option" className="sm:col-span-2">{viewing.selectedOption}</BookingDetailField>}
                  <BookingDetailField label="Created At" className="sm:col-span-2">{new Date(viewing.createdAt).toLocaleString()}</BookingDetailField>
                  {viewing.notes && <BookingDetailField label="Notes" className="sm:col-span-2"><span className="whitespace-pre-wrap font-normal">{viewing.notes}</span></BookingDetailField>}
                </div>
              </div>
              <DialogFooter className="shrink-0 gap-2 border-t bg-background px-5 py-4 sm:px-7 sm:py-5">
                <Button type="button" variant="outline" onClick={() => setViewing(null)}>Close</Button>
                <Button type="button" onClick={() => { setEditing(viewing); setViewing(null); }}>
                  <PencilLine aria-hidden="true" /> Edit booking
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(editing)} onOpenChange={open => { if (!open) setEditing(null); }}>
        <DialogContent className="flex max-h-[min(90vh,calc(100dvh-2rem))] w-[calc(100vw-2rem)] max-w-xl flex-col gap-0 overflow-hidden p-0">
          {editing && (
            <>
              <DialogHeader className="shrink-0 border-b px-5 py-4 pr-16 sm:px-6">
                <DialogTitle>Manage booking</DialogTitle>
                <DialogDescription className="font-mono text-xs">{editing.requestId}</DialogDescription>
              </DialogHeader>

              <div className="grid min-h-0 flex-1 gap-4 overflow-y-auto px-5 py-5 sm:grid-cols-2 sm:px-6">
                {usesBookingStatuses(editing) ? (
                  <div className="space-y-2 sm:col-span-2">
                    <div>
                      <Label>Booking action</Label>
                      <p className="text-xs text-muted-foreground">Choose the next workflow state, then save the booking.</p>
                    </div>
                    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                      {bookingActions.map(action => (
                        <Button
                          key={action.value}
                          type="button"
                          variant={editing.status === action.value ? "default" : "outline"}
                          aria-pressed={editing.status === action.value}
                          onClick={() => change(editing.requestId, { status: action.value })}
                          className="justify-start"
                        >
                          {action.label}
                        </Button>
                      ))}
                    </div>
                    {editing.status === "refund" && (
                      <p className="rounded-lg border border-warning/20 bg-warning/10 px-3 py-2 text-xs text-warning">
                        Refund review records the workflow status only. Complete the payment reversal from the finance workflow.
                      </p>
                    )}
                  </div>
                ) : (
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select value={editing.status} onValueChange={value => change(editing.requestId, { status: value as BookingRequestStatus })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{statusOptionsFor(editing).map(option => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                )}
                {(editing.type === "manual_flight" || editing.type === "group") && (
                  <div className="space-y-2 rounded-lg border bg-muted/30 px-3 py-2.5">
                    <Label>Airline-issued PNR</Label>
                    <div className="font-mono text-base font-bold uppercase tracking-wide">{editing.pnr || "Not issued"}</div>
                    <p className="text-xs text-muted-foreground">The PNR is issued by the airline and cannot be changed.</p>
                  </div>
                )}
                <div className="space-y-2">
                  <Label>Assigned staff</Label>
                  <Select value={editing.assignedStaff || "unassigned"} onValueChange={value => change(editing.requestId, { assignedStaff: value === "unassigned" ? "" : value })}>
                    <SelectTrigger><SelectValue placeholder="Unassigned" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unassigned">Unassigned</SelectItem>
                      {STAFF_PICKER.map(name => <SelectItem key={name} value={name}>{name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="booking-commission">Commission (Rs)</Label>
                  <Input
                    id="booking-commission"
                    type="number"
                    min="0"
                    step="1"
                    value={editing.commission ?? ""}
                    onChange={event => change(editing.requestId, { commission: event.target.value === "" ? undefined : Number(event.target.value) })}
                    placeholder="0"
                  />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label>Notes</Label>
                  <Textarea value={editing.notes || ""} onChange={event => change(editing.requestId, { notes: event.target.value })} rows={4} placeholder="Add processing notes" />
                </div>
              </div>

              <DialogFooter className="shrink-0 gap-2 border-t bg-background px-5 py-4 sm:px-6">
                <Button type="button" variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
                <Button onClick={() => void save(editing)} disabled={savingId === editing.requestId}>
                  {savingId === editing.requestId ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving</> : "Save changes"}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

