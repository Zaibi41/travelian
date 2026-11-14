import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GatewayError } from "@/lib/gateway/client";
import type { GroupHoldView } from "@/lib/admin-search/group-holds";

// Search > Group Ticketing booking flow (mockup PDF docs/2026-11-14 pages 10-13). Gateway calls
// are mocked with made-up values; no real people or documents.
const gateway = vi.hoisted(() => ({
  fetchGroupTicket: vi.fn(), holdGroupSeats: vi.fn(), fetchGroupHold: vi.fn(), issueGroupTickets: vi.fn(), releaseGroupHold: vi.fn(),
}));
vi.mock("@/lib/admin-search/group-holds", async importOriginal => ({ ...(await importOriginal<object>()), ...gateway }));
const bookings = vi.hoisted(() => ({ fetchPaymentAccounts: vi.fn(), recordPayment: vi.fn() }));
vi.mock("@/lib/admin-bookings/api", () => bookings);
const people = vi.hoisted(() => ({ searchPeople: vi.fn() }));
vi.mock("@/lib/saved-people/api", async importOriginal => ({ ...(await importOriginal<object>()), searchPeople: people.searchPeople }));

import GroupHoldPage from "./GroupHoldPage";
import GroupHeldPage from "./GroupHeldPage";
import GroupBookingPage from "./GroupBookingPage";

globalThis.ResizeObserver ??= class { observe() {} unobserve() {} disconnect() {} } as unknown as typeof ResizeObserver;
Element.prototype.hasPointerCapture ??= () => false;
Element.prototype.releasePointerCapture ??= () => {};
Element.prototype.scrollIntoView ??= function scrollIntoView() {};

const rs = (rupees: number) => ({ amount_minor: rupees * 100, currency: "PKR" });
const TICKET = { id: "t1", sector: "ISB - JED", departure_date: "2026-11-22", departure_time: "06:40", airline: "Fly Jinnah", remaining: 12, baggage: "20+7", stock: "supplier" as const, can_hold: true };
const in30 = () => new Date(Date.now() + 30 * 60_000).toISOString();
const HELD: GroupHoldView = {
  booking_id: "TRV-GRP-000123", pnr: "K7P2QX", status: "held", hold_expires_at: in30(), adults: 2,
  flight: { airline: "Fly Jinnah", sector: "ISB - JED", departure_date: "2026-11-22", departure_time: "06:40" }, stock: "supplier",
  price_per_adult: rs(118_500), total: rs(237_000), amount_paid: rs(0), amount_due: rs(237_000), payment_status: "unpaid",
  customer: { name: "Ali Raza", phone: "+92 3001234567", email: "a@example.invalid" },
  travelers: [
    { position: 0, title: "MR", first_name: "Ali", last_name: "Raza", id_type: "PSPT", document_number_masked: "AB•••4567", date_of_birth_masked: "1988-••-••" },
    { position: 1, title: "MRS", first_name: "Sana", last_name: "Raza", id_type: "PSPT", document_number_masked: "AB•••4567", date_of_birth_masked: "1990-••-••" },
  ],
  payments: [], can_record_payments: true, can_issue_tickets: true, can_release: true,
};
const PAID: GroupHoldView = {
  ...HELD, amount_paid: rs(237_000), amount_due: rs(0), payment_status: "paid",
  payments: [{ id: "pay1", method: "bank_transfer", received_into: "Meezan Bank, Travelian current account", amount: rs(237_000), reference: "TRV-PAY-1", received_at: "2026-11-14T10:00:00Z" }],
};
const ACCOUNTS = { accounts: [{ id: "acct-0001", method: "bank_transfer", label: "Meezan Bank, Travelian current account" }, { id: "acct-0002", method: "jazzcash", label: "JazzCash, Travelian business wallet" }] };
const SAVED = { id: "p-00000001", title: "MR", first_name: "Ali", last_name: "Raza", nationality: "PAK", phone_masked: "+92 •••••••567", email_masked: "a•••@example.invalid",
  documents: [{ id: "d-00000001", id_type: "PSPT", document_country: "PAK", document_number_masked: "AB•••4567" }], match: "document" };

