import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { beforeEach, describe, expect, it, vi } from "vitest";

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
