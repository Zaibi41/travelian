import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { BookingDetail } from "@/lib/admin-bookings/types";

const api = vi.hoisted(() => ({ cancelAtSupplier: vi.fn(), checkAtSupplier: vi.fn(), reholdAtSupplier: vi.fn() }));
vi.mock("@/lib/admin-bookings/api", async original => ({ ...(await original<object>()), ...api }));
import { SupplierBookingCard } from "./SupplierBookingCard";

globalThis.ResizeObserver ??= class { observe() {} unobserve() {} disconnect() {} } as unknown as typeof ResizeObserver;

const SUPPLIER = { supplier: "SooperFare", booking_id: "3801e825-ccc9-421e-a441-222d8740612a", order_ref: "spa-zrc", cancel_state: "none" as const, can_cancel: true };
const booking = (supplier: object = SUPPLIER) => ({ booking_id: "TRV-G6CMP6", pnr: "VFTATB", amount: { amount_minor: 2_468_500, currency: "PKR" }, supplier_booking: supplier }) as unknown as BookingDetail;
const renderCard = (b = booking()) =>
  render(<QueryClientProvider client={new QueryClient({ defaultOptions: { mutations: { retry: false } } })}><SupplierBookingCard booking={b} /></QueryClientProvider>);

beforeEach(() => { api.cancelAtSupplier.mockReset(); api.checkAtSupplier.mockReset(); api.reholdAtSupplier.mockReset(); });

describe("SooperFare booking card", () => {
  it("shows SooperFare's order ref; Cancel asks first, then reports that SooperFare hasn't applied it yet", async () => {
    api.cancelAtSupplier.mockResolvedValue({ ...SUPPLIER, cancel_state: "requested" });
    renderCard();
    expect(screen.getByText("spa-zrc")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Cancel at SooperFare" }));
    const dialog = screen.getByRole("dialog", { name: "Cancel this booking at SooperFare?" });
    expect(dialog).toHaveTextContent("shows as Cancelled only once SooperFare confirms it");
    expect(api.cancelAtSupplier).not.toHaveBeenCalled();
    fireEvent.click(within(dialog).getByRole("button", { name: "Cancel at SooperFare" }));
    await waitFor(() => expect(api.cancelAtSupplier).toHaveBeenCalledWith("TRV-G6CMP6"));
    expect(await screen.findByRole("status")).toHaveTextContent("still shows the booking as active");
  });

  it("shows SooperFare's refusal as it is; no Cancel once cancelled; Check is read-only", async () => {
    const { GatewayError } = await import("@/lib/gateway/client");
    api.cancelAtSupplier.mockRejectedValue(new GatewayError("unavailable", "SooperFare refused the cancel: Booking cannot be cancelled. Nothing was changed.", 502, "cancel_failed"));
    const { unmount } = renderCard();
    fireEvent.click(screen.getByRole("button", { name: "Cancel at SooperFare" }));
    fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Cancel at SooperFare" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Booking cannot be cancelled.");
    unmount();
    api.checkAtSupplier.mockResolvedValue({ ...SUPPLIER, cancel_state: "confirmed" });
    renderCard(booking({ ...SUPPLIER, cancel_state: "confirmed" as never }));
    expect(screen.queryByRole("button", { name: "Cancel at SooperFare" })).not.toBeInTheDocument();
    expect(screen.getByText("Cancelled at SooperFare")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Check with SooperFare" }));
    expect(await screen.findByRole("status")).toHaveTextContent("SooperFare confirms the booking is cancelled.");
  });

  it("Re-hold only when the hold is gone: asks first, holds at the same price", async () => {
    const { unmount } = renderCard();
    expect(screen.queryByRole("button", { name: "Re-hold at SooperFare" })).not.toBeInTheDocument();
    unmount();
    api.reholdAtSupplier.mockResolvedValue({ message: "held again: new PNR NEWPNR, expires 21 Nov 2026 10:00 UTC" });
    renderCard(booking({ ...SUPPLIER, can_cancel: false, can_rehold: true }));
    expect(screen.getByText("The SooperFare hold is gone")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Re-hold at SooperFare" }));
    const dialog = screen.getByRole("dialog", { name: "Re-hold at SooperFare?" });
    expect(dialog).toHaveTextContent("Rs 24,685");
    expect(api.reholdAtSupplier).not.toHaveBeenCalled();
    fireEvent.click(within(dialog).getByRole("button", { name: "Re-hold at SooperFare" }));
    await waitFor(() => expect(api.reholdAtSupplier).toHaveBeenCalledWith("TRV-G6CMP6", undefined));
    expect(await screen.findByText(/Held again at SooperFare: new PNR NEWPNR/)).toBeInTheDocument();
  });

  it("a new price is shown and held only after the OK; a refusal is shown as it is", async () => {
    const { GatewayError } = await import("@/lib/gateway/client");
    api.reholdAtSupplier.mockRejectedValueOnce(new GatewayError("unavailable", "The same fare now costs Rs 25,100", 409, "price_changed", [],
      { new_total: { amount_minor: 2_510_000, currency: "PKR" }, old_total: { amount_minor: 2_468_500, currency: "PKR" } }));
    api.reholdAtSupplier.mockRejectedValueOnce(new GatewayError("unavailable", "Not held again: the same flights and fare aren't offered any more. Nothing was booked.", 502, "rehold_failed"));
    renderCard(booking({ ...SUPPLIER, can_cancel: false, can_rehold: true }));
    fireEvent.click(screen.getByRole("button", { name: "Re-hold at SooperFare" }));
    fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Re-hold at SooperFare" }));
    const changed = await screen.findByRole("dialog", { name: "The price has changed" });
    expect(changed).toHaveTextContent("now cost Rs 25,100 instead of Rs 24,685");
    fireEvent.click(within(changed).getByRole("button", { name: "Hold at Rs 25,100" }));
    await waitFor(() => expect(api.reholdAtSupplier).toHaveBeenLastCalledWith("TRV-G6CMP6", 2_510_000));
    expect(await within(screen.getByRole("dialog")).findByRole("alert")).toHaveTextContent("aren't offered any more");
  });
});
