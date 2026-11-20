import { useLocation } from "react-router-dom";
import { createContext, useContext, useState, useCallback, useEffect, useRef, ReactNode } from "react";
import {
  Booking, Flight, Hotel, Agency, Notification,
  TravelTicket, User, UmrahPackage, Coupon, BlogPost, BookingStatus,
} from "@/data/models";
import {
  listPackages as listRemotePackages,
  savePackage as saveRemotePackage,
  softDeletePackage as softDeleteRemotePackage,
} from "@/lib/package-api";
import {
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

interface AdminState {
  // Data
  bookings: Booking[];
  flights: Flight[];
  hotels: Hotel[];
  agencies: Agency[];
  notifications: Notification[];
  tickets: TravelTicket[];
  users: User[];
  packageLoadStatus: "idle" | "loading" | "success" | "error";
  packages: UmrahPackage[];
  coupons: Coupon[];
  blogPosts: BlogPost[];
  flightSearchLogs: FlightSearchLog[];

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


}

const AdminContext = createContext<AdminState | undefined>(undefined);

const initialSearchLogs: FlightSearchLog[] = [];
/** Browser keys the old fake Finance → Wallets / Payments screens wrote (#73). Cleared on load, so no fake balance or
 *  ledger stays in a browser; the real data will come from the gateway (#68, #69). */
export const RETIRED_FINANCE_KEYS = ["travelian:wallet-ledger", "travelian:wallet-deposits", "travelian:payment-webhook-events"];

export function clearRetiredFinanceData() {
  try {
    for (const key of RETIRED_FINANCE_KEYS) window.localStorage.removeItem(key);
  } catch {
    // storage blocked: nothing to clear
  }
}

export function AdminProvider({ children }: { children: ReactNode }) {
  const { pathname, search } = useLocation();
  // The admin no longer loads Umrah packages (Umrah is hidden) or the old /content/tickets list (tickets come
  // from the gateway): those /content calls failed on every admin page.
  const needsUmrah = pathname.startsWith("/umrah") || pathname === "/request-booking" || (pathname === "/booking" && new URLSearchParams(search).get("type") === "umrah");
  const [packageLoadStatus, setPackageLoadStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [flights, setFlights] = useState<Flight[]>([]);
  const [hotels, setHotels] = useState<Hotel[]>([]);
  const [agencies, setAgencies] = useState<Agency[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [tickets, setTickets] = useState<TravelTicket[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [packages, setPackages] = useState<UmrahPackage[]>([]);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [blogPosts] = useState<BlogPost[]>([]);
  const [flightSearchLogs, setFlightSearchLogs] = useState<FlightSearchLog[]>(initialSearchLogs);
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

  // Hotel content is loaded on demand via loadHotelContent (Home, admin hotel search).
  useEffect(clearRetiredFinanceData, []);

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

  return (
    <AdminContext.Provider value={{
      bookings, flights, hotels, agencies, notifications, tickets, users,
      packageLoadStatus, packages, coupons, blogPosts, flightSearchLogs,
      loadHotelContent,
      updateBookingStatus, addBooking, deleteBooking,
      addFlight, updateFlight, deleteFlight,
      addHotel, updateHotel, deleteHotel,
      addAgency, updateAgency,
      addTicket, updateTicket, deleteTicket, issueTicketForBooking,
      addNotification, markNotificationRead, markAllRead,
      addUser, updateUser, deleteUser,
      addPackage, updatePackage, deletePackage,
      addCoupon, updateCoupon, deleteCoupon,
      addFlightSearchLog,
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
