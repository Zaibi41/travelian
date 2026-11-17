import { render } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { ScrollToTop } from "./ScrollToTop";

const location = vi.hoisted(() => ({ pathname: "/" }));
vi.mock("react-router-dom", () => ({ useLocation: () => location }));
afterEach(() => { vi.restoreAllMocks(); location.pathname = "/"; });
it("preserves initial restored scroll and resets only on a changed route", () => {
  const scroll = vi.spyOn(window, "scrollTo").mockImplementation(() => {});
  const view = render(<ScrollToTop />);
  expect(scroll).not.toHaveBeenCalled();
  location.pathname = "/hotels-search";
  view.rerender(<ScrollToTop />);
  expect(scroll).toHaveBeenCalledExactlyOnceWith({ top: 0, left: 0, behavior: "auto" });
  view.rerender(<ScrollToTop />);
  expect(scroll).toHaveBeenCalledOnce();
});
