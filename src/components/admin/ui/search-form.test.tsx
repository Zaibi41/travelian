import { fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { buildIndex, type Airport } from "@/lib/admin-search/airports";

// jsdom has no ResizeObserver; the Radix popover needs one.
globalThis.ResizeObserver ??= class {
  observe() {}
  unobserve() {}
  disconnect() {}
} as unknown as typeof ResizeObserver;

const AIRPORTS: Airport[] = [
  { iata: "LHE", name: "Allama Iqbal International Airport", city: "Lahore", country: "Pakistan", countryCode: "PK", type: "large" },
  { iata: "JED", name: "King Abdulaziz International Airport", city: "Jeddah", country: "Saudi Arabia", countryCode: "SA", type: "large" },
];
const index = buildIndex(AIRPORTS);
vi.mock("@/hooks/use-airports", () => ({ useAirports: () => index }));

import { AirportLines, RouteRow, SearchProductTabs, SearchSubmitButton, SwapButton } from "./search-form";
import { SectorAirportSelect } from "./SectorAirportSelect";
import { AirportCombobox } from "./AirportCombobox";
import { useState } from "react";
import { DayFirstDateField } from "@/components/admin/ui/DayFirstDateField";

describe("shared search form parts", () => {
  it("AirportLines: IATA - City, then name and country; a code not in the list shows alone", () => {
    const { container, rerender } = render(<AirportLines code="LHE" airport={AIRPORTS[0]} icon="departure" />);
    expect(container).toHaveTextContent("LHE - Lahore");
    expect(container).toHaveTextContent("Allama Iqbal International Airport, Pakistan");
    expect(container.querySelector(".lucide-plane-takeoff")).not.toBeNull();
    rerender(<AirportLines code="ZZQ" />);
    expect(container.textContent).toBe("ZZQ");
  });

  it("SwapButton and RouteRow: icon only, named, swaps", () => {
    const onSwap = vi.fn();
    render(<RouteRow from={<p>from field</p>} to={<p>to field</p>} onSwap={onSwap} />);
    const swap = screen.getByRole("button", { name: "Swap origin and destination" });
    expect(swap.textContent).toBe("");
    fireEvent.click(swap);
    expect(onSwap).toHaveBeenCalledTimes(1);
    expect(screen.getByText("from field")).toBeInTheDocument();
    expect(screen.getByText("to field")).toBeInTheDocument();
  });

  it("SwapButton alone", () => {
    const onSwap = vi.fn();
    render(<SwapButton onSwap={onSwap} />);
    fireEvent.click(screen.getByRole("button", { name: "Swap origin and destination" }));
    expect(onSwap).toHaveBeenCalled();
  });

  it("SearchSubmitButton keeps the admin label, with the magnifier", () => {
    const { container } = render(<SearchSubmitButton label="Search group fares" disabled />);
    expect(screen.getByRole("button", { name: "Search group fares" })).toBeDisabled();
    expect(container.querySelector(".lucide-search")).not.toBeNull();
  });

  it("SearchProductTabs: three tabs with the public icons (no Umrah); the active one is marked", () => {
    render(<MemoryRouter><SearchProductTabs active="group-ticketing" /></MemoryRouter>);
    const nav = screen.getByRole("navigation", { name: "Search products" });
    expect(within(nav).getAllByRole("link").map(link => link.textContent)).toEqual(["Flights", "Group Ticketing", "Hotels"]);
    expect(nav.querySelectorAll("[data-tab-icon]")).toHaveLength(3);
    expect(within(nav).getByRole("link", { name: "Group Ticketing" })).toHaveAttribute("aria-current", "page");
    expect(within(nav).getByRole("link", { name: "Flights" })).toHaveAttribute("href", "/admin/bookings/new?tab=flights");
  });

  it("SectorAirportSelect lists only the given codes and chooses with the keyboard", () => {
    const onChange = vi.fn();
    render(<SectorAirportSelect id="t-from" label="From" placeholder="Origin" codes={["JED", "LHE", "ZZQ"]} onChange={onChange} />);
    const field = screen.getByRole("combobox", { name: "From" });
    expect(field).toHaveTextContent("Origin");
    fireEvent.keyDown(field, { key: "ArrowDown" });
    const options = screen.getAllByRole("option");
    expect(options.map(option => option.textContent)).toEqual([
      "JED - JeddahKing Abdulaziz International Airport, Saudi Arabia", "LHE - LahoreAllama Iqbal International Airport, Pakistan", "ZZQ",
    ]);
    fireEvent.keyDown(field, { key: "ArrowDown" });
    fireEvent.keyDown(field, { key: "Enter" });
    expect(onChange).toHaveBeenCalledWith("LHE");
  });

  it("SectorAirportSelect shows the chosen airport on one line with an x", () => {
    const onChange = vi.fn();
    render(<SectorAirportSelect id="t-to" label="To" placeholder="Destination" icon="arrival" codes={["JED"]} value="JED" onChange={onChange} />);
    expect(screen.getByRole("button", { name: "To Jeddah – JED" })).toBeInTheDocument();
    expect(document.body).not.toHaveTextContent(/King Abdulaziz|Saudi Arabia/);
    fireEvent.click(screen.getByRole("button", { name: "Clear to airport" }));
    expect(onChange).toHaveBeenCalledWith(undefined);
  });

  it("DayFirstDateField search look: leading calendar, day-first value", () => {
    render(<DayFirstDateField id="d" variant="search" value="2026-11-24" onChange={() => undefined} />);
    expect(screen.getByRole("textbox")).toHaveValue("24 Nov 2026");
    expect(screen.getByRole("button", { name: "Choose from calendar" }).className).toContain("left-1");
  });

  it("choosing an airport shows one line, 'Lahore – LHE', with no airport name; the suggestions still show the name", () => {
    function From() {
      const [value, setValue] = useState<string | undefined>();
      return <AirportCombobox id="t-from" label="From" placeholder="Origin" value={value} onChange={setValue} />;
    }
    render(<From />);
    fireEvent.focus(screen.getByRole("combobox", { name: "From" }));
    fireEvent.change(screen.getByRole("combobox", { name: "From" }), { target: { value: "lah" } });
    const option = screen.getByRole("option", { name: /LHE - Lahore/ });
    expect(option).toHaveTextContent("Allama Iqbal International Airport, Pakistan");  // the list keeps code, city and airport name
    fireEvent.click(option);
    const chosen = screen.getByRole("button", { name: "From Lahore – LHE" });
    expect(chosen).toHaveTextContent(/^Lahore – LHE$/);
    expect(document.body).not.toHaveTextContent(/Allama Iqbal|Pakistan/);
    // One line, cut with an ellipsis; the field keeps the fixed search-field height.
    const text = chosen.querySelector("[data-airport-selected]")!;
    expect(text.className).toMatch(/\btruncate\b/);
    expect(text.className).toMatch(/whitespace-nowrap/);
    expect(chosen.parentElement!.className).toMatch(/\bh-14\b/);
    expect(chosen.parentElement!.className).not.toMatch(/min-h-14/);
  });
});
