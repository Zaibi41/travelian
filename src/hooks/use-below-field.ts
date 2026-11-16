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

/** Lists are capped at 24rem (select.tsx, popover.tsx, dropdown-menu.tsx). */
const LIST_MAX = 384;
const TOP_GAP = 72;   // keep the field below the sticky top bar
const BOTTOM_GAP = 12;

function scrollParent(element: HTMLElement): HTMLElement | null {
  let parent = element.parentElement;
  while (parent && parent !== document.body) {
    if (/(auto|scroll)/.test(getComputedStyle(parent).overflowY) && parent.scrollHeight > parent.clientHeight) return parent;
    parent = parent.parentElement;
  }
  return null;
}

/** The list's full height, up to the 24rem cap: what it shows plus what the space cap hides. A part with its own fixed
 *  height (e.g. a long country list that always scrolls inside) counts as shown. */
function wantedHeight(list: HTMLElement) {
  let hidden = Math.max(0, list.scrollHeight - list.clientHeight);
  list.querySelectorAll<HTMLElement>("*").forEach(element => {
    const style = getComputedStyle(element);
    if (element.scrollHeight > element.clientHeight + 1 && /(auto|scroll)/.test(style.overflowY) && style.maxHeight === "none") {
      hidden = Math.max(hidden, element.scrollHeight - element.clientHeight);
    }
  });
  return Math.min(LIST_MAX, list.offsetHeight + hidden);  // layout height: the open animation's scale doesn't count
}

/** After an open list is placed under its field: scroll the page (or the field's scrolling panel) so the whole list is on
 *  screen, keeping the field itself in view. Where the page ends too soon, bottom room is added while the list is open.
 *  Returns the undo for that room. Not inside the top bar or a dialog that can't scroll. */
export function bringListIntoView(list: HTMLElement, trigger: HTMLElement | null): () => void {
  const anchor = trigger ?? list;
  if (anchor.closest("header")) return () => undefined;
  const viewport = window.visualViewport;
  const bottom = viewport ? viewport.offsetTop + viewport.height : window.innerHeight;
  const rect = list.getBoundingClientRect();
  const need = rect.top + wantedHeight(list) - (bottom - BOTTOM_GAP);
  if (need <= 1) return () => undefined;
  const fieldTop = (trigger ?? list).getBoundingClientRect().top - (trigger ? 0 : 48);
  const delta = Math.min(need, Math.max(0, fieldTop - TOP_GAP));
  if (delta <= 1) return () => undefined;
  const panel = scrollParent(anchor);
  if (!panel && anchor.closest('[role="dialog"]')) return () => undefined;
  const room = panel ? panel.scrollHeight - panel.clientHeight - panel.scrollTop : document.documentElement.scrollHeight - window.innerHeight - window.scrollY;
  let undo = () => undefined as void;
  if (room < delta) {
    const target = panel ?? document.body;
    const previous = target.style.paddingBottom;
    const current = parseFloat(getComputedStyle(target).paddingBottom) || 0;
    target.style.paddingBottom = `${current + Math.ceil(delta - room) + BOTTOM_GAP}px`;
    undo = () => { if (previous) target.style.paddingBottom = previous; else target.style.removeProperty("padding-bottom"); };
  }
  if (panel) panel.scrollTop += delta;
  else window.scrollBy({ top: delta, behavior: "instant" });
  return undo;
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
    // Correct while the list settles (Radix re-places it after each scroll); after that the user's own scrolling wins.
    let placedAt = 0;
    const undos: (() => void)[] = [];
    const undoRoom = () => undos.splice(0).reverse().forEach(undo => undo());
    let trigger: HTMLElement | null = null;
    const update = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        setViewportHeight(window.innerHeight);
        measure();
        // Once the list sits under its field (Radix has placed it), make sure all of it is on screen.
        const top = node.getBoundingClientRect().top;
        if (top >= 0 && top < window.innerHeight && (placedAt === 0 || performance.now() - placedAt < 800)) {
          placedAt ||= performance.now();
          undos.push(bringListIntoView(node, trigger));
          measure();
        }
      });
    };
    if (node.id) {
      trigger = Array.from(document.querySelectorAll<HTMLElement>("[aria-controls]")).find(element => {
        if (node.contains(element)) return false;  // e.g. a search box inside the list is not its field
        const target = document.getElementById(element.getAttribute("aria-controls") ?? "");
        return target === node || (target !== null && node.contains(target));
      }) ?? null;
      if (trigger) makeRoomBelowField(trigger);
    }
    measure();
    update();
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    node.addEventListener("animationend", update);
    window.visualViewport?.addEventListener("resize", update);
    window.visualViewport?.addEventListener("scroll", update);
    const observer = new ResizeObserver(update);
    observer.observe(node);
    const placement = new MutationObserver(update);
    if (node.parentElement) placement.observe(node.parentElement, { attributes: true, attributeFilter: ["style"] });
    return () => {
      cancelAnimationFrame(frame);
      undoRoom();
      observer.disconnect();
      placement.disconnect();
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
      node.removeEventListener("animationend", update);
      window.visualViewport?.removeEventListener("resize", update);
      window.visualViewport?.removeEventListener("scroll", update);
    };
  }, [node, measure]);
  // Extend only the vertical collision boundary so Radix never flips upwards.
  // Horizontal collision detection remains active; actual height is capped below.
  return { ref, measure, collisionPadding: { top: 0, bottom: -viewportHeight, left: 16, right: 16 } };
}
