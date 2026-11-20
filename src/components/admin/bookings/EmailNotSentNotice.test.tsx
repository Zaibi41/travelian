import { fireEvent, render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { BookingDetail } from "@/lib/admin-bookings/types";

const api = vi.hoisted(() => ({ resendEmail: vi.fn() }));
vi.mock("@/lib/admin-bookings/api", async original => ({ ...(await original<object>()), ...api }));
import { EmailNotSentNotice } from "./EmailNotSentNotice";

const BLOCKED = "Email blocked: AWS hasn't approved Travelian's email account for all addresses yet, so only approved addresses receive email. Call or WhatsApp the customer.";

function show(problems: unknown[]) {
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  render(<QueryClientProvider client={client}>
    <EmailNotSentNotice booking={{ booking_id: "TRV-1", customer_email_problems: problems } as unknown as BookingDetail} />
  </QueryClientProvider>);
}

describe("Email not sent (admin)", () => {
  beforeEach(() => api.resendEmail.mockReset());

  it("names the email, who it went to, when, and why in plain words", () => {
    show([{ email: "bank_transfer", at: "2026-11-20T10:00:00Z", to: "a***@gmail.com", reason: BLOCKED, can_resend: true }]);
    expect(screen.getByText("Email not sent to the customer")).toBeInTheDocument();
    expect(screen.getByText("Bank transfer details")).toBeInTheDocument();
    expect(screen.getByText(/to a\*\*\*@gmail\.com/)).toBeInTheDocument();
    expect(screen.getByText(BLOCKED)).toBeInTheDocument();
    expect(screen.queryByText(/sandbox/i)).not.toBeInTheDocument();
  });

  it("names the hold-ended and cancelled emails (gateway#52), and an old one without a kind", () => {
    show([{ email: "hold_expired", at: "2026-11-21T10:00:00Z", can_resend: true }, { email: "booking_cancelled", at: "2026-11-21T11:00:00Z", can_resend: true },
      { email: "unknown", at: "2026-11-20T02:50:00Z", can_resend: false }]);
    expect(screen.getByText("3 emails not sent to the customer")).toBeInTheDocument();
    expect(screen.getByText("Hold ended")).toBeInTheDocument();
    expect(screen.getByText("Booking cancelled")).toBeInTheDocument();
    expect(screen.getByText("A customer email")).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "Resend email" })).toHaveLength(2);   // not for the one without a kind
  });

  it("Resend email: sending, then sent", async () => {
    let finish: (value: unknown) => void = () => {};
    api.resendEmail.mockReturnValue(new Promise(resolve => { finish = resolve; }));
    show([{ email: "booking_held", at: "2026-11-20T10:00:00Z", reason: BLOCKED, can_resend: true }]);
    fireEvent.click(screen.getByRole("button", { name: "Resend email" }));
    expect(await screen.findByRole("button", { name: "Sending…" })).toBeDisabled();
    expect(api.resendEmail).toHaveBeenCalledWith("TRV-1", "booking_held");
    finish({ sent: true, message: "Email sent to the customer." });
    expect(await screen.findByText("Email sent to the customer.")).toBeInTheDocument();
  });

  it("Resend email: still blocked says why", async () => {
    api.resendEmail.mockResolvedValue({ sent: false, message: BLOCKED });
    show([{ email: "booking_held", at: "2026-11-20T10:00:00Z", can_resend: true }]);
    fireEvent.click(screen.getByRole("button", { name: "Resend email" }));
    expect(await screen.findByText(BLOCKED)).toBeInTheDocument();
  });
});
