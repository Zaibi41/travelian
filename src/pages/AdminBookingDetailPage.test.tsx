import { render, screen, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { BookingDetail } from "@/lib/admin-bookings/types";
import { GatewayError } from "@/lib/gateway/client";
import { fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HelmetProvider } from "react-helmet-async";

const detail = { current: {} as Record<string, unknown> };
vi.mock("@/lib/admin-bookings/use-bookings", () => ({ useBookingDetail: () => detail.current }));
const gateway = vi.hoisted(() => ({ setSellingPrice: vi.fn(), downloadItinerary: vi.fn() }));
vi.mock("@/lib/admin-bookings/api", () => ({ setSellingPrice: gateway.setSellingPrice, downloadItinerary: gateway.downloadItinerary }));

import AdminBookingDetailPage from "./AdminBookingDetailPage";

const ok = <T,>(data: T) => ({ data, error: null, isPending: false });
const rs = (rupees: number) => ({ amount_minor: rupees * 100, currency: "PKR" });

// Plain staff: no provider, supplier cost, margin or supplier_payment in the response (D23).
const STAFF_VIEW: BookingDetail = {
  source: "gateway_bookings", sample: false, booking_id: "TRV-1", pnr: "AB12CD", product: "flight",
  customer_or_agency: "Karachi Travels", statuses: { booking: "held", payment: "unpaid", issuance: "not_issued" },
  amount: rs(12_500), deadline: "2099-11-05T09:00:00Z", created_at: "2026-11-05T07:00:00Z",
  fare: { billable_price: rs(12_500) },
  sections_not_available: ["itinerary", "passengers", "payments", "tickets", "servicing", "audit"],
  can_record_payments: false, can_issue_tickets: false, can_set_selling_price: false,
};
const ADMIN_VIEW: BookingDetail = {
  ...STAFF_VIEW, provider: "AirSial",
  fare: { billable_price: rs(12_500), supplier_cost: rs(11_000), margin: rs(1_500) },
  supplier_payment: { amount_due: rs(11_000), hold_deadline: "2099-11-05T09:00:00Z" },
};

const renderAt = (url: string) =>
  render(
    <HelmetProvider>
      <QueryClientProvider client={new QueryClient({ defaultOptions: { mutations: { retry: false } } })}>
        <MemoryRouter initialEntries={[url]}>
          <Routes>
            <Route path="/admin/bookings/:bookingId" element={<AdminBookingDetailPage />} />
            <Route path="/admin/bookings/:bookingId/:tab" element={<AdminBookingDetailPage />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    </HelmetProvider>,
  );

const tabLabels = () => within(screen.getByRole("navigation", { name: "Booking" })).getAllByRole("link").map(link => link.textContent);

describe("Booking detail", () => {
  beforeEach(() => {
    detail.current = ok(ADMIN_VIEW);
  });

  it("is a page with nine tabs for admins, statuses in the header, and no Edit booking", () => {
    renderAt("/admin/bookings/TRV-1");
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(/^PNR AB12CD$/);
    expect(tabLabels()).toEqual(["Overview", "Itinerary", "Passengers", "Fare", "Payments", "Supplier payment", "Tickets", "Servicing", "Audit"]);
    expect(screen.getByRole("link", { name: "Fare" })).toHaveAttribute("href", "/admin/bookings/TRV-1/fare");
    expect(screen.queryByText(/Edit booking/i)).not.toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("with an airline PNR: heading 'PNR AB12CD', 'Booking TRV-1' beside it, the same in the tab title; Overview has Airline PNR above Booking ID", async () => {
    renderAt("/admin/bookings/TRV-1");
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(/^PNR AB12CD$/);
    expect(screen.getByText("Booking TRV-1")).toBeInTheDocument();
    await waitFor(() => expect(document.title).toBe("PNR AB12CD · Booking TRV-1 · Travelian Admin"));
    const rows = within(screen.getByRole("region", { name: "Overview" })).getAllByRole("term").map(term => term.textContent);
    expect(rows.slice(0, 2)).toEqual(["Airline PNR", "Booking ID"]);
    expect(screen.getByRole("region", { name: "Overview" })).toHaveTextContent("Airline PNRAB12CD");
  });

  it("without a PNR yet: heading 'Booking TRV-1' alone, the tab title too, and Airline PNR shows a dash", async () => {
    detail.current = ok({ ...ADMIN_VIEW, pnr: null });
    renderAt("/admin/bookings/TRV-1");
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(/^Booking TRV-1$/);
    expect(screen.queryByText(/^PNR /)).not.toBeInTheDocument();
    await waitFor(() => expect(document.title).toBe("Booking TRV-1 · Travelian Admin"));
    expect(screen.getByRole("region", { name: "Overview" })).toHaveTextContent("Airline PNR—");
  });

  it("Overview shows recorded fields and hides Owner and Supplier status", () => {
    renderAt("/admin/bookings/TRV-1");
    const overview = screen.getByRole("region", { name: "Overview" });
    expect(within(overview).getByText("Rs 12,500")).toBeInTheDocument();
    expect(within(overview).getByText("Karachi Travels")).toBeInTheDocument();
    expect(within(overview).getByText(/left\)$/)).toBeInTheDocument();
    expect(within(overview).queryByText(/Owner|Supplier status|Assign/)).not.toBeInTheDocument();
  });

  it("shows time left only while the hold is open", () => {
    detail.current = ok({ ...ADMIN_VIEW, statuses: { booking: "ticket_issued", payment: "paid", issuance: "issued" } });
    renderAt("/admin/bookings/TRV-1");
    expect(screen.queryByText(/left\)$/)).not.toBeInTheDocument();
  });

  it("Fare shows supplier cost and profit only when the gateway sends them", () => {
    const { unmount } = renderAt("/admin/bookings/TRV-1/fare");
    const fare = screen.getByRole("region", { name: "Fare" });
    expect(within(fare).getAllByRole("row").map(row => row.textContent)).toEqual([
      "ItemAmount", "Billable priceRs 12,500", "Supplier costRs 11,000", "ProfitRs 1,500",
    ]);
    unmount();
    detail.current = ok(STAFF_VIEW);
    renderAt("/admin/bookings/TRV-1/fare");
    expect(screen.queryByText(/Supplier cost|Profit|11,000|1,500/)).not.toBeInTheDocument();
  });

  it("Fare: no real supplier cost (imported booking) shows cost and profit as n/a, never 0", () => {
    detail.current = ok({ ...ADMIN_VIEW, fare: { billable_price: rs(12_500), cost_unknown: true } });
    renderAt("/admin/bookings/TRV-1/fare");
    const fare = screen.getByRole("region", { name: "Fare" });
    expect(within(fare).getAllByRole("row").map(row => row.textContent)).toEqual([
      "ItemAmount", "Billable priceRs 12,500", "Supplier costn/a", "Profitn/a",
    ]);
  });

  it("Fare: the selling price per passenger type, cost each only with access, and the selling price form before payment", async () => {
    const per = [{ passenger_type: "ADT" as const, count: 2, selling_each: rs(6_000), supplier_cost_each: rs(5_500) },
      { passenger_type: "INF" as const, count: 1, selling_each: rs(500), supplier_cost_each: rs(450) }];
    detail.current = ok({ ...ADMIN_VIEW, can_set_selling_price: true, fare: { ...ADMIN_VIEW.fare, per_passenger: per } });
    gateway.setSellingPrice.mockResolvedValue({ total: rs(13_000) });
    const { unmount } = renderAt("/admin/bookings/TRV-1/fare");
    const fare = screen.getByRole("region", { name: "Fare" });
    expect(fare).toHaveTextContent("Adult × 2, selling price eachRs 6,000");
    expect(fare).toHaveTextContent("Adult, supplier cost eachRs 5,500");
    const form = screen.getByRole("region", { name: "Selling price" });
    fireEvent.change(within(form).getByLabelText("Adult (Rs each)"), { target: { value: "6250" } });
    fireEvent.click(within(form).getByRole("button", { name: "Save selling price" }));
    await waitFor(() => expect(gateway.setSellingPrice).toHaveBeenCalledWith("TRV-1", [
      { passenger_type: "ADT", selling_each: rs(6_250) }, { passenger_type: "INF", selling_each: rs(500) }]));
    unmount();
    detail.current = ok({ ...STAFF_VIEW, fare: { billable_price: rs(12_500), per_passenger: per.map(({ supplier_cost_each: _, ...item }) => item) } });
    renderAt("/admin/bookings/TRV-1/fare");
    expect(screen.getByRole("region", { name: "Fare" })).not.toHaveTextContent("supplier cost");
    expect(screen.queryByRole("region", { name: "Selling price" })).not.toBeInTheDocument();
  });

  it("Download itinerary (PDF) asks for this booking's PDF; a failure shows the gateway's reason", async () => {
    gateway.downloadItinerary.mockResolvedValueOnce(undefined).mockRejectedValueOnce(new GatewayError("unavailable", "The itinerary can't be downloaded right now.", 503));
    renderAt("/admin/bookings/TRV-1/overview");
    fireEvent.click(screen.getByRole("button", { name: "Download itinerary (PDF)" }));
    await waitFor(() => expect(gateway.downloadItinerary).toHaveBeenCalledWith("TRV-1", undefined, "pdf"));
    fireEvent.click(await screen.findByRole("button", { name: "Download itinerary (PDF)" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("The itinerary can't be downloaded right now.");
  });

  it("Download PNG sits beside the PDF and asks for the same booking as an image", async () => {
    gateway.downloadItinerary.mockResolvedValue(undefined);
    renderAt("/admin/bookings/TRV-1/overview");
    fireEvent.click(screen.getByRole("button", { name: "Download PNG" }));
    await waitFor(() => expect(gateway.downloadItinerary).toHaveBeenCalledWith("TRV-1", undefined, "png"));
  });

  it("plain staff: no Supplier payment tab, and its URL goes back to Overview", () => {
    detail.current = ok(STAFF_VIEW);
    renderAt("/admin/bookings/TRV-1/supplier-payment");
    expect(tabLabels()).not.toContain("Supplier payment");
    expect(screen.getByRole("region", { name: "Overview" })).toBeInTheDocument();
    expect(screen.queryByText("AirSial")).not.toBeInTheDocument();
  });

  it("Supplier payment shows amount due and hold deadline for permitted viewers", () => {
    renderAt("/admin/bookings/TRV-1/supplier-payment");
    const payment = screen.getByRole("region", { name: "Supplier payment" });
    expect(within(payment).getByText("Rs 11,000")).toBeInTheDocument();
    expect(within(payment).queryByText(/Transfer reference|Paid from/)).not.toBeInTheDocument();
  });

  it("tabs without recorded data show the mockup columns and say not available", () => {
    renderAt("/admin/bookings/TRV-1/passengers");
    const table = screen.getByRole("table");
    expect(within(table).getByRole("columnheader", { name: "Document" })).toBeInTheDocument();
    expect(table).toHaveTextContent("Not available yet. The gateway doesn't record passengers for bookings yet.");
  });

  it("itinerary: the flights as held, day-first local times, Fare instead of Cabin; older bookings say they weren't recorded", () => {
    detail.current = ok({ ...ADMIN_VIEW, sections_not_available: ["passengers", "payments", "tickets", "servicing", "audit"], itinerary: [
      { direction: "outbound", origin: "LHE", destination: "KHI", airline_code: "Z8", airline_name: "South Air International Regional Airways Limited", flight_number: "Z8266",
        departure_local: "2026-11-19T00:25", arrival_local: "2026-11-19T02:35", duration_minutes: 130, stops: 0, stop_cities: [], fare_name: "EB", baggage: "20 kg", meal: null },
      { direction: "return", origin: "KHI", destination: "LHE", airline_code: "Z8", airline_name: null, flight_number: "Z8267",
        departure_local: "2026-11-25T18:05", arrival_local: "2026-11-25T21:10", duration_minutes: 185, stops: 1, stop_cities: ["ISB"], fare_name: "EB", baggage: null, meal: null },
    ] });
    const { unmount } = renderAt("/admin/bookings/TRV-1/itinerary");
    const table = screen.getByRole("region", { name: "Itinerary" });
    expect(within(table).getAllByRole("columnheader").map(cell => cell.textContent)).toEqual(["Segment", "From", "To", "Departs", "Arrives", "Airline / flight", "Fare", "Baggage"]);
    const [outbound, back] = within(table).getAllByRole("row").slice(1);
    expect(outbound).toHaveTextContent("OutboundNon-stop · 2h 10m");
    expect(outbound).toHaveTextContent("19 Nov 2026, 00:25");
    expect(outbound).toHaveTextContent("19 Nov 2026, 02:35");
    expect(outbound).toHaveTextContent("South Air International Regional Airways Limited · Z8266");
    expect(outbound).toHaveTextContent("20 kg");
    expect(back).toHaveTextContent("Return1 stop via ISB · 3h 05m");
    expect(back).toHaveTextContent("Z8 · Z8267");
    expect(back).toHaveTextContent("Baggage info not available");
    unmount();
    detail.current = ok(ADMIN_VIEW);
    renderAt("/admin/bookings/TRV-1/itinerary");
    expect(screen.getByRole("table")).toHaveTextContent("Not recorded for this booking. Flights are saved with holds placed from 14 November 2026.");
  });

  it("tickets: no supplier response column; before issuing it says no tickets yet", () => {
    renderAt("/admin/bookings/TRV-1/tickets");
    expect(screen.queryByRole("columnheader", { name: /Supplier response/ })).not.toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("No tickets yet");
  });

  it("labels sample bookings and reports missing ones", () => {
    detail.current = ok({ ...ADMIN_VIEW, sample: true, sample_label: "Sample data" });
    const { unmount } = renderAt("/admin/bookings/TRV-1");
    expect(screen.getByText("Sample data")).toBeInTheDocument();
    unmount();
    detail.current = { data: undefined, error: new GatewayError("not_found", "x"), isPending: false };
    renderAt("/admin/bookings/NOPE");
    expect(screen.getByRole("alert")).toHaveTextContent("This booking wasn't found.");
  });
});

// A UAT hold as the gateway returns it: full identity, audit trail (no personal data).
const HOLD_VIEW: BookingDetail = {
  ...STAFF_VIEW, customer_or_agency: "Test Customer",
  customer: { first_name: "Test", last_name: "Customer", phone: "+92 3001234567", email: "ops@example.invalid" },
  passengers: [
    { position: 0, type: "ADT", title: "MR", first_name: "Test", last_name: "Passenger", date_of_birth: "1990-01-31", id_type: "PSPT",
      document_number: "AB1234567", document_country: "PAK", nationality: "PAK", document_expiry: "2031-01-01", document_validity: "valid" },
    { position: 1, type: "INF", title: "MISS", first_name: "Baby", last_name: "Passenger", date_of_birth: "2026-03-02", id_type: "PSPT",
      document_number: "AB7654321", nationality: "PAK", infant_of_position: 0 },
  ],
  audit: [
    { action: "hold_created", actor_user_id: "0901a7ce-ef7d-4af6-8ca4-31fd1252137a", actor_role: "super_admin", at: "2026-11-09T13:22:54Z",
      details: { label: "UAT test data", pnr: "CAEDEC", time_limit: "2026-11-10 13:28 UTC", travelers: 2, fare_info: "matches" } },
    { action: "identity_revealed", actor_user_id: "11111111-2222-4333-8444-555555555555", actor_role: "staff", at: "2026-11-09T14:00:00Z",
      details: { traveler_position: 0, fields: ["date_of_birth", "document_number"], reason: "Ticketing needs it" } },
  ],
  sections_not_available: ["itinerary", "payments", "tickets", "servicing"],
};

describe("Passengers and Audit tabs", () => {
  beforeEach(() => {
    detail.current = ok(HOLD_VIEW);
  });

  it("Passengers lists the document number and date of birth in full, with no masking notice and no Reveal", () => {
    renderAt("/admin/bookings/TRV-1/passengers");
    const tab = screen.getByRole("region", { name: "Passengers" });
    expect(within(tab).getAllByRole("columnheader").map(h => h.textContent)).toEqual(
      ["Passenger name", "Type", "Document", "Date of birth", "Nationality", "Ticket number"]);
    const [adult, infant] = within(tab).getAllByRole("row").slice(1);
    expect(adult).toHaveTextContent("MR Test Passenger");
    expect(adult).toHaveTextContent("Passport AB1234567");
    expect(adult).toHaveTextContent("31 Jan 1990");
    expect(infant).toHaveTextContent("AB7654321");
    expect(infant).toHaveTextContent("Infant (with passenger 1)");
    expect(tab).not.toHaveTextContent(/masked|•/);
    expect(within(tab).queryByRole("button", { name: /Reveal/ })).not.toBeInTheDocument();
    expect(screen.queryByText(/Not available yet/)).not.toBeInTheDocument();
  });

  it("a group booking's stored fare terms show on Overview (text, who, when) and in Audit", () => {
    const text = "The customer has been told that this group fare is non-refundable and non-changeable, and agrees.";
    detail.current = ok({ ...HOLD_VIEW, product: "group",
      fare_terms: { text, version: "group-fare-terms-v1", acknowledged_by: "staff", acknowledged_by_user_id: "0901a7ce-ef7d-4af6-8ca4-31fd1252137a", acknowledged_at: "2026-11-09T13:22:54Z" },
      audit: [{ action: "fare_terms_acknowledged", actor_user_id: "0901a7ce-ef7d-4af6-8ca4-31fd1252137a", actor_role: "staff", at: "2026-11-09T13:22:54Z",
        details: { terms_version: "group-fare-terms-v1", terms_text: text, acknowledged_by: "staff" } }] });
    const first = renderAt("/admin/bookings/TRV-1");
    const overview = screen.getByRole("region", { name: "Overview" });
    expect(overview).toHaveTextContent(`Fare termsNon-refundable · Non-changeable. ${text}`);
    expect(overview).toHaveTextContent(/Told by staff on \d/);
    first.unmount();
    renderAt("/admin/bookings/TRV-1/audit");
    const row = within(screen.getByRole("region", { name: "Audit" })).getAllByRole("row")[1];
    expect(row).toHaveTextContent("Staff · 0901a7ce");
    expect(row).toHaveTextContent("Fare terms acknowledged");
    expect(row).toHaveTextContent(`${text} · version group-fare-terms-v1 · ticked by staff`);
  });

  it("a booking without stored fare terms shows no Fare terms row", () => {
    renderAt("/admin/bookings/TRV-1");
    expect(screen.getByRole("region", { name: "Overview" })).not.toHaveTextContent("Fare terms");
  });

  it("Audit shows When, Who, Action and Details from the gateway", () => {
    renderAt("/admin/bookings/TRV-1/audit");
    const tab = screen.getByRole("region", { name: "Audit" });
    const [created, revealed] = within(tab).getAllByRole("row").slice(1);
    expect(created).toHaveTextContent("Super Admin · 0901a7ce");
    expect(created).toHaveTextContent("Hold created");
    expect(created).toHaveTextContent("PNR CAEDEC · time limit 2026-11-10 13:28 UTC · 2 travelers · total verified · UAT test data");
    expect(revealed).toHaveTextContent("Staff · 11111111");
    expect(revealed).toHaveTextContent("Identity revealed");
    expect(revealed).toHaveTextContent("Passenger 1 · date of birth, document number · Reason: Ticketing needs it");
  });

  it("keeps the not-available table when the gateway sends no passengers or audit", () => {
    detail.current = ok(STAFF_VIEW);
    renderAt("/admin/bookings/TRV-1/passengers");
    expect(screen.getByText(/Not available yet/)).toBeInTheDocument();
  });
});
