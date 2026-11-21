import "@testing-library/jest-dom/vitest";
import { Suspense } from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { lazyPage } from "./lazy-page";

const Fallback = () => <p>Loading page…</p>;

describe("lazyPage", () => {
  it("shows the fallback while the page's code loads", async () => {
    const Page = lazyPage(async () => ({ default: () => <h1>About</h1> }));
    render(<Suspense fallback={<Fallback />}><Page /></Suspense>);
    expect(screen.getByText("Loading page…")).toBeInTheDocument();
    expect(await screen.findByRole("heading", { name: "About" })).toBeInTheDocument();
  });

  it("renders straight away, with no fallback, once preloaded", async () => {
    const Page = lazyPage(async () => ({ default: ({ name }: { name: string }) => <h1>{name}</h1> }));
    await Page.preload();
    render(<Suspense fallback={<Fallback />}><Page name="FAQ" /></Suspense>);
    expect(screen.queryByText("Loading page…")).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "FAQ" })).toBeInTheDocument();
  });
});
