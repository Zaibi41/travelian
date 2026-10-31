// LocalStorage-backed booking persistence for Travelian (frontend-only)

export type BookingStatus = "held" | "pending_payment" | "payment_received" | "confirmed" | "ticket_issued" | "cancelled" | "expired";

export interface BookingTraveler {
  passengerType?: "adult" | "child" | "infant";
  title: string;
  firstName: string;
  lastName: string;
  gender?: string;
  dob?: string;
  docType: "passport" | "cnic";
  docNumber: string;
  nationality?: string;
  issuanceCountry?: string;
  expiryDate?: string;
}

export interface BookingContact {
  email?: string;
  phone: string;
  altPhone?: string;
}

export interface BookingFlight {
  airline: string;
  flightNumber: string;
  from: string;
  fromCode?: string;
  to: string;
  toCode?: string;
  date: string;
  departTime?: string;
  arriveTime?: string;
  duration?: string;
  cabin?: string;
}

export interface BookingPricing {
  base: number;
  addons: number;
  taxes: number;
  total: number;
  currency: string;
  /** Full supplier cost in the same currency as total, when supplied by the backend. */
  supplierCost?: number;
}

export interface BookingRecord {
  id: string;            // PNR-style booking reference
  pnr: string;           // 6-char alphanumeric
  /** Internal supplier/provider reference used by admin reporting. */
  provider?: string;
  type: "flight" | "hotel" | "umrah" | "tour" | "visa";
  status: BookingStatus;
  createdAt: string;
  flight?: BookingFlight;
  travelers: BookingTraveler[];
  contact: BookingContact;
  seat?: string;
  addons: { id: string; name: string; price: number }[];
  paymentMethod: string;
  paymentStatus?: "unpaid" | "pending" | "paid";
  ticketStatus?: "not_issued" | "issued";
  holdExpiresAt?: string;
  pricing: BookingPricing;
}

const KEY = "travelian.bookings.v1";

function read(): BookingRecord[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    return JSON.parse(raw) as BookingRecord[];
  } catch {
    return [];
  }
}

function write(list: BookingRecord[]) {
  localStorage.setItem(KEY, JSON.stringify(list));
  window.dispatchEvent(new Event("travelian:bookings:updated"));
}

export function generatePNR(): string {
  // 6 chars, alphanumeric, airline-style (no 0/O/I/1 confusion)
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < 6; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

export function listBookings(): BookingRecord[] {
  return read().sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function getBooking(id: string): BookingRecord | undefined {
  return read().find(b => b.id === id);
}

export function saveBooking(record: Omit<BookingRecord, "id" | "pnr" | "createdAt" | "status"> & Partial<Pick<BookingRecord, "status">>): BookingRecord {
  const pnr = generatePNR();
  const full: BookingRecord = {
    ...record,
    id: `TRV-${pnr}`,
    pnr,
    status: record.status ?? "confirmed",
    createdAt: new Date().toISOString(),
  };
  const list = read();
  list.push(full);
  write(list);
  return full;
}

export function cancelBooking(id: string) {
  const list = read().map(b => (b.id === id ? { ...b, status: "cancelled" as const } : b));
  write(list);
}

export function expireBooking(id: string) {
  const list = read().map(b => (b.id === id ? { ...b, status: "expired" as const } : b));
  write(list);
}

export function deleteBooking(id: string) {
  write(read().filter(b => b.id !== id));
}
