import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
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

describe("Checkout summary duration (#153)", () => {
  const segment = { flightNumber: "EX786", origin: "LHE", destination: "DXB", departureTime: "2026-12-08 11:50", arrivalTime: "2026-12-08 14:35", departureTimestamp: "2026-12-08 11:50", arrivalTimestamp: "2026-12-08 14:35", duration: "3h 45m" };

  it("shows the flight's own duration across time zones and Non-stop", () => {
    renderAt(url({ segments: JSON.stringify([segment]) }));
    const line = screen.getByTestId("checkout-journeys");
    expect(within(line).getByText("Total Duration: 3h 45m")).toBeInTheDocument();
    expect(within(line).getByText("Non-stop")).toBeInTheDocument();
    expect(screen.queryByText(/2h 45m|0 Stops/)).not.toBeInTheDocument();
  });

  it("shows each direction of a round trip", () => {
    const back = { ...segment, flightNumber: "EX787", origin: "DXB", destination: "LHE", departureTime: "2026-12-15 16:00", arrivalTime: "2026-12-15 20:10", departureTimestamp: "2026-12-15 16:00", arrivalTimestamp: "2026-12-15 20:10", duration: "3h 10m" };
    renderAt(url({ trip: "roundtrip", return: "Dec 15, 2026", segments: JSON.stringify([segment, back]) }));
    const line = screen.getByTestId("checkout-journeys");
    expect(within(line).getByText("Outbound: 3h 45m")).toBeInTheDocument();
    expect(within(line).getByText("Return: 3h 10m")).toBeInTheDocument();
  });
});

describe("Phone checkout action bar (#156)", () => {
  const setWidth = (width: number) => Object.defineProperty(window, "innerWidth", { configurable: true, writable: true, value: width });
  afterEach(() => { setWidth(1024); document.body.classList.remove("has-checkout-action-bar"); });

  it("keeps the total, travelers and Continue in a bottom bar on phones, and opens the fare summary", async () => {
    setWidth(390);
    renderAt(url({ adults: "2", children: "1", infants: "1" }));
    const bar = await screen.findByTestId("checkout-action-bar");
    expect(within(bar).getByText("PKR 180,000")).toBeInTheDocument();
    expect(within(bar).getByText("4 Travelers")).toBeInTheDocument();
    expect(within(bar).getByRole("button", { name: /^Continue/ })).toBeInTheDocument();
    expect(document.body).toHaveClass("has-checkout-action-bar");
    fireEvent.click(within(bar).getByRole("button", { name: /Show fare summary/ }));
    const sheet = await screen.findByRole("dialog", { name: "Fare summary" });
    expect(within(sheet).getByText("Total")).toBeInTheDocument();
  });

  it("steps aside while a text field has focus (keyboard up)", async () => {
    setWidth(360);
    renderAt(url());
    const bar = await screen.findByTestId("checkout-action-bar");
    const phone = document.getElementById("contact-phone") as HTMLInputElement;
    phone.focus();
    await waitFor(() => expect(bar).toHaveClass("hidden"));
    phone.blur();
    await waitFor(() => expect(bar).not.toHaveClass("hidden"));
  });

  it("is not shown on wider screens", () => {
    setWidth(1024);
    renderAt(url());
    expect(screen.queryByTestId("checkout-action-bar")).not.toBeInTheDocument();
  });
});
