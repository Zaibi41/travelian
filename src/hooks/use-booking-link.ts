import { useEffect, useState } from "react";
import { getSession, onSessionEvent } from "@/lib/auth-session";

export interface BookingLink { label: "Find my booking" | "My Bookings"; href: "/find-booking" | "/my-bookings" }

/** #159: where a customer finds their booking: "My Bookings" when signed in, "Find my booking" (by reference) for guests. */
export const bookingLinkFor = (signedIn: boolean): BookingLink =>
  signedIn ? { label: "My Bookings", href: "/my-bookings" } : { label: "Find my booking", href: "/find-booking" };

export function useBookingLink(): BookingLink {
  const [signedIn, setSignedIn] = useState(() => Boolean(getSession()));
  useEffect(() => onSessionEvent(() => setSignedIn(Boolean(getSession()))), []);
  return bookingLinkFor(signedIn);
}
