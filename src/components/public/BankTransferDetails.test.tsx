import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
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
