import { useLocation } from "react-router-dom";
import { createContext, useContext, useState, useCallback, useEffect, useRef, ReactNode } from "react";
import {
  Booking, Flight, Hotel, Agency, WalletTransaction, Notification,
  TravelTicket, User, UmrahPackage, Coupon, BlogPost, BookingStatus,
  WalletLedgerEntry, WalletDepositRequest, PaymentWebhookEvent, WalletMethod,
} from "@/data/models";
import {
  listPackages as listRemotePackages,
  savePackage as saveRemotePackage,
  softDeletePackage as softDeleteRemotePackage,
} from "@/lib/package-api";
import {
  listTickets as listRemoteTickets,
  saveTicket as saveRemoteTicket,
  softDeleteTicket as softDeleteRemoteTicket,
} from "@/lib/ticket-api";
import { listContentHotels } from "@/lib/hotel-content-api";

// Flight Search Log
export interface FlightSearchLog {
  id: string;
  route: string;
  date: string;
  resultsCount: number;
  userId?: string;
  userName?: string;
  timestamp: string;
  status: 'found' | 'not_found';
}

// Payment Link
export interface PaymentLink {
  id: string;
  bookingId: string;
  customerName: string;
  customerEmail: string;
  amount: number;
  status: 'pending' | 'paid' | 'expired';
  createdAt: string;
  expiresAt: string;
  paymentMethod?: string;
  link: string;
}

// Payment Config
export interface PaymentConfig {
  cardEnabled: boolean;
  walletEnabled: boolean;
  bankTransferEnabled: boolean;
  visaEnabled: boolean;
  mastercardEnabled: boolean;
  testMode: boolean;
}

// Secret Key
export interface SecretKey {
  id: string;
  name: string;
  category: 'flight_api' | 'hotel_api' | 'payment' | 'sms' | 'email' | 'other';
  value: string;
  environment: 'production' | 'staging' | 'development';
  lastUpdated: string;
  createdBy: string;
}

interface AdminState {
  // Data
  bookings: Booking[];
  flights: Flight[];
  hotels: Hotel[];
  agencies: Agency[];
  transactions: WalletTransaction[];
  notifications: Notification[];
  tickets: TravelTicket[];
  users: User[];
  packageLoadStatus: "idle" | "loading" | "success" | "error";
  packages: UmrahPackage[];
  coupons: Coupon[];
  blogPosts: BlogPost[];
  flightSearchLogs: FlightSearchLog[];
  paymentLinks: PaymentLink[];
  paymentConfig: PaymentConfig;
  secretKeys: SecretKey[];
  walletLedger: WalletLedgerEntry[];
  walletDeposits: WalletDepositRequest[];
  paymentWebhookEvents: PaymentWebhookEvent[];

  /** Load CMS hotel inventory when a page needs it (avoids /content/hotels on every route). */
  loadHotelContent: () => void;

  // Booking actions
  updateBookingStatus: (id: string, status: BookingStatus) => void;
  addBooking: (b: Booking) => void;
  deleteBooking: (id: string) => void;

  // Flight actions
  addFlight: (f: Flight) => void;
  updateFlight: (id: string, data: Partial<Flight>) => void;
  deleteFlight: (id: string) => void;

  // Hotel actions
  addHotel: (h: Hotel) => void;
  updateHotel: (id: string, data: Partial<Hotel>) => void;
  deleteHotel: (id: string) => void;

  // Agency actions
  addAgency: (a: Agency) => void;
  updateAgency: (id: string, data: Partial<Agency>) => void;

  // Ticket actions
  addTicket: (t: TravelTicket) => void;
  updateTicket: (id: string, data: Partial<TravelTicket>) => void;
  deleteTicket: (id: string) => void;
  issueTicketForBooking: (bookingId: string) => void;

  // Wallet actions
  addWalletFunds: (agencyId: string, amount: number, desc: string) => void;
  deductWalletFunds: (agencyId: string, amount: number, desc: string) => void;
  createWalletDeposit: (input: {
    agencyId: string;
    amount: number;
    method: 'card' | '1link' | 'bank_transfer';
    reference?: string;
    transferDate?: string;
    proofUrl?: string;
    notes?: string;
    requestedBy: string;
  }) => WalletDepositRequest | undefined;
  approveWalletDeposit: (depositId: string, approvedBy: string) => void;
  rejectWalletDeposit: (depositId: string, rejectedBy: string, reason: string) => void;
  manualWalletAdjustment: (input: {
    agencyId: string;
    type: 'credit' | 'debit';
    amount: number;
    reason: string;
    createdBy: string;
  }) => boolean;

