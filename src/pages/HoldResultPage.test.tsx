import { fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { BookingDetail } from "@/lib/admin-bookings/types";

const detail = { current: { data: undefined, isPending: true } as Record<string, unknown> };
vi.mock("@/lib/admin-bookings/use-bookings", () => ({ useBookingDetail: () => detail.current }));
const toast = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }));
vi.mock("sonner", () => ({ toast }));

import HoldResultPage, { type HoldResultState } from "./HoldResultPage";
import { STAFF_DRAFT } from "@/test/hold-fixtures";

const rs = (rupees: number) => ({ amount_minor: rupees * 100, currency: "PKR" });
const HOLD = { booking_id: "TRV-PE49ZP", pnr: "CAEDEC", time_limit: new Date(Date.now() + 23 * 3600_000).toISOString(), selling_total: rs(15_316), label: "UAT test data" as const, warnings: [] as string[] };
const SAVED = {
  booking_id: "TRV-PE49ZP", customer: { first_name: "Test", last_name: "Customer", phone: "+92 3001234567", email: "ops@example.invalid" },
  passengers: [
    { position: 0, type: "ADT", title: "MR", first_name: "Test", last_name: "Passenger", date_of_birth_masked: "1990-••-••", id_type: "PSPT", document_number_masked: "••••••567" },
    { position: 1, type: "INF", title: "MISS", first_name: "Baby", last_name: "Passenger", date_of_birth_masked: "2026-••-••", id_type: "PSPT", document_number_masked: "••••••321", infant_of_position: 0 },
  ],
} as unknown as BookingDetail;

const where = { path: "", state: null as unknown };
function Probe() {
  const location = useLocation();
  where.path = location.pathname + location.search;
  where.state = location.state;
  return <h1>Elsewhere</h1>;
}

const renderResult = (state: HoldResultState | null) =>
  render(
    <MemoryRouter initialEntries={[{ pathname: "/admin/search/flights/hold/result", state }]}>
      <Routes>
        <Route path="/admin/search/flights/hold/result" element={<HoldResultPage />} />
        <Route path="*" element={<Probe />} />
      </Routes>
    </MemoryRouter>,
  );

describe("Hold result (mockup flights-hold-result)", () => {
  beforeEach(() => {
    detail.current = { data: SAVED, isPending: false };
    toast.success.mockReset();
  });

  it("shows the gateway's facts, the UAT label, and the saved customer and masked travelers", () => {
    renderResult({ kind: "held", hold: HOLD, mode: "hold" });
    const card = screen.getByRole("region", { name: "Hold confirmed" });
    expect(within(card).getByText("Hold confirmed")).toBeInTheDocument();
    expect(within(card).getByText("UAT test data")).toBeInTheDocument();
    expect(card).toHaveTextContent(/Seats are held until \d+ \w+ \d{4} at \d\d:\d\d/);
    expect(card).toHaveTextContent("No payment has been taken.");
    expect(card).toHaveTextContent("Travelian referenceTRV-PE49ZP");
    expect(card).toHaveTextContent("Airline PNRCAEDEC");
    expect(card).toHaveTextContent(/Time left2[23]:\d\d:\d\d/);
    expect(card).toHaveTextContent("TotalRs 15,316");
    expect(within(card).getByRole("link", { name: "View booking" })).toHaveAttribute("href", "/admin/bookings/TRV-PE49ZP");
    expect(screen.getByRole("region", { name: "Customer" })).toHaveTextContent("Test Customer");
    const travelers = screen.getByRole("region", { name: "Travelers" });
    expect(travelers).toHaveTextContent("••••••567");
    expect(travelers).toHaveTextContent("1990-••-••");
    expect(travelers).toHaveTextContent("Infant with Adult 1");
    expect(travelers).toHaveTextContent("Documents and dates of birth are masked. Reveal is logged.");
  });

  it("shows the gateway's warnings with a text label", () => {
    renderResult({ kind: "held", hold: { ...HOLD, warnings: ["Test's passport is valid for less than 6 months after travel. Check the destination's entry rules."] }, mode: "hold" });
    expect(screen.getByRole("list", { name: "Warnings" })).toHaveTextContent("CheckTest's passport is valid for less than 6 months");
  });

  it("no UAT label when the gateway doesn't send one", () => {
    renderResult({ kind: "held", hold: { ...HOLD, label: undefined } as never, mode: "hold" });
    expect(screen.queryByText("UAT test data")).not.toBeInTheDocument();
  });

  it("total not verified: Needs attention, the gateway's sentence, View booking and Copy PNR", () => {
    const message = "The hold was created at the supplier (PNR 2E572B, TRV-2S60SD) but its total couldn't be verified. Check the total with the supplier before taking any payment.";
    renderResult({ kind: "problem", code: "total_unverified", message, extra: { pnr: "2E572B", booking_id: "TRV-2S60SD" }, mode: "hold", draft: STAFF_DRAFT });
    const card = screen.getByRole("region", { name: "Hold created, but its total couldn't be verified" });
    expect(card).toHaveTextContent("Needs attention");
    expect(card).toHaveTextContent(message);
    expect(within(card).getByRole("link", { name: "View booking" })).toHaveAttribute("href", "/admin/bookings/TRV-2S60SD");
    Object.assign(navigator, { clipboard: { writeText: vi.fn().mockResolvedValue(undefined) } });
    fireEvent.click(within(card).getByRole("button", { name: "Copy PNR" }));
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith("2E572B");
  });

  it("not saved: Action needed now, Copy PNR and Back to search", () => {
    renderResult({ kind: "problem", code: "not_saved", message: "The hold was created at the supplier (PNR 5D8242) but couldn't be saved. Record this PNR.", extra: { pnr: "5D8242" }, mode: "hold" });
    const card = screen.getByRole("region", { name: "The hold was created but couldn't be saved" });
    expect(card).toHaveTextContent("Action needed now");
    expect(within(card).getByRole("button", { name: "Copy PNR" })).toBeInTheDocument();
    expect(within(card).getByRole("link", { name: "Back to search" })).toBeInTheDocument();
  });

  it("supplier didn't confirm: Not confirmed, Back to the hold form keeps the fare", () => {
    renderResult({ kind: "problem", code: "not_confirmed_hold", message: "The supplier didn't confirm the hold. Check the supplier before trying again.", extra: {}, mode: "book", draft: STAFF_DRAFT });
    const card = screen.getByRole("region", { name: "The supplier didn't confirm the hold" });
    expect(card).toHaveTextContent("Not confirmed");
    expect(card).toHaveTextContent("Check the supplier before trying again.");
    fireEvent.click(within(card).getByRole("button", { name: "Back to the hold form" }));
    expect(where.path).toBe("/admin/search/flights/hold?mode=book");
    expect(where.state).toEqual(STAFF_DRAFT);
  });

  it("booking turned off: Not available, Back to results", () => {
    renderResult({ kind: "problem", code: "booking_off", message: "Booking is turned off. Nothing was booked.", extra: {}, mode: "hold", draft: STAFF_DRAFT });
    const card = screen.getByRole("region", { name: "Booking is turned off" });
    expect(card).toHaveTextContent("Not available");
    expect(card).toHaveTextContent("Booking is turned off. Nothing was booked.");
    expect(within(card).getByRole("link", { name: "Back to results" })).toHaveAttribute("href", "/admin/search?tab=flights&from=LHE&to=KHI&date=2026-11-19&infants=1");
  });

  it("without a hold (reload or direct link) explains there is nothing to show", () => {
    renderResult(null);
    expect(screen.getByText("No hold to show")).toBeInTheDocument();
  });
});
