import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useSearchHeaderState } from "./use-scroll-reveal";

class Observer {
  static instances: Observer[] = [];
  observe = vi.fn();
  disconnect = vi.fn();
  constructor(public callback: IntersectionObserverCallback, public options: IntersectionObserverInit = {}) { Observer.instances.push(this); }
}
let header: HTMLElement;
let search: HTMLElement;
const rect = (top: number, bottom: number) => ({ top, bottom, left: 0, right: 1000, width: 1000, height: bottom - top, x: 0, y: top, toJSON: () => ({}) });
const emit = (margin: string, isIntersecting: boolean, top: number, bottom: number) => act(() => {
  const observer = Observer.instances.find(item => (item.options.rootMargin ?? "") === margin)!;
  observer.callback([{ isIntersecting, boundingClientRect: rect(top, bottom), rootBounds: rect(margin.startsWith("-8") ? 8 : margin ? -8 : 0, 900) } as IntersectionObserverEntry], observer as unknown as IntersectionObserver);
});
beforeEach(() => {
  Observer.instances = [];
  vi.stubGlobal("IntersectionObserver", Observer);
  header = document.createElement("header");
  search = document.createElement("div");
  search.dataset.productSearchNavigation = "";
  document.body.append(header, search);
  vi.spyOn(header, "getBoundingClientRect").mockReturnValue(rect(0, 98));
  vi.spyOn(search, "getBoundingClientRect").mockReturnValue(rect(200, 500));
});
afterEach(() => { header.remove(); search.remove(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe("search visibility header states", () => {
  it("shows the full header at top, hides while search is visible, and sticks only after search exits", () => {
    const headerRef = { current: header };
    const { result } = renderHook(() => useSearchHeaderState({ pageKey: "/", headerRef }));
    expect(result.current).toBe("top");
    emit("", false, -120, -22);
    expect(result.current).toBe("search");
    emit("8px 0px 0px 0px", false, -400, -9);
    expect(result.current).toBe("sticky");
    emit("-8px 0px 0px 0px", true, -300, 9);
    expect(result.current).toBe("search");
    emit("", true, -40, 58);
    expect(result.current).toBe("top");
  });
  it("keeps a dead zone around the search edge instead of flickering", () => {
    const headerRef = { current: header };
    const { result } = renderHook(() => useSearchHeaderState({ pageKey: "/", headerRef }));
    emit("", false, -200, -102);
    emit("8px 0px 0px 0px", false, -400, -9);
    expect(result.current).toBe("sticky");
    emit("8px 0px 0px 0px", true, -390, -4);
    emit("-8px 0px 0px 0px", false, -390, 4);
    expect(result.current).toBe("sticky");
    emit("-8px 0px 0px 0px", true, -380, 9);
    expect(result.current).toBe("search");
  });
  it("does not show sticky navigation when the search is below the viewport", () => {
    const headerRef = { current: header };
    const { result } = renderHook(() => useSearchHeaderState({ pageKey: "/", headerRef }));
    emit("", false, -200, -102);
    emit("8px 0px 0px 0px", false, 1100, 1500);
    emit("-8px 0px 0px 0px", false, 1100, 1500);
    expect(result.current).toBe("search");
  });
  it("handles restored deep scroll positions immediately", () => {
    vi.mocked(header.getBoundingClientRect).mockReturnValue(rect(-600, -502));
    vi.mocked(search.getBoundingClientRect).mockReturnValue(rect(-500, -100));
    const headerRef = { current: header };
    const { result } = renderHook(() => useSearchHeaderState({ pageKey: "/", headerRef }));
    expect(result.current).toBe("sticky");
  });
  it("disconnects observers when the route changes or the component unmounts", () => {
    const headerRef = { current: header };
    const view = renderHook(({ pageKey }) => useSearchHeaderState({ pageKey, headerRef }), { initialProps: { pageKey: "/" } });
    const previous = [...Observer.instances];
    view.rerender({ pageKey: "/hotels-search" });
    previous.forEach(observer => expect(observer.disconnect).toHaveBeenCalledOnce());
    view.unmount();
    Observer.instances.forEach(observer => expect(observer.disconnect).toHaveBeenCalledOnce());
  });
  it("uses the natural header as a fallback on pages without search", () => {
    search.remove();
    const headerRef = { current: header };
    const { result } = renderHook(() => useSearchHeaderState({ pageKey: "/about", headerRef }));
    expect(Observer.instances[1].observe).toHaveBeenCalledWith(header);
    emit("", false, -120, -22);
    emit("8px 0px 0px 0px", false, -120, -22);
    expect(result.current).toBe("sticky");
  });
});
