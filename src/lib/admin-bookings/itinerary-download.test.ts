import { afterEach, describe, expect, it, vi } from "vitest";
import { downloadItinerary } from "./api";

// The itinerary download: an authenticated request (never a plain link), the answer read as a file, saved under the
// booking reference. Gateway errors come through as GatewayError messages.
describe("downloadItinerary", () => {
  afterEach(() => vi.restoreAllMocks());

  it("asks the gateway for the PDF with the user's token and saves it as <reference>.pdf", async () => {
    const pdf = new Blob(["%PDF-1.4 test"], { type: "application/pdf" });
    const fetchImpl = vi.fn().mockResolvedValue(new Response(pdf, { status: 200, headers: { "Content-Type": "application/pdf" } }));
    const created = vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:itinerary");
    vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => undefined);
    const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (this: HTMLAnchorElement) {
      expect(this.download).toBe("TRV-GRP-AB12CD.pdf");
      expect(this.href).toBe("blob:itinerary");
    });
    await downloadItinerary("TRV-GRP-AB12CD", { baseUrl: "http://gw", accessToken: "t", fetchImpl });
    const [url, init] = fetchImpl.mock.calls[0];
    expect(url).toBe("http://gw/v1/admin/bookings/TRV-GRP-AB12CD/itinerary.pdf");
    expect(init.method).toBe("GET");
    expect(init.headers).toMatchObject({ Accept: "application/pdf", Authorization: "Bearer t" });
    expect(created).toHaveBeenCalledOnce();
    expect((created.mock.calls[0][0] as Blob).size).toBeGreaterThan(0);
    expect(click).toHaveBeenCalledOnce();
  });

  it("PNG: the same endpoint with format=png, saved as <reference>-itinerary.png", async () => {
    const image = new Blob([new Uint8Array([0x89, 0x50, 0x4e, 0x47])], { type: "image/png" });
    const fetchImpl = vi.fn().mockResolvedValue(new Response(image, { status: 200, headers: { "Content-Type": "image/png" } }));
    vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:png");
    vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => undefined);
    const names: string[] = [];
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (this: HTMLAnchorElement) { names.push(this.download); });
    await downloadItinerary("TRV-GRP-AB12CD", { baseUrl: "http://gw", accessToken: "t", fetchImpl }, "png");
    const [url, init] = fetchImpl.mock.calls[0];
    expect(url).toBe("http://gw/v1/admin/bookings/TRV-GRP-AB12CD/itinerary.pdf?format=png");
    expect(init.headers).toMatchObject({ Accept: "image/png", Authorization: "Bearer t" });
    expect(names).toEqual(["TRV-GRP-AB12CD-itinerary.png"]);
  });

  it("an unknown booking is the gateway's 404 message, and nothing is saved", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response(JSON.stringify({ detail: "Booking not found." }), { status: 404 }));
    const click = vi.spyOn(HTMLAnchorElement.prototype, "click");
    await expect(downloadItinerary("TRV-NOPE", { baseUrl: "http://gw", accessToken: "t", fetchImpl }))
      .rejects.toMatchObject({ kind: "not_found", message: "Booking not found." });
    expect(click).not.toHaveBeenCalled();
  });
});
