import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

// #56: the customer's contact details on the payment step, editable in place with the booking's access token.
const booking = vi.hoisted(() => ({ changeBookingContact: vi.fn() }));
vi.mock("@/lib/public-booking", async importOriginal => ({ ...(await importOriginal<object>()), ...booking }));

import { PublicBookingError } from "@/lib/public-booking";
import { BookingContactDetails } from "./BookingContactDetails";

globalThis.ResizeObserver ??= class { observe() {} unobserve() {} disconnect() {} } as unknown as typeof ResizeObserver;

// Braces: a function returned from beforeEach runs as its cleanup.
beforeEach(() => { booking.changeBookingContact.mockReset(); });

describe("BookingContactDetails (#56)", () => {
  it("shows the contact, edits it in place with the token and confirms nothing else changed", async () => {
    booking.changeBookingContact.mockResolvedValue({ phone_code: "+92", phone: "3009876543", email: "new@example.invalid", message: "saved" });
    const onSaved = vi.fn();
    render(<BookingContactDetails reference="TRV-1" token="tok-123" initial={{ phoneCode: "+92", phone: "3001234567", email: "ali@example.invalid" }} onSaved={onSaved} />);
    expect(screen.getByText("+92 3001234567")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Edit" }));
    fireEvent.change(screen.getByLabelText("Mobile Number *"), { target: { value: "300 987-6543" } });
    expect(screen.getByLabelText("Mobile Number *")).toHaveValue("3009876543");
    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "new@example.invalid" } });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() => expect(booking.changeBookingContact).toHaveBeenCalledWith("TRV-1", { phoneCode: "+92", phone: "3009876543", email: "new@example.invalid" }, "tok-123"));
    expect(await screen.findByRole("status")).toHaveTextContent("Contact details saved. Your booking and price stay the same.");
    expect(screen.getByText("+92 3009876543")).toBeInTheDocument();
    expect(onSaved).toHaveBeenCalledWith({ phoneCode: "+92", phone: "3009876543", email: "new@example.invalid" });
  });

  it("checks fields inline and shows the gateway's refusal", async () => {
    booking.changeBookingContact.mockRejectedValue(new PublicBookingError("This booking can't be changed online any more. Contact Travelian to update your details.", 409, "closed"));
    render(<BookingContactDetails reference="TRV-1" token="tok-123" initial={{ phoneCode: "+92", phone: "3001234567" }} />);
    fireEvent.click(screen.getByRole("button", { name: "Edit" }));
    fireEvent.change(screen.getByLabelText("Mobile Number *"), { target: { value: "12" } });
    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "bad" } });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(screen.getByText(/Enter the mobile number in digits/)).toBeInTheDocument();
    expect(screen.getByText(/Enter a valid email address/)).toBeInTheDocument();
    expect(screen.getByLabelText("Mobile Number *")).toHaveAttribute("aria-invalid", "true");
    expect(booking.changeBookingContact).not.toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText("Mobile Number *"), { target: { value: "3001234567" } });
    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "" } });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("can't be changed online any more");
  });
});
