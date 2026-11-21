import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AdminAnnouncementTicker } from "./AdminAnnouncementTicker";

const item = (id: string, message: string) => ({ id, message, created_at: "2026-11-22T10:00:00Z" });

function reducedMotion(matches: boolean) {
  vi.spyOn(window, "matchMedia").mockImplementation((query: string) => ({
    matches: matches && query.includes("reduce"), media: query, onchange: null,
    addListener: () => {}, removeListener: () => {}, addEventListener: () => {}, removeEventListener: () => {}, dispatchEvent: () => false,
  }));
}

afterEach(() => vi.restoreAllMocks());

describe("admin announcement ticker (#92)", () => {
  it("renders nothing when there are no announcements", () => {
    const { container } = render(<AdminAnnouncementTicker items={[]} />);
    expect(container).toBeEmptyDOMElement();
    expect(screen.queryByRole("region", { name: "Announcements" })).toBeNull();
  });

  it("shows each message once to screen readers, newest first as given", () => {
    render(<AdminAnnouncementTicker items={[item("b", "New group seats on LHE-JED"), item("a", "Airblue fares lower today")]} />);
    const region = screen.getByRole("region", { name: "Announcements" });
    expect(region).toHaveTextContent("New group seats on LHE-JEDAirblue fares lower today");
    expect(screen.getAllByText("New group seats on LHE-JED")).toHaveLength(1);
  });

  it("long messages scroll (a hidden second copy), and the animation pauses on hover and focus", () => {
    reducedMotion(false);
    const animation = { pause: vi.fn(), play: vi.fn(), cancel: vi.fn() };
    const animate = vi.fn(() => animation);
    Object.defineProperty(HTMLElement.prototype, "animate", { configurable: true, value: animate });
    vi.spyOn(HTMLElement.prototype, "scrollWidth", "get").mockReturnValue(2000);
    vi.spyOn(HTMLElement.prototype, "clientWidth", "get").mockReturnValue(300);
    render(<AdminAnnouncementTicker items={[item("a", "x".repeat(240))]} />);
    expect(animate).toHaveBeenCalledTimes(1);
    expect(screen.getAllByText("x".repeat(240))).toHaveLength(2);
    const strip = screen.getByRole("region", { name: "Announcements" }).querySelector("[tabindex='0']") as HTMLElement;
    strip.dispatchEvent(new MouseEvent("mouseover", { bubbles: true }));
    strip.focus();
    expect(animation.pause).toHaveBeenCalled();
    strip.blur();
    expect(animation.play).toHaveBeenCalled();
    delete (HTMLElement.prototype as { animate?: unknown }).animate;
  });

  it("with reduced motion nothing moves: one copy, scrolls by hand", () => {
    reducedMotion(true);
    const animate = vi.fn();
    Object.defineProperty(HTMLElement.prototype, "animate", { configurable: true, value: animate });
    vi.spyOn(HTMLElement.prototype, "scrollWidth", "get").mockReturnValue(2000);
    vi.spyOn(HTMLElement.prototype, "clientWidth", "get").mockReturnValue(300);
    render(<AdminAnnouncementTicker items={[item("a", "y".repeat(240))]} />);
    expect(animate).not.toHaveBeenCalled();
    expect(screen.getAllByText("y".repeat(240))).toHaveLength(1);
    expect(screen.getByRole("region", { name: "Announcements" }).querySelector(".overflow-x-auto")).not.toBeNull();
    delete (HTMLElement.prototype as { animate?: unknown }).animate;
  });

  it("short messages that fit stay still", () => {
    reducedMotion(false);
    const animate = vi.fn();
    Object.defineProperty(HTMLElement.prototype, "animate", { configurable: true, value: animate });
    vi.spyOn(HTMLElement.prototype, "scrollWidth", "get").mockReturnValue(100);
    vi.spyOn(HTMLElement.prototype, "clientWidth", "get").mockReturnValue(600);
    render(<AdminAnnouncementTicker items={[item("a", "Short")]} />);
    expect(animate).not.toHaveBeenCalled();
    expect(screen.getAllByText("Short")).toHaveLength(1);
    delete (HTMLElement.prototype as { animate?: unknown }).animate;
  });
});
