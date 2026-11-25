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
import { chooseOption } from "@/test/pick-date";

Element.prototype.scrollIntoView ??= function scrollIntoView() {};
globalThis.ResizeObserver ??= class { observe() {} unobserve() {} disconnect() {} } as unknown as typeof ResizeObserver;
Element.prototype.hasPointerCapture ??= () => false;
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
  await screen.findByRole("heading", { name: "Review Booking" });
  fireEvent.click(screen.getByRole("checkbox", { name: /match the passport/ }));
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

describe("Traveler details and Review (#155)", () => {
  it("flags digits in a name as it is typed, and warns on a long name", () => {
    renderAt(url());
    const first = document.getElementById("passenger-0-firstName") as HTMLInputElement;
    fireEvent.change(first, { target: { value: "Ali123 @#" } });
    expect(screen.getByText("Use letters only, as on the passport")).toBeInTheDocument();
    expect(first).toHaveAttribute("aria-invalid", "true");
    fireEvent.change(first, { target: { value: "A".repeat(30) } });
    fireEvent.change(document.getElementById("passenger-0-lastName") as HTMLInputElement, { target: { value: "B".repeat(25) } });
    expect(screen.queryByText("Use letters only, as on the passport")).not.toBeInTheDocument();
    expect(screen.getByText(/Airlines may shorten long names/)).toBeInTheDocument();
  });

  it("removes spaces from a passport number and capitalises it", () => {
    renderAt(url());
    const passport = document.getElementById("passenger-0-docNumber") as HTMLInputElement;
    fireEvent.change(passport, { target: { value: "ab 1234567" } });
    expect(passport).toHaveValue("AB1234567");
  });

  it("starts with Gender from the Title (Mr: Male) and Mrs sets Female", () => {
    renderAt(url());
    expect(document.getElementById("passenger-0-gender")).toHaveTextContent("Male");
    chooseOption(document.getElementById("passenger-0-title") as HTMLElement, "Mrs");
    expect(document.getElementById("passenger-0-gender")).toHaveTextContent("Female");
  });

  it("date of birth can be typed DD/MM/YYYY", () => {
    renderAt(url());
    const dob = document.getElementById("passenger-0-dob") as HTMLInputElement;
    fireEvent.change(dob, { target: { value: "14031990" } });
    expect(dob).toHaveValue("14/03/1990");
  });

  it("Review lists every traveler's full name, contact and total, and asks for the names check there", async () => {
    const params = new URLSearchParams(url({ adults: "2", children: "1", infants: "1" }).split("?")[1]);
    const form = (passengerType: string, label: string, title: string, firstName: string, lastName: string, dob: string) => ({
      passengerType, label, title, firstName, lastName, gender: title === "mrs" || title === "miss" ? "female" : "male", dob,
      docNumber: "AB123456", expiryDate: "2032-01-01", nationality: "Pakistan", issuanceCountry: "Pakistan",
    });
    localStorage.setItem(`travelian.bookingDraft.${params.toString()}`, JSON.stringify({
      passengerForms: [
        form("adult", "Adult 1", "mr", "Ali", "Khan", "1990-01-01"), form("adult", "Adult 2", "mrs", "Ayesha", "Khan", "1992-05-05"),
        form("child", "Child 1", "master", "Omar", "Khan", "2019-03-03"), form("infant", "Infant 1", "miss", "Sara", "Khan", "2026-01-10"),
      ],
      email: "traveller@example.invalid", phoneCode: "+92", phone: "3001234567",
    }));
    renderAt(`/booking?${params.toString()}`);
    await waitFor(() => expect(screen.getByDisplayValue("3001234567")).toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: /^Continue/ }));
    await screen.findByRole("heading", { name: "Review Booking" });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    const list = screen.getByTestId("review-travelers");
    expect(within(list).getAllByRole("listitem").map(item => item.firstChild?.textContent)).toEqual(["Mr Ali KHAN", "Mrs Ayesha KHAN", "Mstr Omar KHAN", "Miss Sara KHAN"]);
    expect(screen.getByText("+92 3001234567")).toBeInTheDocument();
    expect(screen.getByText("traveller@example.invalid")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /^Continue/ }));
    expect(screen.getByText("Tick the box to confirm the names before you continue.")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Payment Method" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("checkbox", { name: /match the passport/ }));
    fireEvent.click(screen.getByRole("button", { name: /^Continue/ }));
    await screen.findByRole("heading", { name: "Payment Method" });
  });
});

describe("Checkout total for several travelers (#113)", () => {
  it("shows the gateway's total for all travelers from the results link, not the per-adult price x travelers", () => {
    renderAt(url({ adults: "2", children: "1", price: "21828", total: "62830" }));
    expect(screen.getAllByText("PKR 62,830").length).toBeGreaterThan(0);
    expect(screen.queryByText("PKR 65,484")).not.toBeInTheDocument(); // 21,828 x 3
  });

  it("without a gateway total keeps the old per-adult x travelers total", () => {
    renderAt(url({ adults: "2", price: "21828" }));
    expect(screen.getAllByText("PKR 43,656").length).toBeGreaterThan(0);
  });
});

describe("Traveler Details form (#167)", () => {
  it("has no name, passport or mobile helper texts and no Alternate Mobile Number; Email and Mobile share a row", () => {
    renderAt(url());
    for (const text of ["Name must match exactly as shown on your passport.", "This airline needs the traveler's passport for this flight.",
      "Use the passport number without spaces.", "Travelian will use this number for ticketing updates and support."]) {
      expect(screen.queryByText(text)).not.toBeInTheDocument();
    }
    expect(screen.queryByText("Alternate Mobile Number")).not.toBeInTheDocument();
    const email = document.querySelector('[data-error-key="email"]')!;
    const phone = document.querySelector('[data-error-key="phone"]')!;
    expect(email.parentElement).toBe(phone.parentElement);
    expect(email.className).not.toMatch(/col-span-2/);
    expect(phone.className).not.toMatch(/col-span-2/);
    // Date of Expiry is a half-width cell right after Country of Issuance.
    const expiry = document.querySelector('[data-error-key="passenger-0-expiryDate"]')!;
    // Half width from md (the phone layout gives it the full width, below Nationality | Country of Issuance).
    expect(expiry.className).toMatch(/md:col-span-1/);
    expect(expiry.previousElementSibling).toHaveTextContent("Country of Issuance *");
  });
});
