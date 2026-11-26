import { describe, expect, it, vi } from "vitest";

vi.stubEnv("VITE_TRAVELIAN_GATEWAY_BASE_URL", "https://gw.example.test/");
const { sendContactMessage } = await import("./contact-api");

const reply = (status: number, body: unknown) => vi.fn().mockResolvedValue(new Response(JSON.stringify(body), { status }));
const MSG = { name: "Ayesha", email: "a@example.invalid", phone: null, message: "Hello there, about Jeddah.", website: null };

describe("sendContactMessage (gateway#114)", () => {
  it("posts to the public endpoint without a token and returns the gateway's thanks", async () => {
    const fetchImpl = reply(202, { message: "Thanks!" });
    await expect(sendContactMessage(MSG, fetchImpl)).resolves.toBe("Thanks!");
    const [url, init] = fetchImpl.mock.calls[0];
    expect(url).toBe("https://gw.example.test/v1/public/contact");
    expect(init.headers).not.toHaveProperty("Authorization");
    expect(JSON.parse(init.body)).toEqual(MSG);
  });

  it.each([
    [429, {}, /several messages already/],
    [422, { detail: "Add an email address or a mobile number so we can reply." }, /email address or a mobile number/],
    [422, { detail: [{ loc: ["body", "email"] }] }, /check the form/],
    [503, { detail: "x" }, /couldn't be sent right now/],
  ])("HTTP %s says what to do", async (status, body, text) => {
    await expect(sendContactMessage(MSG, reply(status, body))).rejects.toThrow(text);
  });

  it("offline", async () => {
    await expect(sendContactMessage(MSG, vi.fn().mockRejectedValue(new TypeError("Failed to fetch")))).rejects.toThrow(/offline/);
  });
});
