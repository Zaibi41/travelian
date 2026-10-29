import { useCallback, useLayoutEffect, useState, type ForwardedRef } from "react";

/** Bring the search card into view, then keep sufficient room below its fields. */
export function makeRoomBelowField(trigger: HTMLElement) {
  if (trigger.closest("header")) return;
  const viewport = window.visualViewport;
  const bottom = viewport ? viewport.offsetTop + viewport.height : window.innerHeight;
  const rect = trigger.getBoundingClientRect();
  const card = trigger.closest<HTMLElement>(".travelian-search-card");
  if (card && !trigger.closest('[role="dialog"]')) {
    const cardDelta = card.getBoundingClientRect().top - 16;
    // Long mobile/multi-city forms must keep the actual active field visible too.
    const fieldDelta = rect.bottom - (bottom - Math.min(320, bottom / 2));
    const delta = Math.max(cardDelta, fieldDelta);
    if (Math.abs(delta) > 2) window.scrollBy({ top: delta, behavior: "instant" });
    return;
  }
  if (bottom - rect.bottom >= Math.min(440, bottom - 100)) return;
  let parent = trigger.parentElement;
  while (parent && parent !== document.body) {
    if (/(auto|scroll)/.test(getComputedStyle(parent).overflowY) && parent.scrollHeight > parent.clientHeight) {
      parent.scrollTop += Math.max(0, rect.top - Math.max(72, parent.getBoundingClientRect().top + 12));
      return;
    }
    parent = parent.parentElement;
  }
  if (trigger.closest('[role="dialog"]')) return;
  window.scrollBy({ top: Math.max(0, rect.top - 72), behavior: "instant" });
}

/** Keep field overlays below their anchor, with horizontal collision handling. */
export function useBelowField<T extends HTMLElement>(forwardedRef: ForwardedRef<T>) {
  const [node, setNode] = useState<T | null>(null);
  const [viewportHeight, setViewportHeight] = useState(() => typeof window === "undefined" ? 0 : window.innerHeight);
  const ref = useCallback((element: T | null) => {
    setNode(element);
    if (typeof forwardedRef === "function") forwardedRef(element);
    else if (forwardedRef) forwardedRef.current = element;
  }, [forwardedRef]);
  const measure = useCallback(() => {
    if (!node) return;
    const viewport = window.visualViewport;
    const bottom = viewport ? viewport.offsetTop + viewport.height : window.innerHeight;
    node.style.setProperty("--travelian-dropdown-available-height", `${Math.max(0, bottom - node.getBoundingClientRect().top - 12)}px`);
  }, [node]);
  useLayoutEffect(() => {
    if (!node) return;
    let frame = 0;
    const update = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => { setViewportHeight(window.innerHeight); measure(); });
    };
    if (node.id) {
      const trigger = Array.from(document.querySelectorAll<HTMLElement>("[aria-controls]")).find(element => {
        const target = document.getElementById(element.getAttribute("aria-controls") ?? "");
        return target === node || (target !== null && node.contains(target));
      });
      if (trigger) makeRoomBelowField(trigger);
    }
    measure();
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    window.visualViewport?.addEventListener("resize", update);
    window.visualViewport?.addEventListener("scroll", update);
    const observer = new ResizeObserver(update);
    observer.observe(node);
    const placement = new MutationObserver(update);
    if (node.parentElement) placement.observe(node.parentElement, { attributes: true, attributeFilter: ["style"] });
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      placement.disconnect();
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
      window.visualViewport?.removeEventListener("resize", update);
      window.visualViewport?.removeEventListener("scroll", update);
    };
  }, [node, measure]);
  // Extend only the vertical collision boundary so Radix never flips upwards.
  // Horizontal collision detection remains active; actual height is capped below.
  return { ref, measure, collisionPadding: { top: 0, bottom: -viewportHeight, left: 16, right: 16 } };
}
