import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GatewayError } from "@/lib/gateway/client";
import type { BookingDetail, IssuanceChecklist } from "@/lib/admin-bookings/types";

// Booking detail > Payments: record the customer's payment, the checks before issuing, issue
// (confirm, once), request issuance without the permission, and the unknown-issuance actions.
// Gateway calls are mocked; made-up values.
const api = vi.hoisted(() => ({
  fetchPaymentAccounts: vi.fn(),
  fetchIssuance: vi.fn(), recordPayment: vi.fn(), requestIssuance: vi.fn(), issueTicket: vi.fn(), verifyIssuance: vi.fn(), resolveIssuance: vi.fn(),
}));
vi.mock("@/lib/admin-bookings/api", () => api);

import { PaymentsAndIssuing, TicketsTab } from "./PaymentsAndIssuing";

// Radix Select uses pointer capture and scrollIntoView, which jsdom doesn't have.
globalThis.ResizeObserver ??= class { observe() {} unobserve() {} disconnect() {} } as unknown as typeof ResizeObserver;
Element.prototype.hasPointerCapture ??= () => false;
Element.prototype.releasePointerCapture ??= () => {};
Element.prototype.scrollIntoView ??= function scrollIntoView() {};

const ACCOUNTS = { accounts: [
  { id: "acct-0001", method: "bank_transfer", label: "Meezan Bank, Travelian current account" },
  { id: "acct-0002", method: "bank_transfer", label: "HBL collections" },
  { id: "acct-0003", method: "jazzcash", label: "JazzCash business wallet" },
] };

/** Open a Select by its label and choose an option with the keyboard. */
async function choose(label: string, option: string) {
  const trigger = await screen.findByRole("combobox", { name: label });
  await waitFor(() => expect(trigger).toBeEnabled());
  fireEvent.keyDown(trigger, { key: "Enter" });
  const item = await screen.findByRole("option", { name: option });
  fireEvent.keyDown(item, { key: "Enter" });
  await waitFor(() => expect(screen.queryByRole("listbox")).not.toBeInTheDocument());
}

const rs = (rupees: number) => ({ amount_minor: rupees * 100, currency: "PKR" });
const SOON = new Date(Date.now() + 3 * 3_600_000).toISOString();
const traveler = (position: number, first: string, ticket?: string) => ({
  position, title: "MR", first_name: first, last_name: "Khan", type: "ADT" as const, id_type: "PSPT" as const, date_of_birth: "1990-01-31",
  ...(ticket ? { ticket_number: ticket } : {}),
});
const BOOKING: BookingDetail = {
  source: "gateway_bookings", sample: false, booking_id: "TRV-O5QZB5", pnr: "CAEDEC", product: "flight", customer_or_agency: "Ali Khan",
  statuses: { booking: "held", payment: "unpaid", issuance: "not_issued" }, amount: rs(15_316), amount_paid: rs(0), amount_due: rs(15_316),
  deadline: SOON, fare: { billable_price: rs(15_316) }, sections_not_available: ["payments", "tickets"], can_set_selling_price: false,
  can_record_payments: true, can_issue_tickets: true, can_edit_group_tickets: false, itinerary_available: true,
  passengers: [traveler(1, "Ali"), traveler(2, "Sara")],
};
const READY: IssuanceChecklist = {
  issuance_status: "not_issued", blockers: [], full_payment_recorded: true, amount_paid: rs(15_316), amount_due: rs(0),
  hold_expires_at: SOON, ticketing_enabled: true, can_request: true, can_issue: true, can_check: false,
};

function renderTab(booking: BookingDetail = BOOKING) {
  return render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })}>
      <MemoryRouter><PaymentsAndIssuing booking={booking} /></MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  for (const mock of Object.values(api)) mock.mockReset();
  api.fetchIssuance.mockResolvedValue(READY);
  api.fetchPaymentAccounts.mockResolvedValue(ACCOUNTS);
});

