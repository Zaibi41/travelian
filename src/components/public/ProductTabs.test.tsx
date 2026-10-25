import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, useLocation } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { ProductTabs } from "./ProductTabs";
function Location() { return <output data-testid="path">{useLocation().pathname}</output>; }
describe("shared product navigation", () => {
  it("preserves local search-tab selection without routing", () => {
    const select = vi.fn();
    render(<MemoryRouter><ProductTabs active="flights" onSelect={select} /><Location /></MemoryRouter>);
    expect(screen.getByRole("button", { name: "Flights" })).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(screen.getByRole("button", { name: "Hotels" }));
    expect(select).toHaveBeenCalledWith("hotels");
    expect(screen.getByTestId("path")).toHaveTextContent("/");
  });
  it("uses the existing product route from a results page", () => {
    render(<MemoryRouter initialEntries={["/hotels-search"]}><ProductTabs active="hotels" /><Location /></MemoryRouter>);
    fireEvent.click(screen.getByRole("button", { name: "Group Ticketing" }));
    expect(screen.getByTestId("path")).toHaveTextContent("/group-ticketing");
  });
});
