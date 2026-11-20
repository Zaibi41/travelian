import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { BankAccounts } from "./BankTransferDetails";

// D40: the account customers pay into is shown in full, never masked.
describe("BankAccounts", () => {
  it("shows the bank, title, full account number and IBAN", () => {
    render(<BankAccounts accounts={[{ bank_name: "UBL", account_title: "Travelian (Pvt) Ltd", account_number: "0011 2345 6702", iban: "PK36UNIL0000001123456702" }]} />);
    expect(screen.getByText("UBL")).toBeInTheDocument();
    expect(screen.getByText("Travelian (Pvt) Ltd")).toBeInTheDocument();
    expect(screen.getByText("0011 2345 6702")).toBeInTheDocument();
    expect(screen.getByText("PK36UNIL0000001123456702")).toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(/\*{2,}/);
  });
});

describe("BankAccounts with several accounts", () => {
  const UBL = { bank_name: "UBL", account_title: "Travelian (Pvt) Ltd", account_number: "001123456702", iban: "PK36UNIL0000001123456702", qr_url: "https://example.invalid/ubl.jpg" };
  const MEEZAN = { bank_name: "Meezan Bank", account_title: "Travelian (Pvt) Ltd", account_number: "0101 0101 9988", iban: "PK11MEZN0001010101019988" };

  it("lists the accounts as choices; the selected one shows its details with Copy buttons and its QR", async () => {
    const { fireEvent } = await import("@testing-library/react");
    render(<BankAccounts accounts={[UBL, MEEZAN]} />);
    expect(screen.getByRole("radio", { name: /UBL/ })).toBeChecked();
    expect(screen.getByText("PK36UNIL0000001123456702")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Copy iban" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Enlarge QR code" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Download QR/ })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("radio", { name: /Meezan Bank/ }));
    expect(screen.getByText("PK11MEZN0001010101019988")).toBeInTheDocument();
    expect(screen.queryByText("PK36UNIL0000001123456702")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Enlarge QR code" })).not.toBeInTheDocument();   // no QR on this account
  });

  it("Copy puts the value on the clipboard and says Copied", async () => {
    const { fireEvent, waitFor } = await import("@testing-library/react");
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });
    render(<BankAccounts accounts={[UBL]} />);
    fireEvent.click(screen.getByRole("button", { name: "Copy account number" }));
    expect(writeText).toHaveBeenCalledWith("001123456702");
    await waitFor(() => expect(screen.getByRole("button", { name: "Account number copied" })).toHaveTextContent("Copied"));
  });

  it("tapping the QR opens it enlarged in a dialog", async () => {
    const { fireEvent } = await import("@testing-library/react");
    render(<BankAccounts accounts={[UBL]} />);
    fireEvent.click(screen.getByRole("button", { name: "Enlarge QR code" }));
    expect(screen.getByRole("dialog", { name: "Scan to pay" })).toBeInTheDocument();
    expect(screen.getByAltText("QR code to pay Travelian (Pvt) Ltd, enlarged")).toBeInTheDocument();
  });
});

describe("Download QR", () => {
  it("is a link to the gateway's file download when the gateway gives one (every browser saves it)", () => {
    render(<BankAccounts accounts={[{ bank_name: "United Bank Limited - UBL", account_title: "Travelian", account_number: "1937359762048",
      qr_url: "https://bucket.example/ubl.jpg", qr_download_url: "/v1/public/payment-qr/acc-1" }]} />);
    const link = screen.getByRole("link", { name: /Download QR/ });
    expect(link.getAttribute("href")).toMatch(/\/v1\/public\/payment-qr\/acc-1$/);
    expect(link).toHaveAttribute("download", "travelian-united-bank-limited-ubl-qr");
    expect(screen.queryByRole("button", { name: /Download QR/ })).not.toBeInTheDocument();
  });
});
