import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const api = vi.hoisted(() => ({ uploadPaymentSlip: vi.fn() }));
vi.mock("@/lib/public-booking", async (original) => ({ ...(await original<object>()), ...api }));

import { PaymentSlipUpload } from "./PaymentSlipUpload";
import { PublicBookingError, slipFileProblem } from "@/lib/public-booking";

const file = (name: string, type: string, size = 1000) => new File([new Uint8Array(size)], name, { type });

beforeEach(() => vi.clearAllMocks());

describe("PaymentSlipUpload", () => {
  it("accepts JPG, PNG, WebP and PDF up to 5 MB only", () => {
    expect(slipFileProblem(file("a.pdf", "application/pdf"))).toBeNull();
    expect(slipFileProblem(file("a.svg", "image/svg+xml"))).toMatch(/JPG, PNG, WebP or PDF/);
    expect(slipFileProblem(file("a.png", "image/png", 5 * 1024 * 1024 + 1))).toMatch(/5 MB/);
  });

  it("uploads with progress and shows the gateway's message", async () => {
    api.uploadPaymentSlip.mockImplementation(async (_ref, _file, _details, _access, onProgress) => {
      onProgress?.(40);
      return { status: "awaiting_check", message: "Slip received. Travelian will check the payment and confirm it." };
    });
    render(<PaymentSlipUpload reference="TRV-AB12CD" access={{ token: "t" }} details={{ method: "bank_transfer", accountId: "a1", amountMinor: 4_670_000, via: "checkout" }} />);
    fireEvent.change(screen.getByLabelText(/Choose file/), { target: { files: [file("slip.png", "image/png")] } });
    fireEvent.change(screen.getByLabelText("Your transaction ID (optional)"), { target: { value: "IBFT-7" } });
    fireEvent.click(screen.getByRole("button", { name: "Send slip" }));
    expect(await screen.findByText(/Slip received/)).toBeInTheDocument();
    expect(api.uploadPaymentSlip.mock.calls[0][2]).toMatchObject({ method: "bank_transfer", accountId: "a1", amountMinor: 4_670_000, payerReference: "IBFT-7" });
  });

  it("a wrong file never uploads; a gateway error is shown in plain words", async () => {
    render(<PaymentSlipUpload reference="TRV-AB12CD" access={{ contact: "a@b.pk" }} details={{ amountMinor: 100, via: "my_bookings" }} />);
    fireEvent.change(screen.getByLabelText(/Choose file/), { target: { files: [file("x.exe", "application/x-msdownload")] } });
    expect(screen.getByRole("alert")).toHaveTextContent("Choose a JPG, PNG, WebP or PDF file.");
    expect(screen.getByRole("button", { name: "Send slip" })).toBeDisabled();
    api.uploadPaymentSlip.mockRejectedValue(new PublicBookingError("That is more than the amount due (467 PKR).", 409));
    fireEvent.click(screen.getByText("JazzCash"));
    fireEvent.change(screen.getByLabelText(/Choose another file/), { target: { files: [file("slip.pdf", "application/pdf")] } });
    fireEvent.click(screen.getByRole("button", { name: "Send slip" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("more than the amount due");
    await waitFor(() => expect(api.uploadPaymentSlip.mock.calls[0][2]).toMatchObject({ method: "jazzcash", via: "my_bookings" }));
  });
});
