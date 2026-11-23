import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";

// #167: "Saved Travelers" popup on the admin traveler card: a search box, the recent saved people before typing,
// then a search by name or passport number. Gateway calls are mocked; made-up people.
const api = vi.hoisted(() => ({ recent: vi.fn(), search: vi.fn() }));
vi.mock("@/lib/saved-people/api", async importOriginal => ({ ...(await importOriginal<object>()), listRecentPeople: api.recent, searchTravelers: api.search }));

import { SavedTravelersDialog } from "./SavedTravelersDialog";

const person = (id: string, first: string, last: string, extra: Record<string, unknown> = {}) =>
  ({ id, first_name: first, last_name: last, documents: [], ...extra });
const AQSA = person("p1", "FNU", "AQSA", { nationality: "PAK", date_of_birth: "2000-06-29",
  documents: [{ id: "d1", id_type: "PSPT", document_number: "AG1316841", document_country: "PAK" }] });
const USAMA = person("p2", "Usama", "Javed", { nationality: "PAK" });

function renderDialog(onPick = vi.fn(), onOpenChange = vi.fn()) {
  render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
    <SavedTravelersDialog open onOpenChange={onOpenChange} travelerLabel="Adult 2" typeLabel="Adult" onPick={onPick} />
  </QueryClientProvider>);
  return { onPick, onOpenChange };
}

// Braces: a function returned from beforeEach runs as its cleanup.
beforeEach(() => { api.recent.mockReset(); api.search.mockReset(); });

describe("SavedTravelersDialog (#167)", () => {
  it("opens with a search box and the saved travelers, with the passenger type and how many were found", async () => {
    api.recent.mockResolvedValue({ results: [AQSA, USAMA], can_manage: true, can_merge: false });
    renderDialog();
    const dialog = screen.getByRole("dialog", { name: "Pick from Saved Travelers" });
    expect(within(dialog).getByPlaceholderText("Search by name or passport number...")).toHaveFocus();
    expect(await within(dialog).findByText("Found 2 travelers")).toBeInTheDocument();
    expect(within(dialog).getByText("Adult")).toBeInTheDocument();
    expect(within(dialog).getByRole("button", { name: /FNU AQSA/ })).toHaveTextContent("Pakistan · Passport AG1316841 · 29 Jun 2000");
    expect(within(dialog).getByRole("button", { name: /Usama Javed/ })).toHaveTextContent("Pakistan");
    expect(within(dialog).getByRole("button", { name: "Cancel" })).toBeInTheDocument();
    expect(within(dialog).queryByText(/Upload/)).not.toBeInTheDocument();
  });

  it("searches by name or passport number from 2 characters and picks a traveler", async () => {
    api.recent.mockResolvedValue({ results: [AQSA, USAMA], can_manage: true, can_merge: false });
    api.search.mockResolvedValue({ results: [USAMA], can_manage: true, can_merge: false });
    const { onPick, onOpenChange } = renderDialog();
    fireEvent.change(screen.getByPlaceholderText("Search by name or passport number..."), { target: { value: "usa" } });
    await waitFor(() => expect(api.search).toHaveBeenCalledWith("usa", expect.anything()));
    expect(await screen.findByText("Found 1 traveler")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Usama Javed/ }));
    expect(onPick).toHaveBeenCalledWith(USAMA);
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("says when nothing matches, and when the list can't be loaded", async () => {
    api.recent.mockResolvedValue({ results: [], can_manage: true, can_merge: false });
    api.search.mockRejectedValue(new Error("down"));
    renderDialog();
    expect(await screen.findByText("No saved travelers yet.")).toBeInTheDocument();
    fireEvent.change(screen.getByPlaceholderText("Search by name or passport number..."), { target: { value: "zz" } });
    expect(await screen.findByRole("alert")).toHaveTextContent("Saved travelers can't be loaded right now.");
  });
});
