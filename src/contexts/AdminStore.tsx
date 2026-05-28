import { createContext, useContext, useState, useCallback, ReactNode } from "react";
import {
  Booking, Flight, Hotel, Agency, WalletTransaction, Notification,
  TravelTicket, User, UmrahPackage, Coupon, BlogPost, BookingStatus,
} from "@/data/mock";

// ─── Flight Search Log ───
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

// ─── Payment Link ───
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

// ─── Payment Config ───
export interface PaymentConfig {
  cardEnabled: boolean;
  walletEnabled: boolean;
  bankTransferEnabled: boolean;
  visaEnabled: boolean;
  mastercardEnabled: boolean;
  testMode: boolean;
}

// ─── Secret Key ───
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
  packages: UmrahPackage[];
  tourPackages: UmrahPackage[];
  visaPackages: UmrahPackage[];
  coupons: Coupon[];
  blogPosts: BlogPost[];
  flightSearchLogs: FlightSearchLog[];
  paymentLinks: PaymentLink[];
  paymentConfig: PaymentConfig;
  secretKeys: SecretKey[];

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
  issueTicketForBooking: (bookingId: string) => void;

  // Wallet actions
  addWalletFunds: (agencyId: string, amount: number, desc: string) => void;
  deductWalletFunds: (agencyId: string, amount: number, desc: string) => void;

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

export function AdminProvider({ children }: { children: ReactNode }) {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [flights, setFlights] = useState<Flight[]>([]);
  const [hotels, setHotels] = useState<Hotel[]>([]);
  const [agencies, setAgencies] = useState<Agency[]>([]);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [tickets, setTickets] = useState<TravelTicket[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [packages, setPackages] = useState<UmrahPackage[]>([]);
  const [tourPackages] = useState<UmrahPackage[]>([]);
  const [visaPackages] = useState<UmrahPackage[]>([]);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [blogPosts] = useState<BlogPost[]>([]);
  const [flightSearchLogs, setFlightSearchLogs] = useState<FlightSearchLog[]>(initialSearchLogs);
  const [paymentLinks, setPaymentLinks] = useState<PaymentLink[]>(initialPaymentLinks);
  const [paymentConfig, setPaymentConfig] = useState<PaymentConfig>({
    cardEnabled: true, walletEnabled: true, bankTransferEnabled: true,
    visaEnabled: true, mastercardEnabled: true, testMode: true,
  });
  const [secretKeys, setSecretKeys] = useState<SecretKey[]>(initialSecretKeys);

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
    setTickets(p => [...p, t]);
    setNotifications(p => [{ id: `n${Date.now()}`, title: 'Ticket Issued', message: `Ticket ${t.ticketNumber} issued for ${t.passengerName}`, type: 'booking', read: false, createdAt: new Date().toISOString() }, ...p]);
  }, []);
  const updateTicket = useCallback((id: string, data: Partial<TravelTicket>) => setTickets(p => p.map(t => t.ticketId === id ? { ...t, ...data } : t)), []);
  const issueTicketForBooking = useCallback((bookingId: string) => {
    const booking = bookings.find(b => b.bookingId === bookingId);
    if (!booking) return;
    const newTicket: TravelTicket = {
      ticketId: `tk${Date.now()}`, bookingId, passengerName: booking.customerName,
      type: 'flight', origin: 'Origin', destination: 'Destination',
      departureDate: booking.departureDate, seatNumber: `${Math.floor(Math.random() * 30 + 1)}${['A','B','C','D'][Math.floor(Math.random()*4)]}`,
      status: 'issued', price: booking.totalAmount, ticketNumber: `TKT-${Date.now().toString(36).toUpperCase()}`,
    };
    addTicket(newTicket);
    updateBookingStatus(bookingId, 'confirmed');
  }, [bookings, addTicket, updateBookingStatus]);

  // Wallet
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

  // Notifications
  const addNotification = useCallback((n: Omit<Notification, 'id'>) => setNotifications(p => [{ ...n, id: `n${Date.now()}` }, ...p]), []);
  const markNotificationRead = useCallback((id: string) => setNotifications(p => p.map(n => n.id === id ? { ...n, read: true } : n)), []);
  const markAllRead = useCallback(() => setNotifications(p => p.map(n => ({ ...n, read: true }))), []);

  // Users
  const addUser = useCallback((u: User) => setUsers(p => [...p, u]), []);
  const updateUser = useCallback((id: string, data: Partial<User>) => setUsers(p => p.map(u => u.userId === id ? { ...u, ...data } : u)), []);
  const deleteUser = useCallback((id: string) => setUsers(p => p.filter(u => u.userId !== id)), []);

  // Packages
  const addPackage = useCallback((pk: UmrahPackage) => setPackages(p => [...p, pk]), []);
  const updatePackage = useCallback((id: string, data: Partial<UmrahPackage>) => setPackages(p => p.map(pk => pk.packageId === id ? { ...pk, ...data } : pk)), []);
  const deletePackage = useCallback((id: string) => setPackages(p => p.filter(pk => pk.packageId !== id)), []);

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
      packages, tourPackages, visaPackages, coupons, blogPosts, flightSearchLogs, paymentLinks,
      paymentConfig, secretKeys,
      updateBookingStatus, addBooking, deleteBooking,
      addFlight, updateFlight, deleteFlight,
      addHotel, updateHotel, deleteHotel,
      addAgency, updateAgency,
      addTicket, updateTicket, issueTicketForBooking,
      addWalletFunds, deductWalletFunds,
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
