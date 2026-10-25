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
  it("preserves existing preferences and submits only when Search is pressed", () => {
    const submit = vi.fn();
    render(<Harness submit={submit} />);
    expect(submit).not.toHaveBeenCalled();
    expect(screen.getAllByRole("combobox")).toHaveLength(4);
    fireEvent.click(screen.getByRole("button", { name: "Search" }));
    expect(submit).toHaveBeenCalledWith(expect.objectContaining({ city: "Lahore", travelers: { adults: 2, children: 1, infants: 1, cabin: "Economy" } }));
  });
  it("exposes the four retained fields without removed controls", () => {
    const submit = vi.fn();
    render(<Harness submit={submit} />);
    for (const name of ["Departure City", "Travel Month", "Package Type", "Duration"]) {
      expect(screen.getByRole("combobox", { name })).toBeInTheDocument();
    }
    expect(screen.queryByRole("combobox", { name: "Room Type" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Travelers|Clear search/ })).not.toBeInTheDocument();
    expect(submit).not.toHaveBeenCalled();
  });
});
