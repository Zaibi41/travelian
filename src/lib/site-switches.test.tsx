import "@testing-library/jest-dom/vitest";
import { act, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { ProductTabs } from "@/components/public/ProductTabs";
import { PublicLayout } from "@/components/public/PublicLayout";
import { HelmetProvider } from "react-helmet-async";
import { LocaleProvider } from "@/contexts/LocaleContext";
import { isUmrahPath, setSiteSwitchesForTest } from "./site-switches";

// D39: one gateway switch hides every Umrah entry point and URL; nothing is deleted.
describe("Umrah switch", () => {
  it("hides the Umrah tab while off and shows it when on", () => {
    act(() => setSiteSwitchesForTest({ umrah: false }));
    const { rerender } = render(<MemoryRouter><ProductTabs active="flights" /></MemoryRouter>);
    expect(screen.queryByRole("button", { name: "Umrah" })).not.toBeInTheDocument();
    act(() => setSiteSwitchesForTest({ umrah: true }));
    rerender(<MemoryRouter><ProductTabs active="flights" /></MemoryRouter>);
    expect(screen.getByRole("button", { name: "Umrah" })).toBeInTheDocument();
  });

  it("a direct Umrah URL shows the not-found state while off, never the page", () => {
    // jsdom has no IntersectionObserver (the navbar uses it for its sticky state).
    globalThis.IntersectionObserver ??= class { observe() {} unobserve() {} disconnect() {} takeRecords() { return []; } } as unknown as typeof IntersectionObserver;
    act(() => setSiteSwitchesForTest({ umrah: false }));
    render(<HelmetProvider><LocaleProvider><MemoryRouter initialEntries={["/umrah/umrah-eco-lhe-14"]}>
      <PublicLayout><p>Umrah package page</p></PublicLayout>
    </MemoryRouter></LocaleProvider></HelmetProvider>);
    expect(screen.queryByText("Umrah package page")).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Page not found" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Umrah" })).not.toBeInTheDocument();
  });

  it("recognises every Umrah URL, including Umrah booking and request links", () => {
    for (const href of ["/umrah-packages", "/umrah/abc", "/umrah-sample", "/booking?type=umrah", "/request-booking?category=umrah"]) {
      expect(isUmrahPath(href)).toBe(true);
    }
    for (const href of ["/", "/group-ticketing", "/booking?type=flight", "/hotels-search"]) expect(isUmrahPath(href)).toBe(false);
  });
});
