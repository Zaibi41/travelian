import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { GroupTicketingSearchBar } from "./GroupTicketingSearchBar";

vi.mock("@/lib/group-ticketing", () => ({
  fetchGroupTickets: vi.fn().mockResolvedValue([]),
  extractAvailableSectors: vi.fn().mockReturnValue([]),
}));

describe("group ticketing route shortcuts", () => {
  it("prefills suggested routes without claiming inventory or searching automatically", async () => {
    const onSearch = vi.fn();
    render(<GroupTicketingSearchBar onSearch={onSearch} showLabels />);
    expect(await screen.findByText("Suggested routes:")).toBeInTheDocument();
    expect(screen.queryByText(/available\)/)).not.toBeInTheDocument();
    const route = screen.getByRole("button", { name: "LHE → JED" });
    fireEvent.click(route);
    expect(route).toHaveAttribute("aria-pressed", "true");
    expect(onSearch).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Search" }));
    expect(onSearch).toHaveBeenCalledWith({ from: "LHE", to: "JED", dateFrom: undefined });
    await waitFor(() => expect(screen.getByText("Suggested routes:")).toBeInTheDocument());
  });

  it("prefers supplied API sectors and preserves their existing search behavior", () => {
    const onSearch = vi.fn();
    render(<GroupTicketingSearchBar onSearch={onSearch} availableSectors={[
      { sector: "DXB-LHE", from: "DXB", to: "LHE", label: "DXB → LHE", count: 3 },
    ]} />);
    expect(screen.getByText("Available Sectors:")).toBeInTheDocument();
    expect(screen.queryByText("Suggested routes:")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "LHE → JED" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /DXB → LHE/ }));
    expect(onSearch).toHaveBeenCalledWith({ from: "DXB", to: "LHE", dateFrom: undefined });
  });
});
