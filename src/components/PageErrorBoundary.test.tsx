import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PageErrorBoundary, isChunkLoadError } from "./PageErrorBoundary";

function Boom({ error }: { error: Error }): JSX.Element { throw error; }

// D41: a failing page never leaves a blank screen.
describe("PageErrorBoundary", () => {
  afterEach(() => vi.restoreAllMocks());

  it("shows an honest message with Reload instead of a blank page", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    render(<PageErrorBoundary><Boom error={new Error("render failed")} /></PageErrorBoundary>);
    expect(screen.getByRole("alert")).toHaveTextContent("This page couldn't load");
    expect(screen.getByRole("button", { name: "Reload" })).toBeInTheDocument();
  });

  it("recognises a page file that couldn't be downloaded", () => {
    expect(isChunkLoadError(new TypeError("Failed to fetch dynamically imported module: http://x/src/pages/NotificationsPage.tsx"))).toBe(true);
    expect(isChunkLoadError(new Error("render failed"))).toBe(false);
  });
});
