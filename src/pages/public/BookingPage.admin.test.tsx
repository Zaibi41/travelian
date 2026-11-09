import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/contexts/AdminStore", () => ({ useAdmin: () => ({ packages: [], packageLoadStatus: "ready" }) }));

import BookingPage from "./BookingPage";

const TAMPERED =
  "/admin/booking?type=flight&flightId=sooperfare-123&airline=Airblue&flightNo=PA-200&from=KHI&to=LHE&date=Nov+20%2C+2026&cabin=Economy" +
  "&adults=1&price=100&baseFare=13030&taxes=2145&currency=PKR&airlineImage=https%3A%2F%2Fcdn.sooperfare.com%2Fx.png";

describe("admin flight checkout", () => {
  it("never shows a price from the URL and blocks booking until the gateway reprices", () => {
    render(<MemoryRouter initialEntries={[TAMPERED]}><BookingPage adminMode /></MemoryRouter>);
    expect(screen.getByRole("status")).toHaveTextContent("Booking is blocked.");
    expect(screen.getByRole("button", { name: "Book flight" })).toBeDisabled();
    const page = document.body;
    expect(page.textContent).not.toMatch(/\b100\b|13,?030|2,?145|PKR|Rs /);
    expect(page.innerHTML).not.toMatch(/sooperfare/i);
    expect(page.textContent).not.toMatch(/Secure SSL checkout|card is not charged|Instant Verification|Free cancellation/);
    expect(screen.getByText("KHI → LHE")).toBeInTheDocument();
  });
});