  // Notification actions
  addNotification: (n: Omit<Notification, 'id'>) => void;
  markNotificationRead: (id: string) => void;
  markAllRead: () => void;

  // User actions
  addUser: (u: User) => void;
  updateUser: (id: string, data: Partial<User>) => void;
  deleteUser: (id: string) => void;

  // Package actions
  addPackage: (p: UmrahPackage) => void;
  updatePackage: (id: string, data: Partial<UmrahPackage>) => void;
  deletePackage: (id: string) => void;

  // Coupon actions
  addCoupon: (c: Coupon) => void;
  updateCoupon: (id: string, data: Partial<Coupon>) => void;
  deleteCoupon: (id: string) => void;

  // Flight search log
  addFlightSearchLog: (log: FlightSearchLog) => void;

  // Payment links
  addPaymentLink: (pl: PaymentLink) => void;
  updatePaymentLink: (id: string, data: Partial<PaymentLink>) => void;

  // Payment config
  updatePaymentConfig: (cfg: Partial<PaymentConfig>) => void;

  // Secret keys
  addSecretKey: (sk: SecretKey) => void;
  updateSecretKey: (id: string, data: Partial<SecretKey>) => void;
  deleteSecretKey: (id: string) => void;
}

const AdminContext = createContext<AdminState | undefined>(undefined);

const initialSearchLogs: FlightSearchLog[] = [];
const initialPaymentLinks: PaymentLink[] = [];
const initialSecretKeys: SecretKey[] = [];
const WALLET_LEDGER_STORAGE_KEY = "travelian:wallet-ledger";
const WALLET_DEPOSITS_STORAGE_KEY = "travelian:wallet-deposits";
const PAYMENT_WEBHOOK_STORAGE_KEY = "travelian:payment-webhook-events";

