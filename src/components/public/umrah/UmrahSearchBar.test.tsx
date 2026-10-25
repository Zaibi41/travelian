import "@testing-library/jest-dom/vitest";
import { useState } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { umrahOffers } from "@/data/services/umrah";
import { DEFAULT_UMRAH_SEARCH, type UmrahSearchValues } from "@/lib/umrah-search";
import { UmrahSearchBar } from "./UmrahSearchBar";

function Harness({ submit }: { submit: (value: UmrahSearchValues) => void }) {
  const [value, onChange] = useState({ ...DEFAULT_UMRAH_SEARCH, city: "Lahore", travelers: { adults: 2, children: 1, infants: 1, cabin: "Economy" } });
  return <UmrahSearchBar offers={umrahOffers} value={value} onChange={onChange} onSearch={submit} />;
}
describe("shared Umrah search form", () => {
  it("submits selected discovery and traveller preferences only when Search is pressed", () => {
    const submit = vi.fn();
    render(<Harness submit={submit} />);
    expect(submit).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "4 Travelers" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Search Umrah Packages" }));
    expect(submit).toHaveBeenCalledWith(expect.objectContaining({ city: "Lahore", travelers: { adults: 2, children: 1, infants: 1, cabin: "Economy" } }));
  });
  it("clears committed preferences as well as the visible draft", () => {
    const submit = vi.fn();
    render(<Harness submit={submit} />);
    fireEvent.click(screen.getByRole("button", { name: "Clear search" }));
    expect(submit).toHaveBeenCalledWith(DEFAULT_UMRAH_SEARCH);
    expect(screen.getByRole("button", { name: "1 Traveler" })).toBeInTheDocument();
  });
});