const location = { current: "" };
function Probe() {
  const here = useLocation();
  location.current = `${here.pathname}${here.search}`;
  return null;
}
const renderAt = (url: string, state?: unknown) =>
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })}>
      <MemoryRouter initialEntries={[{ pathname: url.split("?")[0], search: url.includes("?") ? `?${url.split("?")[1]}` : "", state }]}>
        <Routes>
          <Route path="/admin/search/group-ticketing/hold" element={<GroupHoldPage />} />
          <Route path="/admin/search/group-ticketing/held/:bookingId" element={<GroupHeldPage />} />
          <Route path="/admin/bookings/group-ticketing/:bookingId/:tab" element={<GroupBookingPage />} />
          <Route path="*" element={<p>elsewhere</p>} />
        </Routes>
        <Probe />
      </MemoryRouter>
    </QueryClientProvider>,
  );
const HOLD_URL = "/admin/search/group-ticketing/hold?ticket=t1&from=ISB&to=JED&date=2026-11-22&adults=2";

beforeEach(() => {
  vi.clearAllMocks();
  gateway.fetchGroupTicket.mockResolvedValue(TICKET);
  gateway.fetchGroupHold.mockResolvedValue(HELD);
  bookings.fetchPaymentAccounts.mockResolvedValue(ACCOUNTS);
  people.searchPeople.mockResolvedValue({ results: [SAVED] });
});

async function fillTravelers() {
  fireEvent.change(screen.getByLabelText("Full name"), { target: { value: "Ali Raza" } });
  fireEvent.change(screen.getByLabelText("Phone"), { target: { value: "+92 300 1234567" } });
  fireEvent.change(screen.getByLabelText("Email"), { target: { value: "ali.raza@example.invalid" } });
  fireEvent.change(screen.getByLabelText("Document number"), { target: { value: "AB1234567" } });
  const adult2 = screen.getByRole("region", { name: "Adult 2" });
  fireEvent.change(within(adult2).getByLabelText("Given name"), { target: { value: "Sana" } });
  fireEvent.change(within(adult2).getByLabelText("Surname"), { target: { value: "Raza" } });
  fireEvent.change(within(adult2).getByLabelText("Passport number"), { target: { value: "CD7654321" } });
}

