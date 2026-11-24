import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { HomeTopRoutes } from "./HomeTopRoutes";

afterEach(() => vi.useRealTimers());

describe("Popular Routes departure dates", () => {
  it.each([
    [2026, 10, 29, "2026-10-30"],
    [2026, 10, 31, "2026-11-01"],
    [2026, 12, 31, "2027-01-01"],
    [2027, 1, 31, "2027-02-01"],
    [2028, 2, 28, "2028-02-29"],
    [2028, 2, 29, "2028-03-01"],
    [2026, 3, 8, "2026-03-09"],
    [2026, 11, 1, "2026-11-02"],
  ])("uses local tomorrow for every route on %i-%i-%i", (year, month, day, expected) => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(Number(year), Number(month) - 1, Number(day), 23, 59, 59));
    render(<MemoryRouter><HomeTopRoutes /></MemoryRouter>);
    const links = screen.getAllByRole("link");
    expect(links).toHaveLength(10);
    for (const link of links) {
      const url = new URL(link.getAttribute("href")!, "https://travelian.pk");
      expect(url.pathname).toBe("/flights-search");
      expect(url.searchParams.get("depart")).toBe(expected);
      expect(url.searchParams.get("from")).toMatch(/^[A-Z]{3}$/);
      expect(url.searchParams.get("to")).toMatch(/^[A-Z]{3}$/);
      expect(url.searchParams.has("trip")).toBe(false);
      expect([...url.searchParams.keys()]).toEqual(["from", "to", "depart"]);
    }
    expect(screen.getByRole("link", { name: /Lahore to Dubai.*Search Flights/i })).toHaveAttribute("href", `/flights-search?from=LHE&to=DXB&depart=${expected}`);
  });

  it("leaves the date out of the prerendered HTML, so a saved page never links to a past date", () => {
    const html = renderToString(<MemoryRouter><HomeTopRoutes /></MemoryRouter>);
    expect(html).toContain('href="/flights-search?from=LHE&amp;to=DXB"');
    expect(html).not.toContain("depart=");
  });
});