function loadStoredArray<T>(key: string): T[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function AdminProvider({ children }: { children: ReactNode }) {
  const { pathname, search } = useLocation();
  const isAdmin = pathname === "/admin" || pathname.startsWith("/admin/");
  const needsUmrah = isAdmin || pathname.startsWith("/umrah") || pathname === "/request-booking" || (pathname === "/booking" && new URLSearchParams(search).get("type") === "umrah");
  const [packageLoadStatus, setPackageLoadStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [flights, setFlights] = useState<Flight[]>([]);
  const [hotels, setHotels] = useState<Hotel[]>([]);
  const [agencies, setAgencies] = useState<Agency[]>([]);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [tickets, setTickets] = useState<TravelTicket[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [packages, setPackages] = useState<UmrahPackage[]>([]);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [blogPosts] = useState<BlogPost[]>([]);
  const [flightSearchLogs, setFlightSearchLogs] = useState<FlightSearchLog[]>(initialSearchLogs);
  const [paymentLinks, setPaymentLinks] = useState<PaymentLink[]>(initialPaymentLinks);
  const [paymentConfig, setPaymentConfig] = useState<PaymentConfig>({
    cardEnabled: true, walletEnabled: true, bankTransferEnabled: true,
    visaEnabled: true, mastercardEnabled: true, testMode: true,
  });
  const [secretKeys, setSecretKeys] = useState<SecretKey[]>(initialSecretKeys);
  const [walletLedger, setWalletLedger] = useState<WalletLedgerEntry[]>(() => loadStoredArray<WalletLedgerEntry>(WALLET_LEDGER_STORAGE_KEY));
  const [walletDeposits, setWalletDeposits] = useState<WalletDepositRequest[]>(() => loadStoredArray<WalletDepositRequest>(WALLET_DEPOSITS_STORAGE_KEY));
  const [paymentWebhookEvents, setPaymentWebhookEvents] = useState<PaymentWebhookEvent[]>(() => loadStoredArray<PaymentWebhookEvent>(PAYMENT_WEBHOOK_STORAGE_KEY));
  const hotelContentRequestedRef = useRef(false);

  const loadHotelContent = useCallback(() => {
    if (hotelContentRequestedRef.current) return;
    hotelContentRequestedRef.current = true;
    listContentHotels()
      .then((items) => setHotels(items))
      .catch((error) => console.error("Unable to load hotel content from AWS", error));
  }, []);

  useEffect(() => {
    if (!needsUmrah) return;
    let cancelled = false;
    setPackageLoadStatus("loading");
    listRemotePackages("umrah").then(items => {
      if (!cancelled) {
        setPackages(items);
        setPackageLoadStatus("success");
      }
    }).catch(() => {
      if (!cancelled) setPackageLoadStatus("error");
    });
    return () => { cancelled = true; };
  }, [needsUmrah]);

  useEffect(() => {
    if (!isAdmin) return;
    let cancelled = false;
    void listRemoteTickets().then(items => { if (!cancelled) setTickets(items); }).catch(() => {});
    return () => { cancelled = true; };
  }, [isAdmin]);

  // Hotel content is loaded on demand via loadHotelContent (Home, admin hotel search).
  useEffect(() => {
    window.localStorage.setItem(WALLET_LEDGER_STORAGE_KEY, JSON.stringify(walletLedger));
  }, [walletLedger]);

  useEffect(() => {
    window.localStorage.setItem(WALLET_DEPOSITS_STORAGE_KEY, JSON.stringify(walletDeposits));
  }, [walletDeposits]);

  useEffect(() => {
    window.localStorage.setItem(PAYMENT_WEBHOOK_STORAGE_KEY, JSON.stringify(paymentWebhookEvents));
  }, [paymentWebhookEvents]);

  // Booking
  const updateBookingStatus = useCallback((id: string, status: BookingStatus) => {
    setBookings(p => p.map(b => b.bookingId === id ? { ...b, status } : b));
    setNotifications(p => [{ id: `n${Date.now()}`, title: `Booking ${status}`, message: `Booking #${id} status changed to ${status}`, type: 'booking', read: false, createdAt: new Date().toISOString() }, ...p]);
  }, []);
  const addBooking = useCallback((b: Booking) => setBookings(p => [...p, b]), []);
  const deleteBooking = useCallback((id: string) => setBookings(p => p.filter(b => b.bookingId !== id)), []);

  // Flights
  const addFlight = useCallback((f: Flight) => setFlights(p => [...p, f]), []);
  const updateFlight = useCallback((id: string, data: Partial<Flight>) => setFlights(p => p.map(f => f.flightId === id ? { ...f, ...data } : f)), []);
  const deleteFlight = useCallback((id: string) => setFlights(p => p.filter(f => f.flightId !== id)), []);

  // Hotels
  const addHotel = useCallback((h: Hotel) => setHotels(p => [...p, h]), []);
  const updateHotel = useCallback((id: string, data: Partial<Hotel>) => setHotels(p => p.map(h => h.hotelId === id ? { ...h, ...data } : h)), []);
  const deleteHotel = useCallback((id: string) => setHotels(p => p.filter(h => h.hotelId !== id)), []);

  // Agency
  const addAgency = useCallback((a: Agency) => setAgencies(p => [...p, a]), []);
  const updateAgency = useCallback((id: string, data: Partial<Agency>) => setAgencies(p => p.map(a => a.agencyId === id ? { ...a, ...data } : a)), []);

  // Tickets
  const addTicket = useCallback((t: TravelTicket) => {
    setTickets(p => [t, ...p]);
    saveRemoteTicket(t)
      .then(saved => setTickets(p => p.map(item => item.ticketId === t.ticketId ? saved : item)))
      .catch(error => console.error("Unable to save ticket", error));
    setNotifications(p => [{ id: `n${Date.now()}`, title: 'Ticket Issued', message: `Ticket ${t.ticketNumber} issued for ${t.passengerName}`, type: 'booking', read: false, createdAt: new Date().toISOString() }, ...p]);
  }, []);
  const updateTicket = useCallback((id: string, data: Partial<TravelTicket>) => setTickets(previous => {
    const existing = previous.find(t => t.ticketId === id);
    if (!existing) return previous;
    const next = { ...existing, ...data };
    saveRemoteTicket(next).catch(error => console.error("Unable to update ticket", error));
    return previous.map(t => t.ticketId === id ? next : t);
  }), []);
  const deleteTicket = useCallback((id: string) => {
    const deletedAt = new Date().toISOString();
    setTickets(p => p.map(t => t.ticketId === id ? { ...t, deletedAt, status: "cancelled" } : t));
    softDeleteRemoteTicket(id).catch(error => console.error("Unable to delete ticket", error));
  }, []);
  const issueTicketForBooking = useCallback((bookingId: string) => {
    const booking = bookings.find(b => b.bookingId === bookingId);
    if (!booking) return;
    setNotifications(p => [{
      id: `n${Date.now()}`,
      title: 'Provider ticket required',
      message: `Booking ${bookingId} cannot be issued until the airline provider returns a valid ticket number.`,
      type: 'booking',
      read: false,
      createdAt: new Date().toISOString(),
    }, ...p]);
  }, [bookings]);

  // Wallet
  const ledgerBalanceForAgency = useCallback((agencyId: string, ledger = walletLedger) => (
    ledger
      .filter(entry => entry.agencyId === agencyId && entry.status === 'approved')
      .reduce((sum, entry) => sum + (entry.type === 'credit' ? entry.amount : -entry.amount), 0)
  ), [walletLedger]);

  const syncAgencyWalletBalance = useCallback((agencyId: string, balance: number) => {
    setAgencies(p => p.map(a => a.agencyId === agencyId ? { ...a, walletBalance: Math.max(0, balance) } : a));
  }, []);

  const appendLedgerEntry = useCallback((entry: Omit<WalletLedgerEntry, 'ledgerId' | 'createdAt' | 'balanceAfter'>) => {
    setWalletLedger(previous => {
      const currentBalance = ledgerBalanceForAgency(entry.agencyId, previous);
      const balanceAfter = Math.max(0, currentBalance + (entry.type === 'credit' ? entry.amount : -entry.amount));
      const nextEntry: WalletLedgerEntry = {
        ...entry,
        ledgerId: `wl-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        createdAt: new Date().toISOString(),
        balanceAfter,
      };
      syncAgencyWalletBalance(entry.agencyId, balanceAfter);
      return [nextEntry, ...previous];
    });
  }, [ledgerBalanceForAgency, syncAgencyWalletBalance]);

  const createApprovedLedgerCreditForDeposit = useCallback((deposit: WalletDepositRequest, approvedBy: string) => {
    appendLedgerEntry({
      agencyId: deposit.agencyId,
      agencyName: deposit.agencyName,
      type: 'credit',
      amount: deposit.amount,
      method: deposit.method,
      status: 'approved',
      reference: deposit.providerReference || deposit.reference,
      description: `${deposit.method === '1link' ? '1Link' : deposit.method === 'card' ? 'Card' : 'Bank transfer'} wallet deposit`,
      createdBy: deposit.requestedBy,
      approvedBy,
      approvedAt: new Date().toISOString(),
      depositRequestId: deposit.depositId,
    });
  }, [appendLedgerEntry]);

  const addWalletFunds = useCallback((agencyId: string, amount: number, desc: string) => {
    setAgencies(p => p.map(a => a.agencyId === agencyId ? { ...a, walletBalance: a.walletBalance + amount } : a));
    const agency = agencies.find(a => a.agencyId === agencyId);
    const balance = (agency?.walletBalance || 0) + amount;
    setTransactions(p => [...p, { transactionId: `t${Date.now()}`, agencyId, agencyName: agency?.agencyName || '', type: 'credit', amount, description: desc, balanceAfter: balance, createdAt: new Date().toISOString().split('T')[0] }]);
    setNotifications(p => [{ id: `n${Date.now()}`, title: 'Wallet Top-up', message: `$${amount.toLocaleString()} added to ${agency?.agencyName}`, type: 'wallet', read: false, createdAt: new Date().toISOString() }, ...p]);
  }, [agencies]);

  const deductWalletFunds = useCallback((agencyId: string, amount: number, desc: string) => {
    setAgencies(p => p.map(a => a.agencyId === agencyId ? { ...a, walletBalance: Math.max(0, a.walletBalance - amount) } : a));
    const agency = agencies.find(a => a.agencyId === agencyId);
    const balance = Math.max(0, (agency?.walletBalance || 0) - amount);
    setTransactions(p => [...p, { transactionId: `t${Date.now()}`, agencyId, agencyName: agency?.agencyName || '', type: 'debit', amount, description: desc, balanceAfter: balance, createdAt: new Date().toISOString().split('T')[0] }]);
  }, [agencies]);

  const createWalletDeposit = useCallback((input: {
    agencyId: string;
    amount: number;
    method: 'card' | '1link' | 'bank_transfer';
    reference?: string;
    transferDate?: string;
    proofUrl?: string;
    notes?: string;
    requestedBy: string;
  }) => {
    const agency = agencies.find(a => a.agencyId === input.agencyId);
    if (!agency || input.amount <= 0) return undefined;
    const now = new Date().toISOString();
    const providerReference = input.method === 'bank_transfer' ? input.reference?.trim() : `${input.method.toUpperCase()}-${Date.now()}`;
    const duplicateProcessed = providerReference
      ? paymentWebhookEvents.some(event => event.providerReference === providerReference && event.status === 'processed')
      : false;
    const deposit: WalletDepositRequest = {
      depositId: `wd-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      agencyId: agency.agencyId,
      agencyName: agency.agencyName,
      amount: input.amount,
      method: input.method,
      status: input.method === 'bank_transfer' ? 'pending' : duplicateProcessed ? 'cancelled' : 'approved',
      reference: input.reference?.trim() || providerReference || `DEP-${Date.now()}`,
      providerReference,
      transferDate: input.transferDate,
      proofUrl: input.proofUrl,
      notes: input.notes,
      requestedBy: input.requestedBy,
      approvedBy: input.method === 'bank_transfer' ? undefined : 'payment-webhook',
      createdAt: now,
      approvedAt: input.method === 'bank_transfer' ? undefined : now,
    };
    setWalletDeposits(previous => [deposit, ...previous]);
    if (input.method !== 'bank_transfer' && providerReference) {
      const event: PaymentWebhookEvent = {
        eventId: `pwe-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        provider: input.method,
        providerReference,
        depositRequestId: deposit.depositId,
        status: duplicateProcessed ? 'duplicate' : 'processed',
        receivedAt: now,
      };
      setPaymentWebhookEvents(previous => [event, ...previous]);
      if (!duplicateProcessed) createApprovedLedgerCreditForDeposit(deposit, 'payment-webhook');
    }
    return deposit;
  }, [agencies, createApprovedLedgerCreditForDeposit, paymentWebhookEvents]);

  const approveWalletDeposit = useCallback((depositId: string, approvedBy: string) => {
    const deposit = walletDeposits.find(item => item.depositId === depositId);
    if (!deposit || deposit.status !== 'pending') return;
    const approvedAt = new Date().toISOString();
    setWalletDeposits(previous => previous.map(item => item.depositId === depositId ? { ...item, status: 'approved', approvedBy, approvedAt } : item));
    createApprovedLedgerCreditForDeposit({ ...deposit, status: 'approved', approvedBy, approvedAt }, approvedBy);
  }, [createApprovedLedgerCreditForDeposit, walletDeposits]);

  const rejectWalletDeposit = useCallback((depositId: string, rejectedBy: string, reason: string) => {
    setWalletDeposits(previous => previous.map(item => item.depositId === depositId && item.status === 'pending'
      ? { ...item, status: 'rejected', rejectedBy, rejectionReason: reason, rejectedAt: new Date().toISOString() }
      : item));
  }, []);

  const manualWalletAdjustment = useCallback((input: {
    agencyId: string;
    type: 'credit' | 'debit';
    amount: number;
    reason: string;
    createdBy: string;
  }) => {
    const agency = agencies.find(a => a.agencyId === input.agencyId);
    if (!agency || input.amount <= 0 || !input.reason.trim()) return false;
    const currentBalance = ledgerBalanceForAgency(input.agencyId);
    if (input.type === 'debit' && input.amount > currentBalance) return false;
    appendLedgerEntry({
      agencyId: agency.agencyId,
      agencyName: agency.agencyName,
      type: input.type,
      amount: input.amount,
      method: 'manual',
      status: 'approved',
      reference: `MANUAL-${Date.now()}`,
      description: input.reason.trim(),
      createdBy: input.createdBy,
      approvedBy: input.createdBy,
      approvedAt: new Date().toISOString(),
    });
    return true;
  }, [agencies, appendLedgerEntry, ledgerBalanceForAgency]);

  // Notifications
  const addNotification = useCallback((n: Omit<Notification, 'id'>) => setNotifications(p => [{ ...n, id: `n${Date.now()}` }, ...p]), []);
  const markNotificationRead = useCallback((id: string) => setNotifications(p => p.map(n => n.id === id ? { ...n, read: true } : n)), []);
  const markAllRead = useCallback(() => setNotifications(p => p.map(n => ({ ...n, read: true }))), []);

  // Users
  const addUser = useCallback((u: User) => setUsers(p => [...p, u]), []);
  const updateUser = useCallback((id: string, data: Partial<User>) => setUsers(p => p.map(u => u.userId === id ? { ...u, ...data } : u)), []);
  const deleteUser = useCallback((id: string) => setUsers(p => p.filter(u => u.userId !== id)), []);

  // Packages
  const addPackage = useCallback((pk: UmrahPackage) => {
    setPackages(p => [pk, ...p]);
    saveRemotePackage({ ...pk, category: "umrah" })
      .then(saved => setPackages(p => p.map(item => item.packageId === pk.packageId ? saved : item)))
      .catch(error => console.error("Unable to save Umrah package", error));
  }, []);
  const updatePackage = useCallback((id: string, data: Partial<UmrahPackage>) => setPackages(previous => {
    const existing = previous.find(pk => pk.packageId === id);
    if (!existing) return previous;
    const next = { ...existing, ...data, category: "umrah" as const };
    saveRemotePackage(next).catch(error => console.error("Unable to update Umrah package", error));
    return previous.map(pk => pk.packageId === id ? next : pk);
  }), []);
  const deletePackage = useCallback((id: string) => {
    const deletedAt = new Date().toISOString();
    setPackages(p => p.map(pk => pk.packageId === id ? { ...pk, deletedAt, status: 'inactive' } : pk));
    softDeleteRemotePackage("umrah", id).catch(error => console.error("Unable to delete Umrah package", error));
  }, []);
  // Coupons
  const addCoupon = useCallback((c: Coupon) => setCoupons(p => [...p, c]), []);
  const updateCoupon = useCallback((id: string, data: Partial<Coupon>) => setCoupons(p => p.map(c => c.couponId === id ? { ...c, ...data } : c)), []);
  const deleteCoupon = useCallback((id: string) => setCoupons(p => p.filter(c => c.couponId !== id)), []);

  // Flight search logs
  const addFlightSearchLog = useCallback((log: FlightSearchLog) => {
    setFlightSearchLogs(p => [log, ...p]);
    if (log.status === 'not_found') {
      setNotifications(p => [{ id: `n${Date.now()}`, title: 'No Flights Found', message: `Search for ${log.route} on ${log.date} returned no results`, type: 'system', read: false, createdAt: new Date().toISOString() }, ...p]);
    }
  }, []);

  // Payment links
  const addPaymentLink = useCallback((pl: PaymentLink) => setPaymentLinks(p => [...p, pl]), []);
  const updatePaymentLink = useCallback((id: string, data: Partial<PaymentLink>) => {
    setPaymentLinks(p => p.map(pl => pl.id === id ? { ...pl, ...data } : pl));
    if (data.status === 'paid') {
      const link = paymentLinks.find(pl => pl.id === id);
      if (link) {
        setNotifications(p => [{ id: `n${Date.now()}`, title: 'Payment Received', message: `Payment of $${link.amount.toLocaleString()} received from ${link.customerName}`, type: 'booking', read: false, createdAt: new Date().toISOString() }, ...p]);
      }
    }
  }, [paymentLinks]);

  // Payment config
  const updatePaymentConfig = useCallback((cfg: Partial<PaymentConfig>) => setPaymentConfig(p => ({ ...p, ...cfg })), []);

  // Secret keys
  const addSecretKey = useCallback((sk: SecretKey) => setSecretKeys(p => [...p, sk]), []);
  const updateSecretKey = useCallback((id: string, data: Partial<SecretKey>) => setSecretKeys(p => p.map(sk => sk.id === id ? { ...sk, ...data } : sk)), []);
  const deleteSecretKey = useCallback((id: string) => setSecretKeys(p => p.filter(sk => sk.id !== id)), []);

  return (
    <AdminContext.Provider value={{
      bookings, flights, hotels, agencies, transactions, notifications, tickets, users,
      packageLoadStatus, packages, coupons, blogPosts, flightSearchLogs, paymentLinks,
      paymentConfig, secretKeys, walletLedger, walletDeposits, paymentWebhookEvents,
      loadHotelContent,
      updateBookingStatus, addBooking, deleteBooking,
      addFlight, updateFlight, deleteFlight,
      addHotel, updateHotel, deleteHotel,
      addAgency, updateAgency,
      addTicket, updateTicket, deleteTicket, issueTicketForBooking,
      addWalletFunds, deductWalletFunds, createWalletDeposit, approveWalletDeposit, rejectWalletDeposit, manualWalletAdjustment,
      addNotification, markNotificationRead, markAllRead,
      addUser, updateUser, deleteUser,
      addPackage, updatePackage, deletePackage,
      addCoupon, updateCoupon, deleteCoupon,
      addFlightSearchLog, addPaymentLink, updatePaymentLink,
      updatePaymentConfig, addSecretKey, updateSecretKey, deleteSecretKey,
    }}>
      {children}
    </AdminContext.Provider>
  );
}

export function useAdmin() {
  const ctx = useContext(AdminContext);
  if (!ctx) throw new Error("useAdmin must be used within AdminProvider");
  return ctx;
}
