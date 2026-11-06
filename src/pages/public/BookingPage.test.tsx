import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { umrahOffers } from "@/data/services/umrah";
import { umrahOfferToPackage } from "@/data/services/umrah-adapter";
import type { UmrahPackage } from "@/data/models";
import BookingPage from "./BookingPage";

const inventory = vi.hoisted(() => ({ packages: [] as UmrahPackage[], tourPackages: [], visaPackages: [], packageLoadStatus: "error" }));
vi.mock("@/contexts/AdminStore", () => ({ useAdmin: () => inventory }));
function page(id: string) {
  return <HelmetProvider><MemoryRouter initialEntries={[`/booking?type=umrah&id=${id}`]}><BookingPage /></MemoryRouter></HelmetProvider>;
}
beforeEach(() => { inventory.packages = []; inventory.packageLoadStatus = "error"; });
describe("Shared Umrah booking links", () => {
  it.each(umrahOffers)("resolves catalogue offer $id when the API fails", offer => {
    render(page(offer.id));
    expect(screen.getAllByText(offer.name).length).toBeGreaterThan(0);
    expect(screen.queryByText("No booking selected")).not.toBeInTheDocument();
  });
  it("clearly identifies a saved request as local rather than sent", () => {
    render(page(umrahOffers[0].id));
    fireEvent.change(screen.getByLabelText("Name *"), { target: { value: "Test Traveller" } });
    fireEvent.change(screen.getByLabelText("Phone number *"), { target: { value: "+923001234567" } });
    fireEvent.click(screen.getByRole("button", { name: "Save Request" }));
    expect(screen.getByRole("heading", { name: "Request saved on this device" })).toBeInTheDocument();
    expect(screen.getByText(/It has not been sent to Travelian/)).toBeInTheDocument();
  });
  it("does not invent a package for an unknown id", () => {
    render(page("unknown-package"));
    expect(screen.getByRole("heading", { name: "Package unavailable" })).toBeInTheDocument();
  });
  it("does not revive a withdrawn API package from the catalogue", () => {
    inventory.packages = [{ ...umrahOfferToPackage(umrahOffers[0]), deletedAt: "2026-10-29" }];
    inventory.packageLoadStatus = "success";
    render(page(umrahOffers[0].id));
    expect(screen.getByRole("heading", { name: "Package unavailable" })).toBeInTheDocument();
  });
  it("resolves asynchronously loaded inventory without changing hook order", () => {
    inventory.packageLoadStatus = "loading";
    const view = render(page("api-only-package"));
    expect(screen.getByRole("status")).toHaveTextContent("Loading package details");
    inventory.packages = [{ ...umrahOfferToPackage(umrahOffers[0]), packageId: "api-only-package", name: "API Umrah Package" }];
    inventory.packageLoadStatus = "success";
    view.rerender(page("api-only-package"));
    expect(screen.getAllByText("API Umrah Package").length).toBeGreaterThan(0);
  });
});
