import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { GroupFareCalendar, bands, shortPrice } from "./GroupFareCalendar";

// D33: only prices the supplier returned are shown; every other date is greyed out with no price.
const days = [
  { date: "2026-12-01", available: true, lowest_price: { amount_minor: 5_900_000, currency: "PKR" }, fares: 2 },
  { date: "2026-12-02", available: false },
  { date: "2026-12-03", available: false, lowest_price: { amount_minor: 1, currency: "PKR" } }, // not available: never shown
  { date: "2026-12-04", available: true, lowest_price: { amount_minor: 10_600_000, currency: "PKR" }, fares: 1 },
  { date: "2026-12-05", available: true, lowest_price: { amount_minor: 7_000_000, currency: "PKR" }, fares: 1 },
];

describe("GroupFareCalendar", () => {
  beforeEach(() => { vi.useFakeTimers({ toFake: ["Date"] }); vi.setSystemTime(new Date("2026-11-19T10:00:00")); });
  afterEach(() => vi.useRealTimers());

  it("never renders a price for a date the supplier didn't return", () => {
    render(<GroupFareCalendar days={days} onPick={() => {}} />);
    const cell = (label: RegExp) => screen.getByRole("button", { name: label });
    expect(cell(/Tuesday 1 December: from 59k/)).toHaveAttribute("data-available", "true");
    expect(cell(/Friday 4 December: from 106k/)).toHaveAttribute("data-available", "true");
    for (const empty of [/Wednesday 2 December: no availability/, /Thursday 3 December: no availability/, /Monday 7 December: no availability/]) {
      const button = cell(empty);
      expect(button).toBeDisabled();
      expect(button).toHaveAttribute("data-available", "false");
      expect(button.textContent).toMatch(/^\d+$/); // the day number only, no price
    }
    const priced = screen.getAllByRole("button").filter((button) => button.getAttribute("data-available") === "true");
    expect(priced).toHaveLength(3); // exactly the dates the supplier returned with seats
    expect(screen.getByText(/3 dates with seats/)).toBeInTheDocument();
  });

  it("colours prices low / avg / high, picks only priced dates, and shows the legend", () => {
    const pick = vi.fn();
    render(<GroupFareCalendar days={days} onPick={pick} />);
    expect(bands(days)).toEqual(new Map([["2026-12-01", "low"], ["2026-12-04", "high"], ["2026-12-05", "avg"]]));
    fireEvent.click(screen.getByRole("button", { name: /Wednesday 2 December/ }));
    fireEvent.click(screen.getByRole("button", { name: /Tuesday 1 December/ }));
    expect(pick).toHaveBeenCalledExactlyOnceWith("2026-12-01");
    expect(screen.getByText("Lowest fare per adult:")).toBeInTheDocument();
    expect(shortPrice(5_900_000)).toBe("59k") ;
  });

  it("a sector with nothing is all greyed out", () => {
    render(<GroupFareCalendar days={days.map((day) => ({ date: day.date, available: false }))} onPick={() => {}} />);
    expect(screen.getByText(/No dates with seats in this period/)).toBeInTheDocument();
    expect(screen.getAllByRole("button").filter((button) => button.getAttribute("data-available") === "true")).toHaveLength(0);
  });
});
