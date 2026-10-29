import { useLayoutEffect, useState, type RefObject } from "react";

type HeaderState = "top" | "search" | "sticky";

/** Observe document-flow elements, never the moving/fixed navigation itself. */
export function useSearchHeaderState({ pageKey, headerRef }: { pageKey: string; headerRef: RefObject<HTMLElement> }): HeaderState {
  const [state, setState] = useState<HeaderState>("top");

  useLayoutEffect(() => {
    const header = headerRef.current;
    if (!header) return;
    let disposed = false;
    let headerVisible = header.getBoundingClientRect().bottom > 0;
    let searchPassed = false;
    let searchObservers: IntersectionObserver[] = [];
    let pendingTarget: MutationObserver | undefined;
    const publish = () => { if (!disposed) setState(headerVisible ? "top" : searchPassed ? "sticky" : "search"); };

    const observeSearch = (target: Element) => {
      if (disposed) return;
      searchObservers.forEach(observer => observer.disconnect());
      searchPassed = target.getBoundingClientRect().bottom <= -8;
      publish();
      // Reveal only after the product tabs are 8px above the viewport. Hide once 8px
      // re-enters. Separate observer margins preserve this small dead zone.
      const reveal = new IntersectionObserver(([entry]) => {
        if (!entry.isIntersecting && entry.boundingClientRect.bottom <= (entry.rootBounds?.top ?? -8)) {
          searchPassed = true;
          publish();
        }
      }, { rootMargin: "8px 0px 0px 0px", threshold: 0 });
      const hide = new IntersectionObserver(([entry]) => {
        if (entry.isIntersecting || entry.boundingClientRect.top >= (entry.rootBounds?.bottom ?? window.innerHeight)) {
          searchPassed = false;
          publish();
        }
      }, { rootMargin: "-8px 0px 0px 0px", threshold: 0 });
      reveal.observe(target);
      hide.observe(target);
      searchObservers = [reveal, hide];
    };

    const headerObserver = new IntersectionObserver(([entry]) => {
      headerVisible = entry.isIntersecting;
      publish();
    }, { threshold: 0 });
    headerObserver.observe(header);

    const search = document.querySelector("[data-product-search-navigation]");
    // Content-only pages still get a compact header after the normal header
    // leaves view. An auth page's own scroller does not move its outer header.
    observeSearch(search ?? header);
    if (!search) {
      pendingTarget = new MutationObserver(() => {
        const mountedSearch = document.querySelector("[data-product-search-navigation]");
        if (!mountedSearch) return;
        pendingTarget?.disconnect();
        observeSearch(mountedSearch);
      });
      pendingTarget.observe(document.querySelector("main") ?? document.body, { childList: true, subtree: true });
    }

    return () => {
      disposed = true;
      headerObserver.disconnect();
      searchObservers.forEach(observer => observer.disconnect());
      pendingTarget?.disconnect();
    };
  }, [pageKey, headerRef]);

  return state;
}
