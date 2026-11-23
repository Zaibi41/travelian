import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GatewayError } from "@/lib/gateway/client";
import type { BookingDetail } from "@/lib/admin-bookings/types";

// #56: Payments tab, before payment: travelers and the customer's contact details, editable in place (no re-hold).
const api = vi.hoisted(() => ({ changeCustomerContact: vi.fn() }));
vi.mock("@/lib/admin-bookings/api", () => api);

import { TravelersAndContact } from "./TravelersAndContact";

const rs = (rupees: number) => ({ amount_minor: rupees * 100, currency: "PKR" });
const BOOKING = {
  source: "gateway_bookings", sample: false, booking_id: "TRV-O5QZB5", product: "flight",
  statuses: { booking: "held", payment: "unpaid", issuance: "not_issued" }, amount: rs(15_316),
  passengers: [
    { position: 2, title: "MRS", first_name: "Sara", last_name: "Khan", type: "ADT", id_type: "PSPT" },
    { position: 1, title: "MR", first_name: "Ali", last_name: "Khan", type: "ADT", id_type: "PSPT" },
    { position: 3, title: "MASTER", first_name: "Omar", last_name: "Khan", type: "CHD", id_type: "PSPT" },
  ],
  customer: { first_name: "Ali", last_name: "Khan", phone: "+92 3001234567", email: "ali@example.invalid" },
} as unknown as BookingDetail;

const renderCard = (booking: BookingDetail = BOOKING) => render(
  <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><TravelersAndContact booking={booking} /></QueryClientProvider>,
);

// Braces: a function returned from beforeEach runs as its cleanup.
beforeEach(() => { api.changeCustomerContact.mockReset(); });

describe("Payments tab: travelers and contact before payment (#56)", () => {
  it("lists every traveler in order with Title First LAST, and the contact", () => {
    renderCard();
    const items = within(screen.getByTestId("payment-travelers")).getAllByRole("listitem").map(item => item.textContent);
    expect(items).toEqual(["Mr Ali KHANAdult", "Mrs Sara KHANAdult", "Mstr Omar KHANChild"]);
    expect(screen.getByText("+92 3001234567")).toBeInTheDocument();
    expect(screen.getByText("ali@example.invalid")).toBeInTheDocument();
  });

  it("edits the contact in place and says the hold and price are unchanged", async () => {
    api.changeCustomerContact.mockResolvedValue({ phone: "+971 501234567", email: "new@example.invalid", message: "Contact details saved." });
    renderCard();
    fireEvent.click(screen.getByRole("button", { name: "Edit" }));
    expect(screen.getByLabelText("Code")).toHaveValue("+92");
    expect(screen.getByLabelText("Mobile")).toHaveValue("3001234567");
    fireEvent.change(screen.getByLabelText("Code"), { target: { value: "+971" } });
    fireEvent.change(screen.getByLabelText("Mobile"), { target: { value: "50 123-4567" } });
    expect(screen.getByLabelText("Mobile")).toHaveValue("501234567");
    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "new@example.invalid" } });
    fireEvent.click(screen.getByRole("button", { name: "Save contact details" }));
    await waitFor(() => expect(api.changeCustomerContact).toHaveBeenCalledWith("TRV-O5QZB5", { phoneCode: "+971", phone: "501234567", email: "new@example.invalid" }));
    expect(await screen.findByRole("status")).toHaveTextContent("Contact details saved. The hold and price are unchanged.");
  });

  it("checks the values first and shows the gateway's refusal", async () => {
    api.changeCustomerContact.mockRejectedValue(new GatewayError("unavailable", "Enter a valid email address, e.g. name@example.com.", 422));
    renderCard();
    fireEvent.click(screen.getByRole("button", { name: "Edit" }));
    fireEvent.change(screen.getByLabelText("Mobile"), { target: { value: "12" } });
    fireEvent.click(screen.getByRole("button", { name: "Save contact details" }));
    expect(screen.getByRole("alert")).toHaveTextContent("Enter the mobile number in digits");
    expect(api.changeCustomerContact).not.toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText("Mobile"), { target: { value: "3001234567" } });
    fireEvent.click(screen.getByRole("button", { name: "Save contact details" }));
    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("Enter a valid email address"));
  });

  it("shows nothing when there are no travelers and no customer", () => {
    const { container } = renderCard({ ...BOOKING, passengers: [], customer: undefined } as unknown as BookingDetail);
    expect(container).toBeEmptyDOMElement();
  });
});
