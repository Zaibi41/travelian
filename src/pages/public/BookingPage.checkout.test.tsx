import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { UserRole } from "@/data/models";

// #149: checkout shows only real cancellation / refund information and traveller wording.
// Gateway calls are mocked with made-up values.
vi.mock("@/contexts/AdminStore", () => ({ useAdmin: () => ({ packages: [], tourPackages: [], visaPackages: [], packageLoadStatus: "success" }) }));
const role = vi.hoisted(() => ({ current: "customer" as UserRole }));
vi.mock("@/contexts/RoleContext", () => ({ useRole: () => ({ currentRole: role.current, setCurrentRole: () => {}, currentUser: { name: "", email: "" } }) }));
const booking = vi.hoisted(() => ({
  getPaymentMethods: vi.fn(), getFlightDocuments: vi.fn(), getFlightPaymentOptions: vi.fn(), requestPublicFlight: vi.fn(),
}));
vi.mock("@/lib/public-booking", async importOriginal => ({ ...(await importOriginal<object>()), ...booking }));

import { LocaleProvider } from "@/contexts/LocaleContext";
import { TooltipProvider } from "@/components/ui/tooltip";
import BookingPage from "./BookingPage";

Element.prototype.scrollIntoView ??= function scrollIntoView() {};
window.scrollTo = (() => {}) as typeof window.scrollTo;

const FLIGHT = {
  type: "flight", flightId: "f1", airline: "Example Air", flightNo: "EX786", from: "LHE", to: "DXB", date: "Dec 08, 2026",
  cabin: "Economy", trip: "oneway", adults: "1", children: "0", infants: "0", price: "45000", currency: "PKR", fare: "Nil Baggage",
  searchId: "s-1", fareIds: "fare-1",
};
const url = (extra: Record<string, string> = {}) => `/booking?${new URLSearchParams({ ...FLIGHT, ...extra }).toString()}`;
const renderAt = (target: string) => render(
  <HelmetProvider><LocaleProvider><TooltipProvider><MemoryRouter initialEntries={[target]}><BookingPage /></MemoryRouter></TooltipProvider></LocaleProvider></HelmetProvider>,
);

beforeEach(() => {
  role.current = "customer";
  localStorage.clear();
  booking.getPaymentMethods.mockResolvedValue({ card: false, bank_transfer: false, jazzcash: false, flights: false });
  booking.getFlightDocuments.mockResolvedValue({ documents: [] });
  booking.getFlightPaymentOptions.mockResolvedValue(null);
  booking.requestPublicFlight.mockResolvedValue({
    reference: "TRV-REQ-1", access_token: "t", booking: { live: false, total: { amount_minor: 4_500_000, currency: "PKR" } },
  });
});

const INTERNAL = /supplier|admin|wallet payment configuration|book only|free cancellation/i;

describe("Checkout cancellation and refund information (#149)", () => {
  it("never shows a free-cancellation deadline the fare does not carry", () => {
    renderAt(url());
    expect(screen.queryByText(/free cancellation/i)).not.toBeInTheDocument();
    expect(screen.getByText("Cancellation and refund rules: as per airline fare rules.")).toBeInTheDocument();
  });

  it("shows nothing about refundability when the fare data does not say", () => {
    renderAt(url());
    expect(screen.queryByText(/^Refundable/)).not.toBeInTheDocument();
    expect(screen.queryByText(/^Non-refundable/)).not.toBeInTheDocument();
  });

  it("shows Refundable only when the fare says refundable", () => {
    renderAt(url({ refund: "refundable" }));
    expect(screen.getAllByText("Refundable", { exact: false }).length).toBeGreaterThan(0);
    expect(screen.queryByText(/Non-refundable/)).not.toBeInTheDocument();
  });

  it("shows Non-refundable when the fare says so", () => {
    renderAt(url({ refund: "non_refundable" }));
    expect(screen.getAllByText(/Non-refundable/).length).toBeGreaterThan(0);
    expect(screen.queryByText(/^Refundable/)).not.toBeInTheDocument();
  });

  it("treats a group fare as non-refundable", () => {
    const { searchId: _s, fareIds: _f, ...rest } = FLIGHT;
    render(<HelmetProvider><LocaleProvider><TooltipProvider><MemoryRouter initialEntries={[`/booking?${new URLSearchParams({ ...rest, groupTicketId: "g1" })}`]}><BookingPage /></MemoryRouter></TooltipProvider></LocaleProvider></HelmetProvider>);
    expect(screen.getAllByText(/Non-refundable/).length).toBeGreaterThan(0);
  });

  it("ignores an unknown refund value in the link", () => {
    renderAt(url({ refund: "maybe" }));
    expect(screen.queryByText(/^Refundable/)).not.toBeInTheDocument();
    expect(screen.queryByText(/^Non-refundable/)).not.toBeInTheDocument();
  });
});

function fillDraft() {
  const params = new URLSearchParams(url().split("?")[1]);
  localStorage.setItem(`travelian.bookingDraft.${params.toString()}`, JSON.stringify({
    passengerForms: [{
      passengerType: "adult", label: "Adult 1", title: "mr", firstName: "Test", lastName: "Traveller", gender: "male",
      dob: "1990-01-01", docNumber: "AB123456", expiryDate: "2032-01-01", nationality: "Pakistan", issuanceCountry: "Pakistan",
    }],
    email: "traveller@example.invalid", phoneCode: "+92", phone: "3001234567",
  }));
}

async function goToPayment() {
  fillDraft();
  renderAt(url());
  await waitFor(() => expect(screen.getByDisplayValue("3001234567")).toBeInTheDocument());
  fireEvent.click(screen.getByRole("button", { name: /^Continue/ }));
  const dialog = await screen.findByRole("dialog", { name: "Confirm traveler names" });
  fireEvent.click(within(dialog).getByRole("checkbox"));
  fireEvent.click(within(dialog).getByRole("button", { name: "Continue" }));
  await screen.findByRole("heading", { name: "Review Booking" });
  expect(document.body.textContent).not.toMatch(INTERNAL);
  fireEvent.click(screen.getByRole("button", { name: /^Continue/ }));
  await screen.findByRole("heading", { name: "Payment Method" });
}

describe("Checkout wording (#149)", () => {
  it("has no internal words on traveller details", () => {
    renderAt(url({ refund: "refundable", currency: "USD" }));
    expect(screen.getByText("We confirm your fare before ticketing")).toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(INTERNAL);
    expect(screen.queryByText(/Live Supplier Fare/)).not.toBeInTheDocument();
  });

  it("has no internal words on review and payment for a customer", async () => {
    await goToPayment();
    expect(document.body.textContent).not.toMatch(INTERNAL);
  });

  it("Reserve now, pay later sends the same book-only request as before", async () => {
    role.current = "agency_owner";
    await goToPayment();
    expect(screen.queryByRole("button", { name: "Book Only" })).not.toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(INTERNAL);
    fireEvent.click(screen.getByRole("button", { name: "Reserve now, pay later" }));
    await waitFor(() => expect(booking.requestPublicFlight).toHaveBeenCalledTimes(1));
    expect(booking.requestPublicFlight.mock.calls[0][0]).toMatchObject({ searchId: "s-1", fareIds: ["fare-1"], paymentMethod: "book_only" });
    expect(await screen.findByRole("heading", { name: "Booking Request Received" })).toBeInTheDocument();
  });
});
