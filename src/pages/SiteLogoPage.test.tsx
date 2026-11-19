import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Website & CMS > Site logo: the second feature on the shared S3 upload (besides payment QR images). Gateway mocked.
const uploads = vi.hoisted(() => ({ uploadImage: vi.fn() }));
vi.mock("@/lib/admin-uploads", async (original) => ({ ...(await original<object>()), ...uploads }));
const gateway = vi.hoisted(() => ({ gatewayPut: vi.fn() }));
vi.mock("@/lib/gateway/client", async (original) => ({ ...(await original<object>()), ...gateway }));
vi.mock("@/lib/public-booking", async (original) => ({ ...(await original<object>()), getPaymentMethods: vi.fn(async () => ({ logo_url: null })) }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import SiteLogoPage from "./SiteLogoPage";

const renderPage = () => render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><SiteLogoPage /></QueryClientProvider>);
const logo = () => new File(["x"], "logo.png", { type: "image/png" });

describe("Site logo", () => {
  beforeEach(() => { vi.clearAllMocks(); uploads.uploadImage.mockReset(); });

  it("uploads, previews and saves the new logo's key", async () => {
    uploads.uploadImage.mockResolvedValueOnce({ assetKey: "site/new.png", publicUrl: "https://assets.example/site/new.png" });
    gateway.gatewayPut.mockResolvedValueOnce({ slot: "site_logo", asset_key: "site/new.png", url: "https://assets.example/site/new.png" });
    const { container } = renderPage();
    fireEvent.change(container.querySelector('input[type="file"]')!, { target: { files: [logo()] } });
    expect(await screen.findByAltText("New site logo")).toHaveAttribute("src", "https://assets.example/site/new.png");
    expect(uploads.uploadImage).toHaveBeenCalledWith("site_logo", expect.any(File));
    fireEvent.click(screen.getByRole("button", { name: /save/i }));
    await waitFor(() => expect(gateway.gatewayPut).toHaveBeenCalled());
    expect(gateway.gatewayPut.mock.calls[0][1]).toEqual({ asset_key: "site/new.png" });
  });

  it("shows why an upload failed and saves nothing", async () => {
    uploads.uploadImage.mockRejectedValueOnce(new Error("Image upload failed: storage rejected the upload signature (gateway S3 settings). Nothing was saved."));
    const { container } = renderPage();
    fireEvent.change(container.querySelector('input[type="file"]')!, { target: { files: [logo()] } });
    expect(await screen.findByText(/Image upload failed: storage rejected the upload signature/)).toBeInTheDocument();
    expect(screen.queryByAltText("New site logo")).not.toBeInTheDocument();
    expect(gateway.gatewayPut).not.toHaveBeenCalled();
  });
});
