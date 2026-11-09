// Bookings sub-menus (spec 7, mockups bookings-*) and Booking detail tabs
// (spec 7 "Booking detail tabs", mockups booking-detail-*). Each is its own URL.

import type { BookingProduct } from "./types";

export const BOOKINGS_BASE = "/admin/bookings";

export interface BookingsTab {
  slug: string;
  label: string;
  /** Product filter sent to the gateway; undefined for All Bookings. */
  product?: BookingProduct;
}

export const BOOKINGS_TABS: BookingsTab[] = [
  { slug: "", label: "All Bookings" },
  { slug: "flights", label: "Flights", product: "flight" },
  { slug: "group-ticketing", label: "Group Ticketing", product: "group" },
  { slug: "hotels", label: "Hotels", product: "hotel" },
  { slug: "umrah", label: "Umrah", product: "umrah" },
  { slug: "inquiries-requests", label: "Inquiries & Requests" },
  { slug: "quotations", label: "Quotations" },
];

export const bookingsTabPath = (tab: BookingsTab) => (tab.slug ? `${BOOKINGS_BASE}/${tab.slug}` : BOOKINGS_BASE);

export type DetailTabSlug =
  | "overview" | "itinerary" | "passengers" | "fare" | "payments" | "supplier-payment" | "tickets" | "servicing" | "audit";

export const DETAIL_TABS: { slug: DetailTabSlug; label: string }[] = [
  { slug: "overview", label: "Overview" },
  { slug: "itinerary", label: "Itinerary" },
  { slug: "passengers", label: "Passengers" },
  { slug: "fare", label: "Fare" },
  { slug: "payments", label: "Payments" },
  { slug: "supplier-payment", label: "Supplier payment" },
  { slug: "tickets", label: "Tickets" },
  { slug: "servicing", label: "Servicing" },
  { slug: "audit", label: "Audit" },
];

export const bookingDetailPath = (bookingId: string, tab: DetailTabSlug = "overview") =>
  `${BOOKINGS_BASE}/${encodeURIComponent(bookingId)}${tab === "overview" ? "" : `/${tab}`}`;
