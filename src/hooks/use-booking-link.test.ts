import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { clearSession, setSession } from "@/lib/auth-session";
import { bookingLinkFor, useBookingLink } from "./use-booking-link";

afterEach(() => clearSession());

describe("booking link (#159)", () => {
  it("guests get Find my booking, signed-in customers My Bookings", () => {
    expect(bookingLinkFor(false)).toEqual({ label: "Find my booking", href: "/find-booking" });
    expect(bookingLinkFor(true)).toEqual({ label: "My Bookings", href: "/my-bookings" });
  });

  it("follows sign in and sign out", () => {
    const { result } = renderHook(() => useBookingLink());
    expect(result.current.href).toBe("/find-booking");
    act(() => setSession({ email: "ali@example.invalid", name: "Ali", createdAt: new Date().toISOString() }));
    expect(result.current).toEqual({ label: "My Bookings", href: "/my-bookings" });
    act(() => clearSession());
    expect(result.current.label).toBe("Find my booking");
  });
});
