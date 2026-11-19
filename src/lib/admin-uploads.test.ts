import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// The admin image upload (QR codes, site logo): gateway signs, browser posts to S3. Gateway and S3 are mocked.
const gateway = vi.hoisted(() => ({ gatewayPost: vi.fn() }));
vi.mock("@/lib/gateway/client", async (original) => ({ ...(await original<object>()), ...gateway }));

import { GatewayError } from "@/lib/gateway/client";
import { uploadImage } from "./admin-uploads";

const SIGNED = {
  url: "https://travelian-assets-test.s3.ap-southeast-1.amazonaws.com/",
  fields: { key: "payment-qr/abc.png", "x-amz-algorithm": "AWS4-HMAC-SHA256", policy: "p", "x-amz-signature": "s" },
  asset_key: "payment-qr/abc.png", public_url: "https://travelian-assets-test.s3.ap-southeast-1.amazonaws.com/payment-qr/abc.png", max_bytes: 2097152,
};
const file = (type: string, bytes = 120) => new File([new Uint8Array(bytes)], "qr", { type });
const s3Error = (code: string, status = 400) => new Response(`<?xml version="1.0"?><Error><Code>${code}</Code><Message>x</Message></Error>`, { status });

describe("uploadImage", () => {
  beforeEach(() => { gateway.gatewayPost.mockResolvedValue(SIGNED); });
  afterEach(() => { vi.unstubAllGlobals(); vi.clearAllMocks(); });

  it.each(["image/png", "image/jpeg", "image/webp"])("uploads a %s and returns the key and its public URL", async (type) => {
    const fetchMock = vi.fn(async () => new Response(null, { status: 204 }));
    vi.stubGlobal("fetch", fetchMock);
    await expect(uploadImage("payment_qr", file(type))).resolves.toEqual({ assetKey: SIGNED.asset_key, publicUrl: SIGNED.public_url });
    expect(gateway.gatewayPost.mock.calls[0][1]).toEqual({ purpose: "payment_qr", content_type: type });
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    const form = init.body as FormData;
    expect(url).toBe(SIGNED.url);
    expect([...form.keys()].at(-1)).toBe("file"); // S3 needs the signed fields first, then the file
    expect(form.get("x-amz-algorithm")).toBe("AWS4-HMAC-SHA256");
  });

  it("refuses a file over 2 MB before anything is sent", async () => {
    vi.stubGlobal("fetch", vi.fn());
    await expect(uploadImage("payment_qr", file("image/png", 2 * 1024 * 1024 + 1))).rejects.toThrow("Image upload failed: file too large (2 MB max).");
    expect(gateway.gatewayPost).not.toHaveBeenCalled();
  });

  it("refuses another file type before anything is sent", async () => {
    await expect(uploadImage("payment_qr", file("image/gif"))).rejects.toThrow("Image upload failed: choose a PNG, JPEG or WebP image.");
    await expect(uploadImage("payment_qr", file("image/svg+xml"))).rejects.toThrow(/PNG, JPEG or WebP/);
    expect(gateway.gatewayPost).not.toHaveBeenCalled();
  });

  it.each([
    [s3Error("EntityTooLarge"), "Image upload failed: file too large (2 MB max)."],
    [s3Error("AccessDenied", 403), "Image upload failed: storage refused the upload"],
    [s3Error("InvalidRequest"), "Image upload failed: storage rejected the upload signature"],
    [new Response("", { status: 500 }), "Image upload failed: storage answered HTTP 500"],
  ])("an S3 refusal says why (%#)", async (answer, message) => {
    vi.stubGlobal("fetch", vi.fn(async () => answer));
    await expect(uploadImage("payment_qr", file("image/png"))).rejects.toThrow(message);
  });

  it("an unreachable bucket (network or CORS) and S3 not set up on the gateway are clear errors", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => { throw new TypeError("Failed to fetch"); }));
    await expect(uploadImage("payment_qr", file("image/png"))).rejects.toThrow(/couldn't be reached .*CORS/);
    gateway.gatewayPost.mockRejectedValueOnce(new GatewayError("unavailable", "Uploads aren't set up yet (S3 bucket and credentials).", 503));
    await expect(uploadImage("payment_qr", file("image/png"))).rejects.toThrow("Image upload failed: Uploads aren't set up yet (S3 bucket and credentials).");
  });
});
