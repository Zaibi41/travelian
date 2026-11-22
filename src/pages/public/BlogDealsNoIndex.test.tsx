import { render, screen, waitFor } from "@testing-library/react";
import { HelmetProvider } from "react-helmet-async";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { BlogPost, Coupon } from "@/data/models";

const listBlogPosts = vi.fn();
vi.mock("@/lib/content-api", () => ({ listBlogPosts: (...args: unknown[]) => listBlogPosts(...args) }));
let coupons: Coupon[] = [];
vi.mock("@/contexts/AdminStore", () => ({ useAdmin: () => ({ coupons }) }));

import PublicBlogPage from "./PublicBlogPage";
import DealsPage from "./DealsPage";

const robots = () => document.head.querySelector('meta[name="robots"]')?.getAttribute("content");
const canonical = () => document.head.querySelector('link[rel="canonical"]');

function renderPage(page: JSX.Element, path: string) {
  window.history.replaceState(null, "", path);
  return render(<HelmetProvider><MemoryRouter initialEntries={[path]}>{page}</MemoryRouter></HelmetProvider>);
}

const post: BlogPost = {
  postId: "p1", title: "Umrah planning guide", slug: "umrah-planning", excerpt: "How to plan.", content: "", author: "Travelian",
  category: "Umrah", status: "published", publishedAt: "2026-11-01", tags: ["umrah"],
};

const coupon = (over: Partial<Coupon> = {}): Coupon => ({
  couponId: "c1", code: "SAVE10", description: "10% off flights", discountType: "percentage", discountValue: 10, minOrder: 0,
  maxUses: 100, usedCount: 0, validFrom: "2026-01-01", validUntil: "2099-12-31", status: "active", applicableTo: "all", ...over,
});

beforeEach(() => {
  listBlogPosts.mockReset();
  coupons = [];
});

describe("/blog noindex (travelian#127)", () => {
  it("is noindex when the article list fails to load", async () => {
    listBlogPosts.mockRejectedValue(new Error("500"));
    renderPage(<PublicBlogPage />, "/blog");
    expect(await screen.findByText("Unable to load travel guides right now.")).toBeInTheDocument();
    await waitFor(() => expect(robots()).toBe("noindex, nofollow"));
    expect(canonical()).toBeNull();
  });

  it("is noindex when no articles are published", async () => {
    listBlogPosts.mockResolvedValue([]);
    renderPage(<PublicBlogPage />, "/blog");
    expect(await screen.findByText("No published articles are available yet.")).toBeInTheDocument();
    await waitFor(() => expect(robots()).toBe("noindex, nofollow"));
  });

  it("is indexable once real articles load", async () => {
    listBlogPosts.mockResolvedValue([post]);
    renderPage(<PublicBlogPage />, "/blog");
    expect(await screen.findByText("Umrah planning guide")).toBeInTheDocument();
    await waitFor(() => expect(robots()).toBe("index, follow"));
    expect(canonical()?.getAttribute("href")).toMatch(/\/blog$/);
  });
});

describe("/deals noindex (travelian#127)", () => {
  it("is noindex when there are no offers", async () => {
    renderPage(<DealsPage />, "/deals");
    expect(screen.getByText("No promotional offers are active right now")).toBeInTheDocument();
    await waitFor(() => expect(robots()).toBe("noindex, nofollow"));
  });

  it("is noindex when the only coupons are expired, inactive or for hidden services", async () => {
    coupons = [coupon({ validUntil: "2000-01-01" }), coupon({ couponId: "c2", status: "inactive" }),
      coupon({ couponId: "c3", applicableTo: "visa" as Coupon["applicableTo"] })];
    renderPage(<DealsPage />, "/deals");
    expect(screen.getByText("No promotional offers are active right now")).toBeInTheDocument();
    await waitFor(() => expect(robots()).toBe("noindex, nofollow"));
  });

  it("is indexable when an active offer is shown", async () => {
    coupons = [coupon()];
    renderPage(<DealsPage />, "/deals");
    expect(screen.getByText("SAVE10")).toBeInTheDocument();
    await waitFor(() => expect(robots()).toBe("index, follow"));
  });
});
