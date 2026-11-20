import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { EmailNotSentNotice } from "@/components/admin/bookings/EmailNotSentNotice";
import type { BookingDetail } from "@/lib/admin-bookings/types";

const api = vi.hoisted(() => ({ bookingByLink: vi.fn() }));
vi.mock("@/lib/public-booking", async original => ({ ...(await original<object>()), ...api }));
import BookingLinkPage from "./BookingLinkPage";
import { PublicBookingError } from "@/lib/public-booking";

const open = (token = "tok123") => render(
  <HelmetProvider><MemoryRouter initialEntries={[`/my-bookings/view/${token}`]}>
    <Routes><Route path="/my-bookings/view/:token" element={<BookingLinkPage />} /></Routes>
  </MemoryRouter></HelmetProvider>);

beforeEach(() => { api.bookingByLink.mockReset(); });

describe("booking link from an email", () => {
  it("opens that booking read-only, with WhatsApp prefilled with the reference", async () => {
    api.bookingByLink.mockResolvedValue({ reference: "TRV-ZL4HUF", product: "flight", status: "issued", payment_status: "paid",
      total: { amount_minor: 1_357_000, currency: "PKR" }, paid: { amount_minor: 1_357_000, currency: "PKR" }, airline_pnr: "EB2F2F",
      legs: [{ flight_number: "Z8259", origin: "KHI", destination: "ISB", departure_date: "2026-12-10" }], travelers: ["MR TEST CARDUAT"],
      tickets: ["9000000000672"], next_steps: "Your tickets are issued." });
    open();
    expect(await screen.findByText("TRV-ZL4HUF")).toBeInTheDocument();
    expect(api.bookingByLink).toHaveBeenCalledWith("tok123", expect.anything());
    expect(screen.getByText("Tickets issued")).toBeInTheDocument();
    expect(screen.getByText("9000000000672")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /pay/i })).not.toBeInTheDocument();       // read-only
    expect(screen.getByRole("link", { name: "Message us on WhatsApp" }).getAttribute("href")).toContain(encodeURIComponent("booking TRV-ZL4HUF"));
  });

  it("an expired link says so and offers Find my booking", async () => {
    api.bookingByLink.mockImplementation(() => Promise.reject(new PublicBookingError("This link has expired or isn't valid. Find your booking with its reference and your email or phone.", 404, "link_expired")));
    open("old-token");
    expect(await screen.findByRole("alert")).toHaveTextContent("This link has expired");
    expect(screen.getByRole("link", { name: "Find my booking" })).toHaveAttribute("href", "/find-booking");
  });
});

describe("Email not sent (admin)", () => {
  it("lists each customer email that wasn't sent, with SES's reason", () => {
    render(<EmailNotSentNotice booking={{ customer_email_problems: [{ email: "bank_transfer", at: "2026-11-20T10:00:00Z",
      reason: "refused by SES: the customer's address isn't verified (SES sandbox: only verified addresses receive email)" }] } as unknown as BookingDetail} />);
    expect(screen.getByText("Email not sent to the customer")).toBeInTheDocument();
    expect(screen.getByText("Bank transfer details")).toBeInTheDocument();
    expect(screen.getByText(/SES sandbox/)).toBeInTheDocument();
  });
});

describe("Email not sent: the hold-ended and cancelled emails (gateway#52)", () => {
  it("names them in plain words", () => {
    render(<EmailNotSentNotice booking={{ customer_email_problems: [
      { email: "hold_expired", at: "2026-11-21T10:00:00Z", reason: "failed (Throttling)" },
      { email: "booking_cancelled", at: "2026-11-21T11:00:00Z", reason: "failed (Throttling)" }] } as unknown as BookingDetail} />);
    expect(screen.getByText("2 emails not sent to the customer")).toBeInTheDocument();
    expect(screen.getByText("Hold ended")).toBeInTheDocument();
    expect(screen.getByText("Booking cancelled")).toBeInTheDocument();
  });
});
