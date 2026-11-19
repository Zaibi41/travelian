import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { saveGatewayBooking } from "@/lib/booking-store";
import { setSiteSwitchesForTest } from "@/lib/site-switches";
import MyBookingsPage from "./MyBookingsPage";

// D48: a paid website flight shows "payment received" until the gateway has the real ticket; never "confirmed", never a
// PNR the page made up. The PNR shown is the airline's, from the gateway, once issued.
function storeFlight() {
  saveGatewayBooking({
    type: "flight", status: "held", travelers: [], contact: { phone: "923001234567" }, addons: [], paymentMethod: "card",
    paymentStatus: "unpaid", ticketStatus: "not_issued", pricing: { base: 22070, addons: 0, taxes: 0, total: 22070, currency: "PKR" },
    flight: { airline: "Airblue", flightNumber: "PA401", from: "KHI", to: "LHE", fromCode: "KHI", toCode: "LHE", date: "2026-12-10" },
    gateway: { reference: "TRV-F-1", token: "t".repeat(20), live: true },
  }, "TRV-F-1");
}

function answer(view: Record<string, unknown>) {
  vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({
    reference: "TRV-F-1", live: true, can_pay: false, total: { amount_minor: 2207000, currency: "PKR" },
    paid: { amount_minor: 2207000, currency: "PKR" }, payment_status: "paid", ...view,
  }), { status: 200 })));
}

const page = () => render(<HelmetProvider><MemoryRouter><MyBookingsPage /></MemoryRouter></HelmetProvider>);

describe("My Bookings: paid website flights", () => {
  beforeEach(() => { vi.stubEnv("VITE_TRAVELIAN_GATEWAY_BASE_URL", "https://gw.example.test"); setSiteSwitchesForTest({}); storeFlight(); });
  afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); localStorage.clear(); });

  it("shows issuance in progress while the gateway issues it", async () => {
    answer({ status: "processing" });
    page();
    expect(await screen.findByText(/Payment received\. Issuance in progress/)).toBeInTheDocument();
    expect(screen.getByText("payment received")).toBeInTheDocument();
    expect(screen.queryByText(/PNR:/)).not.toBeInTheDocument();
  });

  it("shows issuance pending when Travelian's team issues it, not 'confirmed'", async () => {
    answer({ status: "confirmed" });
    page();
    expect(await screen.findByText(/Payment received\. Issuance pending/)).toBeInTheDocument();
    expect(screen.queryByText("confirmed")).not.toBeInTheDocument();
  });

  it("tells the customer the team will contact them when the paid booking couldn't be ticketed", async () => {
    answer({ status: "paid_not_ticketed" });
    page();
    expect(await screen.findByText("Payment received. Our team will contact you shortly about your booking.")).toBeInTheDocument();
    expect(screen.queryByText(/Issuance pending/)).not.toBeInTheDocument();
    expect(screen.queryByText(/PNR:/)).not.toBeInTheDocument();
  });

  it("shows the airline's PNR only once issued", async () => {
    answer({ status: "issued", final_pnr: "63B55C", tickets: ["2147483647001"] });
    page();
    expect(await screen.findByText(/PNR: 63B55C/)).toBeInTheDocument();
    expect(screen.getByText("ticket issued")).toBeInTheDocument();
    expect(screen.queryByText(/Issuance/)).not.toBeInTheDocument();
  });
});
