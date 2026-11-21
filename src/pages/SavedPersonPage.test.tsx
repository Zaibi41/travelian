import { fireEvent, render, screen, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Made-up values, as the gateway returns them.
const BOOKING = {
  booking_id: "TRV-PE49ZP", role: "customer", created_at: "2026-11-09T13:28:58Z", pnr: "63B55C", product: "flight",
  route: "LHE → DXB → LHE", departure_local: "2026-11-19T00:25", statuses: { booking: "ticket_issued", payment: "paid", issuance: "issued" },
  ticket_numbers: ["2142345678901", "2142345678902"], selling_price: { amount_minor: 4_670_000, currency: "PKR" },
};
const GROUP = { booking_id: "TRV-GR0UP1", role: "traveler", created_at: "2026-11-10T09:00:00Z", product: "group", ticket_numbers: [],
  statuses: { booking: "held", payment: "unpaid", issuance: "not_issued" }, selling_price: { amount_minor: 9_500_000, currency: "PKR" } };
const PERSON = { id: "p-00000001", title: "MR", first_name: "Ali", last_name: "Khan", date_of_birth: "1990-01-31", phone: "+92 3001234567",
  email: "ali@example.invalid", documents: [{ id: "d-1", id_type: "PSPT", document_country: "PAK", document_number: "AB1234567", document_expiry: "2031-01-01" }],
  can_manage: false, can_merge: false };

const fetchPerson = vi.fn();
const editDocument = vi.fn();
vi.mock("@/lib/saved-people/api", async importOriginal => ({
  ...(await importOriginal<typeof import("@/lib/saved-people/api")>()),
  fetchPerson: (...args: unknown[]) => fetchPerson(...args),
  editDocument: (...args: unknown[]) => editDocument(...args),
}));

import SavedPersonPage from "./SavedPersonPage";

function renderPage() {
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <MemoryRouter initialEntries={["/admin/customers/p-00000001"]}>
        <Routes>
          <Route path="/admin/customers/:personId" element={<SavedPersonPage />} />
          <Route path="/admin/bookings/:bookingId" element={<p>Booking page</p>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => fetchPerson.mockReset());

describe("Saved person: details in full and booking history", () => {
  it("shows the passport number, date of birth, phone and email in full", async () => {
    fetchPerson.mockResolvedValue({ ...PERSON, bookings: [] });
    renderPage();
    const details = await screen.findByRole("region", { name: "Details" });
    expect(details).toHaveTextContent("31 Jan 1990");
    expect(details).toHaveTextContent("+92 3001234567");
    expect(details).toHaveTextContent("ali@example.invalid");
    expect(screen.getByRole("region", { name: "Documents" })).toHaveTextContent("AB1234567");
    expect(document.body).not.toHaveTextContent(/masked|•/);
  });

  it("lists each booking with ID, PNR, product, route, date, statuses, tickets and selling price; no cost or profit without the permission", async () => {
    fetchPerson.mockResolvedValue({ ...PERSON, bookings: [BOOKING, GROUP] });
    renderPage();
    const section = await screen.findByRole("region", { name: "Bookings" });
    expect(within(section).getAllByRole("columnheader").map(header => header.textContent)).toEqual(
      ["Booking ID", "PNR", "Product", "Route", "Date", "As", "Status", "Ticket numbers", "Selling price", "Created at"]);
    const [flight, group] = within(section).getAllByRole("row").slice(1);
    expect(flight).toHaveTextContent("TRV-PE49ZP");
    expect(flight).toHaveTextContent("63B55C");
    expect(flight).toHaveTextContent("Flight");
    expect(flight).toHaveTextContent("LHE → DXB → LHE");
    expect(flight).toHaveTextContent("19 Nov 2026");
    expect(flight).toHaveTextContent("2142345678901");
    expect(flight).toHaveTextContent("2142345678902");
    expect(flight).toHaveTextContent("46,700");
    expect(within(flight).getByRole("link", { name: "TRV-PE49ZP" })).toHaveAttribute("href", "/admin/bookings/TRV-PE49ZP");
    expect(group).toHaveTextContent("Group");
    expect(group).toHaveTextContent("Held");
    expect(section).not.toHaveTextContent(/Supplier cost|Profit/);
  });

  it("shows supplier cost and profit when the gateway sends them (cost and margin permission)", async () => {
    fetchPerson.mockResolvedValue({ ...PERSON, bookings: [{ ...BOOKING, supplier_cost: { amount_minor: 4_577_000, currency: "PKR" }, profit: { amount_minor: 93_000, currency: "PKR" } }] });
    renderPage();
    const section = await screen.findByRole("region", { name: "Bookings" });
    expect(within(section).getByRole("columnheader", { name: "Supplier cost" })).toBeInTheDocument();
    const [row] = within(section).getAllByRole("row").slice(1);
    expect(row).toHaveTextContent("45,770");
    expect(row).toHaveTextContent("930");
  });

  it("a row opens its booking", async () => {
    fetchPerson.mockResolvedValue({ ...PERSON, bookings: [BOOKING] });
    renderPage();
    const section = await screen.findByRole("region", { name: "Bookings" });
    fireEvent.click(within(section).getByText("LHE → DXB → LHE"));
    expect(await screen.findByText("Booking page")).toBeInTheDocument();
  });
});

describe("Edit a saved document (#12)", () => {
  it("Edit opens the document filled in; saving a renewed passport sends the new number to the gateway", async () => {
    const { waitFor } = await import("@testing-library/react");
    fetchPerson.mockResolvedValue({ ...PERSON, can_manage: true, bookings: [] });
    editDocument.mockResolvedValue({ ...PERSON, can_manage: true, bookings: [],
      documents: [{ id: "d-2", id_type: "PSPT", document_country: "PAK", document_number: "AB1234568", document_expiry: "2036-01-15" }] });
    renderPage();
    fireEvent.click(await screen.findByRole("button", { name: "Edit Passport AB1234567" }));
    const dialog = await screen.findByRole("dialog", { name: "Edit document" });
    expect(dialog).toHaveTextContent("past bookings keep the old one");
    const number = within(dialog).getByDisplayValue("AB1234567");
    fireEvent.change(number, { target: { value: "AB1234568" } });
    fireEvent.click(within(dialog).getByRole("button", { name: "Save document" }));
    await waitFor(() => expect(editDocument).toHaveBeenCalledWith("p-00000001", "d-1", expect.objectContaining({ id_type: "PSPT", document_number: "AB1234568" })));
  });

  it("#75: a booking shows the airline logo beside the route", async () => {
    fetchPerson.mockResolvedValue({ ...PERSON, bookings: [{ ...BOOKING, airline_code: "EK", airline_name: "Emirates", flight_number: "EK623" }] });
    renderPage();
    const section = await screen.findByRole("region", { name: "Bookings" });
    expect(within(section).getByRole("img", { name: "Emirates logo" })).toBeInTheDocument();
    expect(within(section).getByText("Emirates · EK623")).toBeInTheDocument();
  });
});