describe("1 · Record the customer's payment", () => {
  it("shows the gateway's totals and sends the payment in paisa with an ISO time", async () => {
    api.fetchIssuance.mockResolvedValue({ ...READY, full_payment_recorded: false, can_issue: false, can_request: false, blockers: ["Full payment isn't recorded yet."] });
    api.recordPayment.mockResolvedValue({ payment: { id: "p1", amount: rs(15_316), method: "jazzcash", received_into: "Meezan", reference: "JC-1", received_at: new Date().toISOString(), recorded_at: new Date().toISOString() }, payment_status: "paid" });
    renderTab();
    const card = screen.getByRole("region", { name: "1 · Record the customer's payment" });
    expect(card).toHaveTextContent("Booking totalRs 15,316");
    expect(card).toHaveTextContent("Still to receiveRs 15,316");
    expect(screen.getByLabelText("Amount received")).toHaveValue("15316");
    await choose("Received into", "HBL collections");
    fireEvent.change(screen.getByLabelText("Reference or transaction ID"), { target: { value: "JC-778899" } });
    fireEvent.change(screen.getByLabelText("Amount received"), { target: { value: "15,316.50" } });
    fireEvent.click(screen.getByRole("button", { name: "Record payment" }));
    await waitFor(() => expect(api.recordPayment).toHaveBeenCalledOnce());
    const [bookingId, body] = api.recordPayment.mock.calls[0];
    expect(bookingId).toBe("TRV-O5QZB5");
    expect(body).toMatchObject({ amount: { amount_minor: 1_531_650, currency: "PKR" }, method: "bank_transfer", account_id: "acct-0002", reference: "JC-778899" });
    expect(body).not.toHaveProperty("received_into");
    expect(new Date(body.received_at).getTime()).toBeLessThanOrEqual(Date.now());
    expect(await screen.findByText("Payment of Rs 15,316 recorded.")).toBeInTheDocument();
  });

  it("checks the amount, account, reference and time before sending; shows the gateway's refusal", async () => {
    api.recordPayment.mockRejectedValue(new GatewayError("unavailable", "The reference is already recorded.", 409));
    renderTab();
    fireEvent.change(screen.getByLabelText("Amount received"), { target: { value: "12.345" } });
    fireEvent.click(screen.getByRole("button", { name: "Record payment" }));
    expect(screen.getByRole("alert")).toHaveTextContent("Enter the amount received in Rs");
    fireEvent.change(screen.getByLabelText("Amount received"), { target: { value: "100" } });
    fireEvent.click(screen.getByRole("button", { name: "Record payment" }));
    expect(screen.getByRole("alert")).toHaveTextContent("Choose the account");
    await choose("Received into", "HBL collections");
    fireEvent.change(screen.getByLabelText("Reference or transaction ID"), { target: { value: "X-1" } });
    fireEvent.change(screen.getByLabelText("Time (24-hour)"), { target: { value: "2 PM" } });
    fireEvent.click(screen.getByRole("button", { name: "Record payment" }));
    expect(screen.getByRole("alert")).toHaveTextContent("24-hour");
    expect(api.recordPayment).not.toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText("Time (24-hour)"), { target: { value: "00:01" } });
    fireEvent.click(screen.getByRole("button", { name: "Record payment" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("The reference is already recorded.");
  });

  it("without the permission there is no form; paid in full shows no form either; payments are listed", () => {
    const { unmount } = renderTab({ ...BOOKING, can_record_payments: false });
    expect(screen.queryByRole("form", { name: "Record payment" })).not.toBeInTheDocument();
    expect(screen.getByText(/needs the record payments permission/)).toBeInTheDocument();
    unmount();
    renderTab({ ...BOOKING, amount_paid: rs(15_316), amount_due: rs(0), payments: [
      { id: "p1", amount: rs(15_316), method: "1link", received_into: "HBL", reference: "1L-42", received_at: "2026-11-10T09:05:00Z", recorded_at: "2026-11-10T09:10:00Z", recorded_by_role: "super_admin" },
    ] });
    expect(screen.getByText("Paid in full. Nothing more to record.")).toBeInTheDocument();
    const row = screen.getByRole("table", { name: "Payments recorded" }).querySelector("tbody tr")!;
    expect(row).toHaveTextContent("1Link");
    expect(row).toHaveTextContent("1L-42");
    expect(row).toHaveTextContent("Rs 15,316");
    expect(row).toHaveTextContent("Super Admin");
  });
});

describe("Received into: Travelian's receiving accounts", () => {
  it("offers only the chosen method's accounts; changing the method clears the choice", async () => {
    renderTab();
    const trigger = await screen.findByRole("combobox", { name: "Received into" });
    await waitFor(() => expect(trigger).toBeEnabled());
    fireEvent.keyDown(trigger, { key: "Enter" });
    expect((await screen.findAllByRole("option")).map(option => option.textContent)).toEqual([
      "Choose the account", "Meezan Bank, Travelian current account", "HBL collections",
    ]);
    fireEvent.keyDown(screen.getByRole("option", { name: "HBL collections" }), { key: "Enter" });
    await waitFor(() => expect(trigger).toHaveTextContent("HBL collections"));
    await choose("Method", "JazzCash");
    expect(screen.getByRole("combobox", { name: "Received into" })).toHaveTextContent("Choose the account");
    await choose("Received into", "JazzCash business wallet");
  });

  it("no account for a method: the choice is disabled and says why", async () => {
    api.fetchPaymentAccounts.mockResolvedValue({ accounts: [] });
    renderTab();
    const trigger = await screen.findByRole("combobox", { name: "Received into" });
    expect(await screen.findByText("No Bank transfer account is set up yet. An administrator adds the receiving accounts.")).toBeInTheDocument();
    expect(trigger).toBeDisabled();
  });
});

describe("2 · Issue the ticket", () => {
  it("lists the checks, confirms, issues once and shows the ticket numbers", async () => {
    api.issueTicket.mockResolvedValue({ result: "issued", issuance_status: "issued", message: "Issued.", tickets: [{ position: 1, ticket_number: "214-0000000001" }, { position: 2, ticket_number: "214-0000000002" }] });
    renderTab();
    const card = screen.getByRole("region", { name: "2 · Issue the ticket" });
    await waitFor(() => expect(card).toHaveTextContent("Payment recorded in fullDone"));
    expect(card).toHaveTextContent("Hold still valid");
    expect(card).toHaveTextContent("Total matches the held fareChecked when issuing");
    expect(card).toHaveTextContent("Approval to issueNot requested");
    expect(within(card).queryByRole("button", { name: "Request issuance" })).not.toBeInTheDocument();
    fireEvent.click(within(card).getByRole("button", { name: "Issue ticket" }));
    const dialog = screen.getByRole("dialog", { name: "Issue ticket now?" });
    expect(dialog).toHaveTextContent("This sends 2 travelers to the airline for ticketing for Rs 15,316");
    fireEvent.click(within(dialog).getByRole("button", { name: "Issue now" }));
    const issued = await screen.findByRole("region", { name: "Tickets issued" });
    expect(api.issueTicket).toHaveBeenCalledOnce();
    expect(issued).toHaveTextContent("MR Ali Khan214-0000000001");
    expect(issued).toHaveTextContent("MR Sara Khan214-0000000002");
    expect(within(issued).getByRole("link", { name: "View tickets" })).toHaveAttribute("href", "/admin/bookings/TRV-O5QZB5/tickets");
  });

  it("the airline's price changed: the selling price stays, the new cost and profit show, and Confirm and issue sends it", async () => {
    api.issueTicket
      .mockRejectedValueOnce(new GatewayError("unavailable", "The airline's price has changed.", 409, "supplier_cost_changed", [], {
        accepted_supplier_cost: rs(14_900), new_supplier_cost: rs(14_900), previous_supplier_cost: rs(14_500), profit: rs(416) }))
      .mockResolvedValueOnce({ result: "issued", issuance_status: "issued", message: "Issued.", tickets: [{ position: 1, ticket_number: "214-0000000001" }, { position: 2, ticket_number: "214-0000000002" }] });
    renderTab();
    const card = screen.getByRole("region", { name: "2 · Issue the ticket" });
    await waitFor(() => expect(card).toHaveTextContent("Payment recorded in fullDone"));
    fireEvent.click(within(card).getByRole("button", { name: "Issue ticket" }));
    fireEvent.click(within(screen.getByRole("dialog", { name: "Issue ticket now?" })).getByRole("button", { name: "Issue now" }));
    const change = await screen.findByRole("dialog", { name: "The airline's price has changed" });
    expect(change).toHaveTextContent("The customer's price stays Rs 15,316");
    expect(change).toHaveTextContent("Supplier cost beforeRs 14,500");
    expect(change).toHaveTextContent("Supplier cost nowRs 14,900");
    expect(change).toHaveTextContent("ProfitRs 416");
    fireEvent.click(within(change).getByRole("button", { name: "Confirm and issue" }));
    await screen.findByRole("region", { name: "Tickets issued" });
    expect(api.issueTicket).toHaveBeenLastCalledWith("TRV-O5QZB5", undefined, rs(14_900));
  });

  it("the airline's price changed, no cost access: no amounts, still confirmable; above the selling price: the gateway's refusal", async () => {
    api.issueTicket.mockRejectedValueOnce(new GatewayError("unavailable", "The airline's price has changed.", 409, "supplier_cost_changed", [], {
      accepted_supplier_cost: rs(14_900) }));
    renderTab();
    const card = screen.getByRole("region", { name: "2 · Issue the ticket" });
    await waitFor(() => expect(card).toHaveTextContent("Payment recorded in fullDone"));
    fireEvent.click(within(card).getByRole("button", { name: "Issue ticket" }));
    fireEvent.click(within(screen.getByRole("dialog", { name: "Issue ticket now?" })).getByRole("button", { name: "Issue now" }));
    const change = await screen.findByRole("dialog", { name: "The airline's price has changed" });
    expect(change).not.toHaveTextContent(/Supplier cost|Profit/);
    api.issueTicket.mockRejectedValueOnce(new GatewayError("unavailable", "The airline's price is now above the selling price. Nothing was issued.", 409, "below_cost"));
    fireEvent.click(within(change).getByRole("button", { name: "Confirm and issue" }));
    expect(await within(card).findByRole("alert")).toHaveTextContent("The airline's price is now above the selling price. Nothing was issued.");
  });

  it("stays disabled with the gateway's blockers; ticketing off is explained", async () => {
    api.fetchIssuance.mockResolvedValue({ ...READY, full_payment_recorded: false, amount_due: rs(5_000), blockers: ["Full payment isn't recorded yet."], can_issue: false, can_request: false, ticketing_enabled: false,
      ticketing_note: "SooperFare ticketing from Travelian isn't switched on yet (SOOPERFARE_CONFIRM_ENABLED: waiting for the owner to approve the first confirm). Issue in SooperFare's portal, then record the ticket numbers." });
    renderTab();
    expect(await screen.findByText("Full payment isn't recorded yet.")).toBeInTheDocument();
    expect(screen.getByText("Rs 5,000 still due")).toBeInTheDocument();
    expect(screen.getByText("Tickets can't be issued from Travelian for this booking")).toBeInTheDocument();
    expect(screen.getByText(/SooperFare ticketing from Travelian isn't switched on yet/)).toBeInTheDocument();   // which supplier, which switch
    expect(screen.getByRole("button", { name: "Issue ticket" })).toBeDisabled();
  });

  it("without the issue permission: Request issuance sends it to an approver", async () => {
    api.requestIssuance.mockResolvedValue({ result: "requested", issuance_status: "requested", message: "Issuance requested." });
    renderTab({ ...BOOKING, can_issue_tickets: false });
    const button = await screen.findByRole("button", { name: "Request issuance" });
    expect(screen.queryByRole("button", { name: "Issue ticket" })).not.toBeInTheDocument();
    await waitFor(() => expect(button).toBeEnabled());
    fireEvent.click(button);
    expect(await screen.findByRole("region", { name: "Issuance requested" })).toBeInTheDocument();
    expect(api.requestIssuance).toHaveBeenCalledWith("TRV-O5QZB5");
  });

  it("supplier amount, balance and margin only when the gateway sends them", async () => {
    const { unmount } = renderTab();
    await screen.findByText("Payment recorded in full");
    expect(screen.queryByLabelText("Admin only")).not.toBeInTheDocument();
    unmount();
    api.fetchIssuance.mockResolvedValue({ ...READY, supplier_amount: rs(14_000), supplier_balance: rs(500_000), margin: rs(1_316) });
    renderTab();
    expect(await screen.findByLabelText("Admin only")).toHaveTextContent("Amount charged by the supplier: Rs 14,000 · Supplier balance: Rs 500,000 · Profit Rs 1,316");
  });

  it("a hold that ran out offers Search again", async () => {
    api.fetchIssuance.mockResolvedValue({ ...READY, hold_expires_at: "2020-01-01T00:00:00Z", blockers: ["The hold has expired or is about to expire."], can_issue: false, can_request: false });
    renderTab();
    const card = await screen.findByRole("region", { name: "The hold ran out before issuing" });
    expect(within(card).getByRole("link", { name: "Search again" })).toHaveAttribute("href", "/admin/search?tab=flights");
  });
});

describe("unknown issuance", () => {
  beforeEach(() => api.fetchIssuance.mockResolvedValue({ ...READY, issuance_status: "unknown", can_issue: false, can_request: false }));

  it("blocks issuing; Check with supplier verifies; Mark as issued needs every ticket number and a reason", async () => {
    api.verifyIssuance.mockResolvedValue({ result: "unknown", issuance_status: "unknown", message: "Still unclear." });
    api.resolveIssuance.mockResolvedValue({ result: "issued", issuance_status: "issued", message: "Marked as issued.", tickets: [{ position: 1, ticket_number: "214-1" }, { position: 2, ticket_number: "214-2" }] });
    renderTab();
    const card = await screen.findByRole("region", { name: "We can't tell whether the ticket was issued" });
    expect(screen.queryByRole("button", { name: "Issue ticket" })).not.toBeInTheDocument();
    fireEvent.click(within(card).getByRole("button", { name: "Check with supplier" }));
    await waitFor(() => expect(api.verifyIssuance).toHaveBeenCalledWith("TRV-O5QZB5"));
    expect(await within(card).findByRole("alert")).toHaveTextContent("Still unclear.");

    fireEvent.click(within(card).getByRole("button", { name: "Mark as issued" }));
    const dialog = screen.getByRole("dialog", { name: "Mark as issued" });
    fireEvent.change(within(dialog).getByLabelText("Ticket number, MR Ali Khan"), { target: { value: "214-1" } });
    fireEvent.click(within(dialog).getByRole("button", { name: "Save" }));
    expect(within(dialog).getByRole("alert")).toHaveTextContent("Give a ticket number for every traveler.");
    fireEvent.change(within(dialog).getByLabelText("Ticket number, MR Sara Khan"), { target: { value: "214-2" } });
    fireEvent.change(within(dialog).getByLabelText("Reason"), { target: { value: "Airline confirmed both tickets by phone." } });
    fireEvent.click(within(dialog).getByRole("button", { name: "Save" }));
    await waitFor(() => expect(api.resolveIssuance).toHaveBeenCalledWith("TRV-O5QZB5", {
      outcome: "issued", reason: "Airline confirmed both tickets by phone.",
      ticket_numbers: [{ position: 1, ticket_number: "214-1" }, { position: 2, ticket_number: "214-2" }],
    }));
    expect(await screen.findByRole("region", { name: "Tickets issued" })).toBeInTheDocument();
  });

  it("Mark as not issued sends only the reason", async () => {
    api.resolveIssuance.mockResolvedValue({ result: "not_issued", issuance_status: "not_issued", message: "Marked as not issued." });
    renderTab();
    fireEvent.click(await screen.findByRole("button", { name: "Mark as not issued" }));
    const dialog = screen.getByRole("dialog", { name: "Mark as not issued" });
    fireEvent.change(within(dialog).getByLabelText("Reason"), { target: { value: "Airline says no ticket on the PNR." } });
    fireEvent.click(within(dialog).getByRole("button", { name: "Save" }));
    await waitFor(() => expect(api.resolveIssuance).toHaveBeenCalledWith("TRV-O5QZB5", { outcome: "not_issued", reason: "Airline says no ticket on the PNR." }));
  });

  it("shows why it's unknown (the real reason), and Check with supplier records the ticket it finds", async () => {
    api.fetchIssuance.mockResolvedValue({ ...READY, issuance_status: "unknown", can_issue: false, can_request: false, can_check: true,
      last_attempt: { at: "2026-11-19T12:37:49Z", outcome: "unknown", reason: "The ticketing request was sent, but the supplier's PNR check afterwards didn't show a ticket number for every passenger, so the result couldn't be confirmed. The supplier accepted the request.", supplier_answer: "accepted the request", pnr_status: "OK" } });
    api.verifyIssuance.mockResolvedValue({ result: "issued", issuance_status: "issued", message: "The supplier shows the ticket as issued.", tickets: [{ position: 1, ticket_number: "9000000000672" }] });
    renderTab();
    const card = await screen.findByRole("region", { name: "We can't tell whether the ticket was issued" });
    expect(card).toHaveTextContent("Why it's unknown");
    expect(card).toHaveTextContent("didn't show a ticket number for every passenger");
    expect(card).toHaveTextContent("PNR status at the supplier: OK");
    fireEvent.click(within(card).getByRole("button", { name: "Check with supplier" }));
    expect(await screen.findByRole("region", { name: "Tickets issued" })).toHaveTextContent("9000000000672");
  });
});

describe("last issuing attempt", () => {
  it("a failed attempt shows its reason and offers Check with supplier (read-only); safe to retry is shown", async () => {
    api.fetchIssuance.mockResolvedValue({ ...READY, can_check: true,
      last_attempt: { at: "2026-11-18T20:02:28Z", outcome: "aborted", reason: "Not enough balance in the supplier account to pay for the ticket. Nothing was sent to the airline." } });
    api.verifyIssuance.mockResolvedValue({ result: "not_issued", issuance_status: "not_issued", message: "The supplier shows no ticket and nothing paid. It's safe to issue again." });
    renderTab();
    const notice = await screen.findByText("Last issuing attempt didn't issue a ticket");
    const box = notice.closest("[role=status]") as HTMLElement;
    expect(box).toHaveTextContent("Not enough balance in the supplier account");
    fireEvent.click(within(box).getByRole("button", { name: "Check with supplier" }));
    await waitFor(() => expect(api.verifyIssuance).toHaveBeenCalledWith("TRV-O5QZB5"));
    expect(await screen.findByRole("region", { name: "The ticket wasn't issued" })).toHaveTextContent("safe to issue again");
    expect(screen.getByRole("button", { name: "Issue ticket" })).toBeEnabled();
  });

  it("no Check with supplier when the gateway doesn't allow it", async () => {
    api.fetchIssuance.mockResolvedValue({ ...READY, last_attempt: { at: "2026-11-18T20:02:28Z", outcome: "checked", reason: "Checked with the supplier: no ticket and nothing paid. It's safe to issue again." } });
    renderTab();
    expect(await screen.findByText("Last check with the supplier")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Check with supplier" })).not.toBeInTheDocument();
  });
});

describe("Tickets tab", () => {
  it("lists every traveler's ticket number once issued", () => {
    render(<TicketsTab booking={{ ...BOOKING, passengers: [traveler(1, "Ali", "214-0000000001"), traveler(2, "Sara", "214-0000000002")] }} />);
    const rows = screen.getAllByRole("row").slice(1);
    expect(rows.map(row => row.textContent)).toEqual(["MR Ali Khan214-0000000001Issued", "MR Sara Khan214-0000000002Issued"]);
  });
});
