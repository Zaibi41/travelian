import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Made-up test customer; not real data.
const customer = {
  customerId: "cust-test-1",
  name: "Test Traveller",
  firstName: "Test",
  lastName: "Traveller",
  title: "Mr",
  email: "traveller@example.com",
  phone: "+923001234567",
  dateOfBirth: "1990-01-01",
  passportNumber: "TEST0001234",
  passportExpiry: "2030-01-01",
};

const saveCustomer = vi.fn(async (input: Record<string, unknown>) => ({ ...customer, ...input }));
vi.mock("@/lib/customer-api", () => ({
  listCustomers: vi.fn(async () => [customer]),
  saveCustomer: (input: Record<string, unknown>) => saveCustomer(input),
}));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn(), warning: vi.fn() } }));

import CustomersPage from "./CustomersPage";

async function openEditForm() {
  render(<MemoryRouter><CustomersPage /></MemoryRouter>);
  fireEvent.click(await screen.findByRole("button", { name: /Edit/ }));
  return screen.findByLabelText("Replacement passport number");
}

describe("Customers: passport privacy", () => {
  beforeEach(() => saveCustomer.mockClear());

  it("masks passport and date of birth in the table", async () => {
    render(<MemoryRouter><CustomersPage /></MemoryRouter>);
    expect(await screen.findByText("•••••••1234")).toBeInTheDocument();
    expect(screen.queryByText("TEST0001234")).not.toBeInTheDocument();
    expect(screen.queryByText("1990-01-01")).not.toBeInTheDocument();
  });

  it("never shows the full passport number in the Edit form", async () => {
    const field = (await openEditForm()) as HTMLInputElement;
    expect(field.value).toBe("");
    expect(screen.getByText(/Leave empty to keep it/)).toHaveTextContent("Current: •••••••1234");
    expect(document.body.innerHTML).not.toContain("TEST0001234");
  });

  it("keeps the current passport when the field is left empty", async () => {
    await openEditForm();
    fireEvent.click(screen.getByRole("button", { name: /^(Update|Save)/ }));
    await waitFor(() => expect(saveCustomer).toHaveBeenCalledTimes(1));
    expect(saveCustomer.mock.calls[0][0]).toMatchObject({ customerId: "cust-test-1", passportNumber: "TEST0001234" });
  });

  it("saves a replacement passport number when one is entered", async () => {
    const field = await openEditForm();
    fireEvent.change(field, { target: { value: "new0009999" } });
    fireEvent.click(screen.getByRole("button", { name: /^(Update|Save)/ }));
    await waitFor(() => expect(saveCustomer).toHaveBeenCalledTimes(1));
    expect(saveCustomer.mock.calls[0][0]).toMatchObject({ passportNumber: "NEW0009999" });
  });
});
