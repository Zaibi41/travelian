import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const send = vi.hoisted(() => vi.fn());
// A plain wrapper (not the spy itself) is what the form calls, so a refusal is just the form's own caught rejection.
const fails = vi.hoisted(() => ({ with: null as Error | null }));
vi.mock("@/lib/contact-api", async importOriginal => ({
  ...(await importOriginal<typeof import("@/lib/contact-api")>()),
  sendContactMessage: async (...args: unknown[]) => {
    send(...args);
    if (fails.with) throw fails.with;
    return send.mock.results.at(-1)?.value;
  },
}));

import { ContactError } from "@/lib/contact-api";
import { ContactForm } from "./ContactForm";

const fill = (label: string, value: string) => fireEvent.change(screen.getByLabelText(label), { target: { value } });

describe("Contact form (gateway#114)", () => {
  beforeEach(() => { send.mockReset(); fails.with = null; });

  it("says what's missing at the fields and sends nothing", () => {
    render(<ContactForm />);
    fireEvent.click(screen.getByRole("button", { name: "Send message" }));
    expect(screen.getByText("Enter your name.")).toBeInTheDocument();
    expect(screen.getByText("Add an email address or a mobile number so we can reply.")).toBeInTheDocument();
    expect(screen.getByText(/at least 10 characters/)).toBeInTheDocument();
    expect(send).not.toHaveBeenCalled();
    fill("Email", "not-an-email");
    fireEvent.click(screen.getByRole("button", { name: "Send message" }));
    expect(screen.getByText(/valid email address/)).toBeInTheDocument();
  });

  it("sends trimmed values with a mobile number only, then shows the gateway's confirmation", async () => {
    send.mockReturnValue("Thanks, your message has been sent.");
    render(<ContactForm />);
    fill("Your name", "  Ayesha Khan ");
    fill("Mobile number", "03001234567");
    fill("Message", "  Do you have group seats to Jeddah?  ");
    fireEvent.click(screen.getByRole("button", { name: "Send message" }));
    await waitFor(() => expect(send).toHaveBeenCalledWith({ name: "Ayesha Khan", email: null, phone: "03001234567",
      message: "Do you have group seats to Jeddah?", website: null }));
    expect(await screen.findByRole("status")).toHaveTextContent("Thanks, your message has been sent.");
    fireEvent.click(screen.getByRole("button", { name: "Send another message" }));
    expect(screen.getByLabelText("Your name")).toHaveValue("  Ayesha Khan ");
    expect(screen.getByLabelText("Message")).toHaveValue("");
  });

  it("a refusal keeps what was typed and says why", async () => {
    fails.with = new ContactError("You've sent several messages already. Please wait a while, or message us on WhatsApp.", 429);
    render(<ContactForm />);
    fill("Your name", "Ayesha");
    fill("Email", "a@example.invalid");
    fill("Message", "Please call me back about my booking.");
    fireEvent.click(screen.getByRole("button", { name: "Send message" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("several messages already");
    expect(screen.getByLabelText("Message")).toHaveValue("Please call me back about my booking.");
  });
});
