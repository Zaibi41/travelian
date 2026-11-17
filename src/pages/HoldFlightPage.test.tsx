import { render, screen, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { ADMIN_DRAFT, STAFF_DRAFT } from "@/test/hold-fixtures";
import HoldFlightPage from "./HoldFlightPage";

globalThis.ResizeObserver ??= class { observe() {} unobserve() {} disconnect() {} } as unknown as typeof ResizeObserver;

const renderHoldPage = (state: unknown, url = "/admin/search/flights/hold?mode=hold") =>
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })}>
      <MemoryRouter initialEntries={[{ pathname: url.split("?")[0], search: url.includes("?") ? `?${url.split("?")[1]}` : "", state }]}>
        <Routes><Route path="/admin/search/flights/hold" element={<HoldFlightPage />} /></Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );

describe("Hold flight page: Selected fare", () => {
  it("shows the flight, fare, baggage, gateway prices, confirmed time and the countdown; no supplier fields for staff", () => {
    renderHoldPage(STAFF_DRAFT);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Hold flight");
    const summary = screen.getByRole("complementary", { name: "Selected fare" });
    for (const text of ["South Air", "Z8266", "00:25", "02:35", "LHE", "KHI", "02h 10m · Non-stop", "EB", "No checked baggage", "Rs 13,597", "Rs 15,316", "Fare confirmed at 10:05"]) {
      expect(summary).toHaveTextContent(text);
    }
    expect(within(summary).getByText(/^Valid for \d\d:\d\d$/)).toBeInTheDocument();
    expect(summary).toHaveTextContent("Travelers2");
    expect(summary).not.toHaveTextContent(/Admin only|Provider|Supplier cost|Margin|southair/i);
  });

  it("shows provider, supplier cost and margin only when the gateway sent them", () => {
    renderHoldPage(ADMIN_DRAFT);
    const summary = screen.getByRole("complementary", { name: "Selected fare" });
    expect(summary).toHaveTextContent("Admin only");
    expect(summary).toHaveTextContent("Provider: southair");
    expect(summary).toHaveTextContent("Supplier cost Rs 15,015 · Margin Rs 301");
  });

  it("Book opens the same page titled Book flight", () => {
    renderHoldPage(STAFF_DRAFT, "/admin/search/flights/hold?mode=book");
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Book flight");
  });

  it("without a fare check (reload or direct link) says the fare must be checked again", () => {
    renderHoldPage(null);
    expect(screen.getByText("This fare check has ended")).toBeInTheDocument();
    expect(screen.queryByRole("complementary", { name: "Selected fare" })).not.toBeInTheDocument();
  });
});
