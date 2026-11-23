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

describe("BankAccounts (#76)", () => {
  const account = (n: number) => ({ id: `a${n}`, bank_name: `Bank ${n}`, account_title: "Travelian", account_number: `00112345670${n}` });
  it("shows amount and reference with Copy and remembers the chosen account", async () => {
    const { fireEvent } = await import("@testing-library/react");
    const chosen: string[] = [];
    render(<BankAccounts accounts={[account(1), account(2)]} facts={{ amount: "Rs 46,700", reference: "TRV-AB12CD" }} onChoose={a => chosen.push(a.id!)} />);
    expect(screen.getByText("Rs 46,700")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Copy reference" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Copy amount to transfer" })).toBeInTheDocument();
    expect(screen.getByText("Put this reference in the transfer note.")).toBeInTheDocument();
    expect(screen.getByText("Same bank: faster transfer.")).toBeInTheDocument();
    fireEvent.click(screen.getByText("Bank 2"));
    expect(chosen).toEqual(["a2"]);
  });
  it("switches to a dropdown above 6 accounts", () => {
    render(<BankAccounts accounts={[1, 2, 3, 4, 5, 6, 7].map(account)} />);
    expect(screen.getByRole("combobox", { name: "Choose the account to pay into" })).toBeInTheDocument();
    expect(screen.queryAllByRole("radio")).toHaveLength(0);
  });
});

describe("bank initials", () => {
  it("uses the bank's acronym or its first letters", async () => {
    const { bankInitials } = await import("./BankTransferDetails");
    expect(["Habib Bank Limited (HBL)", "United Bank Limited - UBL", "Meezan Bank", "JazzCash", "Bank Al-Habib"].map(bankInitials))
      .toEqual(["HBL", "UBL", "MB", "J", "BA"]);
  });
});

describe("Bank logo on the account cards (#76, option 2)", () => {
  const HBL = { id: "a-1", bank_name: "Habib Bank Limited (HBL)", account_title: "Travelian", account_number: "0101010101", logo_url: "https://example.invalid/bank-logo/hbl.png" };
  const UBL = { id: "a-2", bank_name: "United Bank Limited - UBL", account_title: "Travelian", account_number: "0202020202" };

  it("shows the uploaded logo, and the bank's initials where no logo was uploaded", () => {
    const { container } = render(<BankAccounts accounts={[HBL, UBL]} />);
    const cards = Array.from(container.querySelectorAll("label"));
    expect(cards[0].querySelector("img")).toHaveAttribute("src", HBL.logo_url);
    expect(cards[0].textContent).not.toContain("HBL" + "Habib");  // the mark is the logo, not initials
    expect(cards[1].querySelector("img")).toBeNull();
    expect(cards[1]).toHaveTextContent("UBL");
    expect(screen.getByRole("radio", { name: /Habib Bank Limited \(HBL\)/ })).toBeChecked();  // the name still labels the choice
  });

  it("falls back to the initials when the logo can't be loaded", async () => {
    const { fireEvent } = await import("@testing-library/react");
    const { container } = render(<BankAccounts accounts={[HBL, UBL]} />);
    const logo = container.querySelector("label img")!;
    fireEvent.error(logo);
    expect(container.querySelector("label img")).toBeNull();
    expect(container.querySelectorAll("label")[0]).toHaveTextContent(/^HBL/);
  });
});
