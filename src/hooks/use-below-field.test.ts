import { afterEach, describe, expect, it, vi } from "vitest";
import { bringListIntoView } from "./use-below-field";

function box(element: HTMLElement, top: number, height: number) {
  element.getBoundingClientRect = () => ({ top, bottom: top + height, height, left: 0, right: 100, width: 100, x: 0, y: top, toJSON: () => ({}) });
  Object.defineProperty(element, "offsetHeight", { configurable: true, value: height });
}

function setup({ listTop, listHeight, hidden = 0, fieldTop, pageLeft }: { listTop: number; listHeight: number; hidden?: number; fieldTop: number; pageLeft: number }) {
  document.body.innerHTML = "";
  const field = document.createElement("button");
  const list = document.createElement("div");
  document.body.append(field, list);
  box(field, fieldTop, 40);
  box(list, listTop, listHeight);
  Object.defineProperty(list, "clientHeight", { configurable: true, value: listHeight });
  Object.defineProperty(list, "scrollHeight", { configurable: true, value: listHeight + hidden });
  Object.defineProperty(window, "innerHeight", { configurable: true, value: 760 });
  Object.defineProperty(document.documentElement, "scrollHeight", { configurable: true, value: 760 + 500 + pageLeft });
  Object.defineProperty(window, "scrollY", { configurable: true, value: 500 });
  const scrollBy = vi.fn();
  window.scrollBy = scrollBy as unknown as typeof window.scrollBy;
  return { field, list, scrollBy };
}

afterEach(() => { document.body.innerHTML = ""; document.body.style.paddingBottom = ""; });

describe("an open list is brought fully on screen", () => {
  it("does nothing when the whole list already shows", () => {
    const { field, list, scrollBy } = setup({ listTop: 300, listHeight: 300, fieldTop: 256, pageLeft: 1000 });
    bringListIntoView(list, field);
    expect(scrollBy).not.toHaveBeenCalled();
  });

  it("scrolls the page by what the space cap hides (the list wants 303, shows 155)", () => {
    const { field, list, scrollBy } = setup({ listTop: 593, listHeight: 155, hidden: 148, fieldTop: 549, pageLeft: 1000 });
    bringListIntoView(list, field);
    expect(scrollBy).toHaveBeenCalledWith({ top: 593 + 303 - 748, behavior: "instant" });
  });

  it("never scrolls the field itself above the top bar", () => {
    const { field, list, scrollBy } = setup({ listTop: 400, listHeight: 336, hidden: 48, fieldTop: 90, pageLeft: 1000 });
    bringListIntoView(list, field);                                      // wants 36 more, but the field may move up 18 only
    expect(scrollBy).toHaveBeenCalledWith({ top: 90 - 72, behavior: "instant" });
  });

  it("adds room at the end of the page while the list is open, and takes it away after", () => {
    const { field, list, scrollBy } = setup({ listTop: 593, listHeight: 155, hidden: 148, fieldTop: 549, pageLeft: 20 });
    const undo = bringListIntoView(list, field);
    expect(document.body.style.paddingBottom).toBe(`${148 - 20 + 12}px`);
    expect(scrollBy).toHaveBeenCalledWith({ top: 148, behavior: "instant" });
    undo();
    expect(document.body.style.paddingBottom).toBe("");
  });

  it("leaves the top bar's menus alone", () => {
    const { list, scrollBy } = setup({ listTop: 593, listHeight: 155, hidden: 148, fieldTop: 549, pageLeft: 1000 });
    const header = document.createElement("header");
    const menuButton = document.createElement("button");
    header.append(menuButton);
    document.body.append(header);
    bringListIntoView(list, menuButton);
    expect(scrollBy).not.toHaveBeenCalled();
  });
});