describe("Hold group seats (step 2)", () => {
  it("one card per adult from the search, adults only; the price is shown after the hold; stock label without a supplier name", async () => {
    renderAt(HOLD_URL);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Hold group seats");
    expect(screen.getByRole("list", { name: "Booking steps" })).toHaveTextContent(/Search results.*Traveler details.*Hold seats.*Payment and tickets/);
    expect(screen.getByRole("listitem", { current: "step" })).toHaveTextContent("Traveler details");
    expect(screen.getByRole("region", { name: "Adult 1" })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Adult 2" })).toBeInTheDocument();
    expect(screen.queryByText(/Child|Infant/)).not.toBeInTheDocument();
    const fare = await screen.findByRole("complementary", { name: "Selected group fare" });
    await within(fare).findByText("Fly Jinnah");
    expect(fare).toHaveTextContent("ISB - JED, 22 Nov 2026 06:40");
    expect(fare).toHaveTextContent("Passengers2 adults");
    expect(fare).toHaveTextContent("StockSupplier");
    expect(fare).toHaveTextContent("PriceShown after hold");
    expect(fare).not.toHaveTextContent(/Rs\s|dhillu|skypass/);
    expect(within(fare).getByRole("button", { name: "Hold seats" })).toBeEnabled();
    // Adult 1's name and passport come from the customer while "The customer is also Adult 1" is ticked.
    fireEvent.change(screen.getByLabelText("Full name"), { target: { value: "Ali Raza" } });
    const adult1 = screen.getByRole("region", { name: "Adult 1" });
    expect(within(adult1).getByLabelText("Given name")).toHaveValue("Ali");
    expect(within(adult1).getByLabelText("Surname")).toHaveValue("Raza");
    expect(within(adult1).getByLabelText("Given name")).toHaveAttribute("readonly");
  });

  it("hold success: sends adults only with the customer card, then opens Seats held with the gateway's price", async () => {
    gateway.holdGroupSeats.mockResolvedValue(HELD);
    renderAt(HOLD_URL);
    const fare = await screen.findByRole("complementary", { name: "Selected group fare" });
    await within(fare).findByText("Fly Jinnah");
    await fillTravelers();
    fireEvent.click(within(fare).getByRole("button", { name: "Hold seats" }));
    await waitFor(() => expect(location.current).toBe("/admin/search/group-ticketing/held/TRV-GRP-000123"));
    const body = gateway.holdGroupSeats.mock.calls[0][0];
    expect(body.ticket_id).toBe("t1");
    expect(body.adults).toBe(2);
    expect(body.contact).toMatchObject({ full_name: "Ali Raza", phone: "+92 300 1234567", id_type: "PSPT", document_number: "AB1234567", save_for_next_time: true });
    expect(body.passengers.map((p: { type: string }) => p.type)).toEqual(["ADT", "ADT"]);
    expect(body.passengers[0]).toMatchObject({ first_name: "Ali", last_name: "Raza", document_number: "AB1234567", nationality: "PAK", document_country: "PAK", gender: "M" });
    expect(body.passengers[1]).toMatchObject({ first_name: "Sana", last_name: "Raza", document_number: "CD7654321" });
    expect(await screen.findByRole("heading", { level: 1 })).toHaveTextContent("Group seats held");
    expect(screen.getByRole("region", { name: "Seats held" })).toHaveTextContent("Seats held for 2 adults");
    expect(screen.getByRole("timer")).toHaveTextContent(/Hold expires, \d\d:\d\d left/);
    expect(screen.getByText("Rs 118,500")).toBeInTheDocument();
    expect(screen.getByText("Rs 237,000")).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Booking details" })).toHaveTextContent("Sana Raza, Passport AB•••4567");
    expect(document.body.textContent).not.toMatch(/Reveal|dhillu|skypass/i);
  });

  it("hold failure: shows the gateway's sentence, stays on the form, and the fields keep their values", async () => {
    gateway.holdGroupSeats.mockRejectedValue(new GatewayError("unavailable", "The supplier didn't confirm the hold. Check with the supplier before trying again.", 502, "not_confirmed_hold"));
    renderAt(HOLD_URL);
    const fare = await screen.findByRole("complementary", { name: "Selected group fare" });
    await within(fare).findByText("Fly Jinnah");
    await fillTravelers();
    fireEvent.click(within(fare).getByRole("button", { name: "Hold seats" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("The supplier didn't confirm the hold. Check with the supplier before trying again.");
    expect(location.current).toContain("/admin/search/group-ticketing/hold");
    expect(screen.getByLabelText("Full name")).toHaveValue("Ali Raza");
    expect(within(fare).getByRole("button", { name: "Hold seats" })).toBeEnabled();
  });

  it("field errors from the gateway land on their fields (adults only)", async () => {
    gateway.holdGroupSeats.mockRejectedValue(new GatewayError("unavailable", "Some details need correcting.", 422, "adults_only",
      [{ path: ["passengers", 1, "date_of_birth"], message: "Must be 12 or over on the travel date." }], { message: "Sana is under 12 on the travel date. Group fares are for adults only." }));
    renderAt(HOLD_URL);
    const fare = await screen.findByRole("complementary", { name: "Selected group fare" });
    await within(fare).findByText("Fly Jinnah");
    await fillTravelers();
    fireEvent.click(within(fare).getByRole("button", { name: "Hold seats" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Sana is under 12 on the travel date. Group fares are for adults only.");
    expect(within(screen.getByRole("region", { name: "Adult 2" })).getByText("Must be 12 or over on the travel date.")).toBeInTheDocument();
  });

  it("Hold seats is off when the fare has fewer seats than adults, or can't be held through the gateway", async () => {
    gateway.fetchGroupTicket.mockResolvedValue({ ...TICKET, remaining: 1 });
    const first = renderAt(HOLD_URL);
    const fare = await screen.findByRole("complementary", { name: "Selected group fare" });
    await within(fare).findByText("Fly Jinnah");
    expect(within(fare).getByRole("button", { name: "Hold seats" })).toBeDisabled();
    expect(fare).toHaveTextContent("Only 1 seat left. Search again with fewer adults.");
    first.unmount();
    gateway.fetchGroupTicket.mockResolvedValue({ ...TICKET, can_hold: false });
    renderAt(HOLD_URL);
    const again = await screen.findByRole("complementary", { name: "Selected group fare" });
    await within(again).findByText("Fly Jinnah");
    expect(within(again).getByRole("button", { name: "Hold seats" })).toBeDisabled();
    expect(again).toHaveTextContent("Holding isn't available for this provider");
  });

  it("the listing price per adult shows in Rs before the hold", async () => {
    gateway.fetchGroupTicket.mockResolvedValue({ ...TICKET, selling_price: { amount_minor: 16_000_000, currency: "PKR" } });
    renderAt(HOLD_URL);
    const fare = await screen.findByRole("complementary", { name: "Selected group fare" });
    await within(fare).findByText("Fly Jinnah");
    expect(fare).toHaveTextContent("Rs 160,000 per adult");
    expect(within(fare).getByRole("button", { name: "Hold seats" })).toBeEnabled();
  });

  it("a provider with no hold API: the gateway's reason shows before any details are typed, and Hold seats is off", async () => {
    gateway.fetchGroupTicket.mockResolvedValue({ ...TICKET, can_hold: false, hold_unavailable_reason: "Dhillu & Sahi has no hold API" });
    renderAt(HOLD_URL);
    const fare = await screen.findByRole("complementary", { name: "Selected group fare" });
    await within(fare).findByText("Fly Jinnah");
    expect(fare).toHaveTextContent("Dhillu & Sahi has no hold API.");
    expect(within(fare).getByRole("button", { name: "Hold seats" })).toBeDisabled();
    expect(gateway.holdGroupSeats).not.toHaveBeenCalled();
  });

  it("finds a saved customer by passport number first; masked, no reveal; the hold sends the id only", async () => {
    gateway.holdGroupSeats.mockResolvedValue(HELD);
    renderAt(HOLD_URL);
    const fare = await screen.findByRole("complementary", { name: "Selected group fare" });
    await within(fare).findByText("Fly Jinnah");
    fireEvent.change(screen.getByLabelText("Find saved customer"), { target: { value: "AB1234567" } });
    fireEvent.click(screen.getByRole("button", { name: "Find" }));
    const dialog = await screen.findByRole("dialog", { name: "Find a saved customer" });
    await waitFor(() => expect(people.searchPeople).toHaveBeenCalledWith("AB1234567", expect.anything()));
    expect(dialog).toHaveTextContent("Ali Raza");
    expect(dialog).toHaveTextContent("AB•••4567");
    expect(dialog).not.toHaveTextContent(/Reveal/);
    fireEvent.click(within(dialog).getByRole("button", { name: "Use Ali Raza" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(screen.getByRole("region", { name: "Customer" })).toHaveTextContent("Saved customer");
    expect(screen.queryByLabelText("Full name")).not.toBeInTheDocument();
    // Adult 1 is the saved customer (ticked by default): masked card, no typed identity.
    const adult1 = screen.getByRole("region", { name: "Adult 1" });
    expect(adult1).toHaveTextContent("AB•••4567");
    expect(within(adult1).queryByLabelText("Passport number")).not.toBeInTheDocument();
    const adult2 = screen.getByRole("region", { name: "Adult 2" });
    fireEvent.change(within(adult2).getByLabelText("Given name"), { target: { value: "Sana" } });
    fireEvent.change(within(adult2).getByLabelText("Surname"), { target: { value: "Raza" } });
    fireEvent.click(within(fare).getByRole("button", { name: "Hold seats" }));
    await waitFor(() => expect(gateway.holdGroupSeats).toHaveBeenCalled());
    const body = gateway.holdGroupSeats.mock.calls[0][0];
    expect(body.contact).toEqual({ customer_id: "p-00000001", save_for_next_time: true });
    expect(body.passengers[0]).toEqual({ type: "ADT", title: "MR", gender: "M", traveler_id: "p-00000001", document_id: "d-00000001", save_for_next_time: true });
    expect(JSON.stringify(body)).not.toContain("AB1234567");
  });
});

describe("Group seats held (step 3)", () => {
  it("shows the supplier only when the gateway sent it (super admin); staff see the stock label", async () => {
    renderAt("/admin/search/group-ticketing/held/TRV-GRP-000123", HELD);
    const details = await screen.findByRole("region", { name: "Booking details" });
    expect(details).toHaveTextContent("StockSupplier");
    expect(document.body.textContent).not.toMatch(/dhillu|skypass/i);
    gateway.fetchGroupHold.mockResolvedValue({ ...HELD, supplier: "dhillu_sahi" });
    renderAt("/admin/bookings/group-ticketing/TRV-GRP-000123/details");
    expect(await screen.findByText("dhillu_sahi")).toBeInTheDocument();
  });

  it("Release hold asks the gateway and shows the released state; Continue to payment opens the booking", async () => {
    gateway.releaseGroupHold.mockResolvedValue({ ...HELD, status: "released", can_record_payments: false, can_issue_tickets: false });
    renderAt("/admin/search/group-ticketing/held/TRV-GRP-000123", HELD);
    await screen.findByRole("region", { name: "Seats held" });
    fireEvent.click(screen.getByRole("button", { name: "Release hold" }));
    await waitFor(() => expect(gateway.releaseGroupHold).toHaveBeenCalledWith("TRV-GRP-000123"));
    expect(await screen.findByText("This hold was released")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Continue to payment" })).toBeDisabled();
  });

  it("an expired hold reads as Expired with both actions off", async () => {
    gateway.fetchGroupHold.mockResolvedValue({ ...HELD, status: "expired", hold_expires_at: new Date(Date.now() - 60_000).toISOString(), can_record_payments: false, can_issue_tickets: false });
    renderAt("/admin/search/group-ticketing/held/TRV-GRP-000123");
    expect(await screen.findByText("This hold has expired")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Continue to payment" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Release hold" })).toBeDisabled();
    expect(screen.getByRole("link", { name: "Search again" })).toHaveAttribute("href", "/admin/search?tab=group-ticketing");
  });
});

describe("Group identity (Source line)", () => {
  const SOURCE = { provider: "dhillu_sahi", provider_name: "Dhillu & Sahi", supplier_pnr: "41SDS4", supplier_group_id: "3056", supplier_ticket_id: "10817" };
  const LINE = "Dhillu & Sahi · PNR 41SDS4 · Group 3056";

  it("supplier access (the gateway sent group_source): Source on the held page and the booking page", async () => {
    renderAt("/admin/search/group-ticketing/held/TRV-GRP-000123", { ...HELD, supplier: "dhillu_sahi", group_source: SOURCE });
    const details = await screen.findByRole("region", { name: "Booking details" });
    expect(details).toHaveTextContent(`Source${LINE}`);
    gateway.fetchGroupHold.mockResolvedValue({ ...HELD, supplier: "dhillu_sahi", group_source: SOURCE });
    renderAt("/admin/bookings/group-ticketing/TRV-GRP-000123/details");
    expect(await screen.findByRole("region", { name: "Details" })).toHaveTextContent(`Source${LINE}`);
  });

  it("staff without supplier access (no group_source sent): no Source row, only the Supplier stock label", async () => {
    gateway.fetchGroupHold.mockResolvedValue({ ...HELD, pnr: undefined });
    renderAt("/admin/search/group-ticketing/held/TRV-GRP-000123");
    const details = await screen.findByRole("region", { name: "Booking details" });
    expect(details).not.toHaveTextContent("Source");
    expect(details).toHaveTextContent("StockSupplier");
    renderAt("/admin/bookings/group-ticketing/TRV-GRP-000123/details");
    const booking = await screen.findByRole("region", { name: "Details" });
    expect(booking).not.toHaveTextContent(/Source|Dhillu|41SDS4|3056/);
    expect(booking).toHaveTextContent("StockSupplier");
  });
});

describe("Dhillu & Sahi hold and unrecorded supplier holds", () => {
  const DS_HELD: GroupHoldView = { ...HELD, pnr: "4FMUAF - 4KOCE5", supplier: "dhillu_sahi", can_release: false, supplier_notice: "Supplier hold ends by itself after 1 hour" };

  it("supplier access: the notice shows on the held page and the booking page; Release hold is off (no release call)", async () => {
    renderAt("/admin/search/group-ticketing/held/TRV-GRP-000123", DS_HELD);
    expect(await screen.findByText("Supplier hold ends by itself after 1 hour")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Release hold" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Continue to payment" })).toBeEnabled();
    gateway.fetchGroupHold.mockResolvedValue(DS_HELD);
    renderAt("/admin/bookings/group-ticketing/TRV-GRP-000123/details");
    await screen.findByRole("region", { name: "Details" });
    expect(screen.getAllByText("Supplier hold ends by itself after 1 hour")).toHaveLength(2);
  });

  it("staff (no supplier_notice sent): no notice", async () => {
    gateway.fetchGroupHold.mockResolvedValue({ ...DS_HELD, pnr: undefined, supplier: undefined, supplier_notice: undefined });
    renderAt("/admin/search/group-ticketing/held/TRV-GRP-000123");
    await screen.findByRole("region", { name: "Booking details" });
    expect(document.body.textContent).not.toMatch(/Supplier hold|dhillu/i);
  });

  it("a hold the supplier made but Travelian couldn't record: Not recorded, the notice, both actions off", async () => {
    gateway.fetchGroupHold.mockResolvedValue({ ...HELD, status: "not_recorded", can_record_payments: false, can_issue_tickets: false, can_release: false,
      supplier_notice: "Supplier hold not recorded, it expires by itself after 1 hour" });
    renderAt("/admin/search/group-ticketing/held/TRV-GRP-000123");
    expect(await screen.findByText("This hold was not recorded")).toBeInTheDocument();
    expect(screen.getByText("Supplier hold not recorded, it expires by itself after 1 hour")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Continue to payment" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Release hold" })).toBeDisabled();
    renderAt("/admin/bookings/group-ticketing/TRV-GRP-000123/details");
    await screen.findByRole("region", { name: "Details" });
    expect(screen.getAllByText("Not recorded").length).toBeGreaterThan(1);
  });
});

describe("Live provider rules", () => {
  const SKYPASS_HELD: GroupHoldView = { ...PAID, pnr: undefined, can_issue_tickets: false, issue_unavailable_reason: "Issuing is not available for this provider yet" };

  it("the countdown runs from the gateway's own hold expiry (no 'Hold time not confirmed' state)", async () => {
    renderAt("/admin/search/group-ticketing/held/TRV-GRP-000123", { ...HELD, hold_expires_at: new Date(Date.now() + 30 * 60_000).toISOString() });
    expect(await screen.findByRole("timer")).toHaveTextContent(/Hold expires, (30:00|29:5\d) left/);
    expect(document.body.textContent).not.toMatch(/Hold time not confirmed/);
  });

  it("staff without supplier access: no PNR row, no supplier name", async () => {
    gateway.fetchGroupHold.mockResolvedValue({ ...HELD, pnr: undefined });
    renderAt("/admin/search/group-ticketing/held/TRV-GRP-000123");
    const details = await screen.findByRole("region", { name: "Booking details" });
    expect(details).not.toHaveTextContent("PNR");
    expect(details).toHaveTextContent("StockSupplier");
  });

  it("Issue tickets stays off with the provider's reason even when paid in full", async () => {
    gateway.fetchGroupHold.mockResolvedValue(SKYPASS_HELD);
    renderAt("/admin/bookings/group-ticketing/TRV-GRP-000123/payments");
    const issue = await screen.findByRole("region", { name: "Issue tickets" });
    expect(issue).toHaveTextContent("Issuing is not available for this provider yet");
    expect(within(issue).getByRole("button", { name: "Issue tickets" })).toBeDisabled();
    expect(gateway.issueGroupTickets).not.toHaveBeenCalled();
  });

  it("a failed supplier release: Expired plus 'Supplier release failed, release manually' (sent to Admin / Super Admin only)", async () => {
    gateway.fetchGroupHold.mockResolvedValue({ ...HELD, status: "expired", supplier_release_failed: true, can_record_payments: false, can_issue_tickets: false });
    renderAt("/admin/bookings/group-ticketing/TRV-GRP-000123/payments");
    expect(await screen.findByText("Supplier release failed, release manually")).toBeInTheDocument();
    expect(screen.getByText("This hold has expired")).toBeInTheDocument();
    gateway.fetchGroupHold.mockResolvedValue({ ...HELD, status: "expired", can_record_payments: false, can_issue_tickets: false });
    renderAt("/admin/search/group-ticketing/held/TRV-GRP-000124");
    await screen.findAllByText("This hold has expired");
    expect(screen.getAllByText("Supplier release failed, release manually")).toHaveLength(1);
  });
});

describe("Payment and issue tickets (step 4)", () => {
  it("Issue tickets stays off until Due is Rs 0; Received into lists the accounts for the method; recording refreshes the summary", async () => {
    bookings.recordPayment.mockResolvedValue({ payment: { amount: rs(237_000) }, payment_status: "paid" });
    renderAt("/admin/bookings/group-ticketing/TRV-GRP-000123/payments");
    const summary = await screen.findByRole("region", { name: "Payment summary" });
    expect(summary).toHaveTextContent("TotalRs 237,000");
    expect(summary).toHaveTextContent("DueRs 237,000");
    expect(summary).toHaveTextContent("Unpaid");
    expect(screen.getByRole("button", { name: "Issue tickets" })).toBeDisabled();
    expect(screen.getByRole("region", { name: "Issue tickets" })).toHaveTextContent("Record the full payment first: Rs 237,000 is still due.");
    await waitFor(() => expect(screen.getByRole("combobox", { name: "Received into" })).toHaveTextContent("Meezan Bank, Travelian current account"));
    expect(screen.getByRole("region", { name: "Recorded payments" })).toHaveTextContent("No payment recorded yet.");
    gateway.fetchGroupHold.mockResolvedValue(PAID);
    fireEvent.change(screen.getByLabelText("Amount (Rs)"), { target: { value: "237,000" } });
    fireEvent.click(screen.getByRole("button", { name: "Record payment" }));
    await waitFor(() => expect(bookings.recordPayment).toHaveBeenCalledWith("TRV-GRP-000123", { amount: rs(237_000), method: "bank_transfer", account_id: "acct-0001" }));
    await waitFor(() => expect(screen.getByRole("region", { name: "Payment summary" })).toHaveTextContent("Paid in full"));
    expect(screen.getByRole("region", { name: "Payment summary" })).toHaveTextContent("DueRs 0");
    const table = within(screen.getByRole("region", { name: "Recorded payments" })).getByRole("table");
    expect(table).toHaveTextContent("Bank transfer");
    expect(table).toHaveTextContent("Meezan Bank, Travelian current account");
    expect(table).toHaveTextContent("Rs 237,000");
    expect(screen.getByRole("button", { name: "Issue tickets" })).toBeEnabled();
    expect(screen.getByRole("timer")).toHaveTextContent(/Hold expires, \d\d:\d\d left/);
  });

  it("unchanged price: Issue tickets issues straight away", async () => {
    gateway.fetchGroupHold.mockResolvedValue(PAID);
    gateway.issueGroupTickets.mockResolvedValue({ result: "issued", message: "Tickets issued.", hold: { ...PAID, status: "issued", can_issue_tickets: false } });
    renderAt("/admin/bookings/group-ticketing/TRV-GRP-000123/payments");
    fireEvent.click(await screen.findByRole("button", { name: "Issue tickets" }));
    await waitFor(() => expect(gateway.issueGroupTickets).toHaveBeenCalledWith("TRV-GRP-000123", undefined));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(await screen.findByRole("status")).toHaveTextContent("Tickets issued.");
    expect(screen.getByRole("button", { name: "Issue tickets" })).toBeDisabled();
  });

  it("price changed: the dialog shows held, new and difference; Customer agrees continues with the new total", async () => {
    gateway.fetchGroupHold.mockResolvedValue(PAID);
    gateway.issueGroupTickets
      .mockRejectedValueOnce(new GatewayError("unavailable", "The price has changed to Rs 244,000. Nothing was issued.", 409, "price_changed", [],
        { held_total: rs(237_000), new_total: rs(244_000), difference: rs(7_000) }))
      .mockResolvedValueOnce({ result: "issued", message: "Tickets issued.", hold: { ...PAID, total: rs(244_000), status: "issued" } });
    renderAt("/admin/bookings/group-ticketing/TRV-GRP-000123/payments");
    fireEvent.click(await screen.findByRole("button", { name: "Issue tickets" }));
    const dialog = await screen.findByRole("dialog", { name: "The price has changed" });
    expect(dialog).toHaveTextContent("Held priceRs 237,000");
    expect(dialog).toHaveTextContent("New priceRs 244,000");
    expect(dialog).toHaveTextContent("Difference+ Rs 7,000");
    fireEvent.click(within(dialog).getByRole("button", { name: "Customer agrees, continue" }));
    await waitFor(() => expect(gateway.issueGroupTickets).toHaveBeenLastCalledWith("TRV-GRP-000123", rs(244_000)));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(await screen.findByRole("status")).toHaveTextContent("Tickets issued.");
  });

  it("price changed: Release hold releases and nothing is issued", async () => {
    gateway.fetchGroupHold.mockResolvedValue(PAID);
    gateway.issueGroupTickets.mockRejectedValue(new GatewayError("unavailable", "The price has changed.", 409, "price_changed", [],
      { held_total: rs(237_000), new_total: rs(230_000), difference: rs(-7_000) }));
    gateway.releaseGroupHold.mockResolvedValue({ ...PAID, status: "released", can_record_payments: false, can_issue_tickets: false });
    renderAt("/admin/bookings/group-ticketing/TRV-GRP-000123/payments");
    fireEvent.click(await screen.findByRole("button", { name: "Issue tickets" }));
    const dialog = await screen.findByRole("dialog", { name: "The price has changed" });
    expect(dialog).toHaveTextContent("Difference− Rs 7,000");
    fireEvent.click(within(dialog).getByRole("button", { name: "Release hold" }));
    await waitFor(() => expect(gateway.releaseGroupHold).toHaveBeenCalledWith("TRV-GRP-000123"));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(gateway.issueGroupTickets).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("button", { name: "Issue tickets" })).toBeDisabled();
    expect(screen.getByText("Released")).toBeInTheDocument();
  });

  it("an expired hold: Expired, Record payment and Issue tickets off, search again", async () => {
    gateway.fetchGroupHold.mockResolvedValue({ ...HELD, status: "expired", can_record_payments: false, can_issue_tickets: false });
    renderAt("/admin/bookings/group-ticketing/TRV-GRP-000123/payments");
    expect(await screen.findByText("This hold has expired")).toBeInTheDocument();
    expect(screen.getAllByText("Expired").length).toBeGreaterThan(0);
    expect(screen.getByRole("button", { name: "Record payment" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Issue tickets" })).toBeDisabled();
    expect(screen.getByRole("link", { name: "search again" })).toHaveAttribute("href", "/admin/search?tab=group-ticketing");
  });

  it("the countdown reaching zero disables both actions without a reload", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    try {
      gateway.fetchGroupHold.mockResolvedValue({ ...PAID, hold_expires_at: new Date(Date.now() + 1500).toISOString() });
      renderAt("/admin/bookings/group-ticketing/TRV-GRP-000123/payments");
      expect(await screen.findByRole("button", { name: "Issue tickets" })).toBeEnabled();
      await vi.advanceTimersByTimeAsync(3000);
      expect(screen.getByRole("button", { name: "Issue tickets" })).toBeDisabled();
      expect(screen.getByRole("button", { name: "Record payment" })).toBeDisabled();
      expect(screen.getByText("This hold has expired")).toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });
});
