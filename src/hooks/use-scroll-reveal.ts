import { useEffect, useState } from "react";

interface ScrollRevealOptions {
  pageKey?: string;
  revealAt?: number;
  hideAt?: number;
  /** Pages such as auth use a dedicated content scroller rather than window. */
  scrollContainerSelector?: string;
}

export function useScrollReveal({ pageKey, revealAt = 100, hideAt = 32, scrollContainerSelector }: ScrollRevealOptions = {}) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let frame: number | null = null;
    let initial = true;
    const readPosition = () => {
      frame = null;
      const container = scrollContainerSelector ? document.querySelector<HTMLElement>(scrollContainerSelector) : null;
      const top = Math.max(0, container ? container.scrollTop : window.scrollY);
      if (initial) { setVisible(top >= revealAt); initial = false; }
      else setVisible(current => current ? top > hideAt : top >= revealAt);
    };
    const schedule = () => {
      if (frame === null) frame = window.requestAnimationFrame(readPosition);
    };
    const onContainerScroll = (event: Event) => {
      if (event.target instanceof HTMLElement && scrollContainerSelector && event.target.matches(scrollContainerSelector)) schedule();
    };
    readPosition();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("pageshow", schedule);
    document.addEventListener("scroll", onContainerScroll, { passive: true, capture: true });
    return () => {
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("pageshow", schedule);
      document.removeEventListener("scroll", onContainerScroll, true);
      if (frame !== null) window.cancelAnimationFrame(frame);
    };
  }, [pageKey, revealAt, hideAt, scrollContainerSelector]);

  return visible;
}
