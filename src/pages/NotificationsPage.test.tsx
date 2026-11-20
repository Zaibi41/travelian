import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { BookingAlert } from "@/lib/admin-notifications";

vi.mock("@/contexts/RoleContext", () => ({ useRole: () => ({ currentRole: "super_admin" }) }));
vi.mock("@/contexts/AdminStore", () => ({ useAdmin: () => ({ notifications: [], markNotificationRead: vi.fn(), markAllRead: vi.fn() }) }));
vi.mock("@/lib/notification-api", () => ({ listNotificationLogs: () => Promise.resolve([]) }));

const alerts = { items: [] as BookingAlert[] };
vi.mock("@/lib/admin-notifications", () => ({
  useBookingAlerts: () => ({ items: alerts.items, unseen: 0, markSeen: vi.fn(), isLoading: false, error: null, emailEnabled: true }),
}));

import NotificationsPage from "./NotificationsPage";

const alert = (overrides: Partial<BookingAlert> = {}): BookingAlert => ({
  id: "n1", kind: "hold_created", reference: "TRV-ABC123", title: "Hold created: TRV-ABC123", emailed: false, urgent: false,
  created_at: "2026-11-20T08:00:00Z", details: { passenger: "Ali Khan", route: "KHI-DXB", pnr: "XY12AB" }, ...overrides,
});

function Detail() {
  const location = useLocation();
  return <p>booking page {location.pathname}{location.search}</p>;
}

const renderPage = () =>
  render(
    <MemoryRouter initialEntries={["/admin/notifications"]}>
      <Routes>
        <Route path="/admin/notifications" element={<NotificationsPage />} />
        <Route path="/admin/bookings/:bookingId" element={<Detail />} />
        <Route path="*" element={<Detail />} />
      </Routes>
    </MemoryRouter>,
  );

describe("Notifications booking alerts (#54)", () => {
  beforeEach(() => {
    alerts.items = [alert()];
  });

  it("clicking an alert opens that booking's detail page, not the full list", () => {
    renderPage();
    const link = screen.getByRole("link", { name: "Hold created: TRV-ABC123" });
    expect(link).toHaveAttribute("href", "/admin/bookings/TRV-ABC123");
    fireEvent.click(link);
    expect(screen.getByText("booking page /admin/bookings/TRV-ABC123")).toBeInTheDocument();
  });

  it("urgent alerts link to the booking too", () => {
    alerts.items = [alert({ urgent: true, title: "Paid, not ticketed: TRV-URG1", reference: "TRV-URG1" })];
    renderPage();
    expect(screen.getByRole("link", { name: "Paid, not ticketed: TRV-URG1" })).toHaveAttribute("href", "/admin/bookings/TRV-URG1");
  });

  it("an alert without a booking reference is plain text with a short note", () => {
    alerts.items = [alert({ reference: null, title: "Booking request" })];
    renderPage();
    expect(screen.queryByRole("link", { name: "Booking request" })).not.toBeInTheDocument();
    expect(screen.getByText("Booking request")).toBeInTheDocument();
    expect(screen.getByText("This alert isn't linked to a booking, so it can't be opened.")).toBeInTheDocument();
  });
});
