import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useScrollReveal } from "./use-scroll-reveal";

let frames: Map<number, FrameRequestCallback>;
let sequence: number;
const flush = () => act(() => {
  const pending = [...frames.values()];
  frames.clear();
  pending.forEach(callback => callback(0));
});
const scroll = (top: number) => {
  Object.defineProperty(window, "scrollY", { configurable: true, value: top });
  window.dispatchEvent(new Event("scroll"));
};
beforeEach(() => {
  frames = new Map(); sequence = 0;
  Object.defineProperty(window, "scrollY", { configurable: true, value: 0 });
  vi.spyOn(window, "requestAnimationFrame").mockImplementation(callback => { frames.set(++sequence, callback); return sequence; });
  vi.spyOn(window, "cancelAnimationFrame").mockImplementation(id => { frames.delete(id); });
});
afterEach(() => { vi.restoreAllMocks(); document.querySelectorAll("[data-test-scroll]").forEach(element => element.remove()); });

describe("scroll-revealed header", () => {
  it("uses hysteresis to avoid flicker around the reveal threshold", () => {
    const { result } = renderHook(() => useScrollReveal());
    expect(result.current).toBe(false);
    for (const top of [1, 79, 99]) { scroll(top); flush(); expect(result.current).toBe(false); }
    scroll(100); flush(); expect(result.current).toBe(true);
    for (const top of [101, 99, 80, 33]) { scroll(top); flush(); expect(result.current).toBe(true); }
    scroll(32); flush(); expect(result.current).toBe(false);
    scroll(80); flush(); expect(result.current).toBe(false);
  });
  it("reads a restored page position on mount", () => {
    scroll(200);
    const { result } = renderHook(() => useScrollReveal());
    expect(result.current).toBe(true);
  });
  it("coalesces scroll events and cancels queued work on unmount", () => {
    const view = renderHook(() => useScrollReveal());
    scroll(120); scroll(121); scroll(122);
    expect(frames.size).toBe(1);
    view.unmount();
    expect(window.cancelAnimationFrame).toHaveBeenCalled();
    expect(frames.size).toBe(0);
    scroll(200);
    expect(frames.size).toBe(0);
  });
  it("tracks a marked page scroller and ignores component scrolling", () => {
    const root = document.createElement("div"); root.dataset.testScroll = "page"; document.body.append(root);
    const popup = document.createElement("div"); popup.dataset.testScroll = "popup"; document.body.append(popup);
    const { result } = renderHook(() => useScrollReveal({ scrollContainerSelector: '[data-test-scroll="page"]' }));
    popup.scrollTop = 200; popup.dispatchEvent(new Event("scroll")); flush();
    expect(result.current).toBe(false);
    root.scrollTop = 100; root.dispatchEvent(new Event("scroll")); flush();
    expect(result.current).toBe(true);
    root.scrollTop = 0; root.dispatchEvent(new Event("scroll")); flush();
    expect(result.current).toBe(false);
  });
  it("rechecks visibility when the route changes", () => {
    scroll(200);
    const { result, rerender } = renderHook(({ pageKey }) => useScrollReveal({ pageKey }), { initialProps: { pageKey: "/" } });
    expect(result.current).toBe(true);
    Object.defineProperty(window, "scrollY", { configurable: true, value: 0 });
    rerender({ pageKey: "/signin" });
    expect(result.current).toBe(false);
  });
});
