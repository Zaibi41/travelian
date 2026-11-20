import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GatewayError } from "@/lib/gateway/client";
import type { HoldDraft } from "@/lib/admin-search/hold";

const gateway = vi.hoisted(() => ({ hold: vi.fn(), reprice: vi.fn(), people: vi.fn(), groupTicket: vi.fn() }));
vi.mock("@/lib/admin-search/group-holds", async importOriginal => ({ ...(await importOriginal<object>()), fetchGroupTicket: gateway.groupTicket }));
vi.mock("@/lib/saved-people/api", async importOriginal => ({
  ...(await importOriginal<object>()), searchPeople: gateway.people, searchCustomers: gateway.people, searchTravelers: gateway.people,
}));
vi.mock("@/lib/admin-search/flights", async importOriginal => ({
  ...(await importOriginal<object>()), holdFlight: gateway.hold, repriceFlights: gateway.reprice,
}));

import HoldFlightPage from "@/pages/HoldFlightPage";
import GroupHoldPage from "@/pages/GroupHoldPage";
import { ADMIN_DRAFT, STAFF_DRAFT } from "@/test/hold-fixtures";
import { chooseOption, pickDate } from "@/test/pick-date";

globalThis.ResizeObserver ??= class { observe() {} unobserve() {} disconnect() {} } as unknown as typeof ResizeObserver;
// Each hold test fills whole traveler cards through the real calendars and dropdowns: slower than typing.
vi.setConfig({ testTimeout: 20_000 });
Element.prototype.hasPointerCapture ??= () => false;
Element.prototype.releasePointerCapture ??= () => {};
// cmdk scrolls the active option into view; jsdom has no layout.
Element.prototype.scrollIntoView ??= function scrollIntoView() {};

const rs = (rupees: number) => ({ amount_minor: rupees * 100, currency: "PKR" });
const result = { state: null as unknown };
function ResultProbe() {
  result.state = useLocation().state;
  return <h1>Result page</h1>;
}
function SearchProbe() {
  return <h1>Search page {useLocation().search}</h1>;
}

const renderPage = (draft: HoldDraft, mode = "hold") =>
  render(
    <QueryClientProvider client={new QueryClient()}>
      <MemoryRouter initialEntries={[{ pathname: "/admin/search/flights/hold", search: `?mode=${mode}`, state: draft }]}>
        <Routes>
          <Route path="/admin/search/flights/hold" element={<HoldFlightPage />} />
          <Route path="/admin/search/flights/hold/result" element={<ResultProbe />} />
          <Route path="/admin/search" element={<SearchProbe />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );

const type = (label: string, value: string, within_: HTMLElement = document.body) =>
  fireEvent.change(within(within_).getByLabelText(label), { target: { value } });
/** Pick a date in a card's date field (the shared calendar: no typing). */
const date = (label: string, iso: string, within_: HTMLElement) => pickDate(within(within_).getByLabelText(label), iso);

/** Open a country dropdown on a card, type to search, and pick an option by its name. */
function chooseCountry(card: HTMLElement, label: string, search: string, option: string) {
  fireEvent.click(within(card).getByRole("combobox", { name: label }));
  const input = screen.getByRole("combobox", { name: "Search country" });
  fireEvent.change(input, { target: { value: search } });
  fireEvent.click(screen.getByRole("option", { name: option }));
}

function fillCustomer() {
  const customer = screen.getByRole("region", { name: "Customer" });
  type("First Name *", "Test", customer);
  type("Last Name *", "Customer", customer);
  type("Mobile Number *", "+92 300 1234567", customer);
  type("Email *", "ops@example.invalid", customer);
}

/** A traveler card's required fields, as on the website: gender, date of birth, passport number and expiry (and the
 *  names unless the card mirrors the customer). */
function fillTraveler(card: HTMLElement, { first, last, dob, passport, expiry = "2031-01-01", gender = "Male" }:
  { first?: string; last?: string; dob: string; passport?: string; expiry?: string; gender?: string }) {
  if (first !== undefined) type("First Name *", first, card);
  if (last !== undefined) type("Last Name *", last, card);
  chooseOption(within(card).getByRole("combobox", { name: "Gender *" }), gender);
  date("Date of Birth *", dob, card);
  if (passport !== undefined) type("Passport Number *", passport, card);
  date("Date of Expiry *", expiry, card);
}

/** The infant's required fields (STAFF_DRAFT is 1 adult and 1 infant). */
function fillInfant() {
  fillTraveler(screen.getByRole("region", { name: "Infant 1" }), { first: "Baby", last: "Passenger", dob: "2026-01-01", passport: "BB1234567" });
}

/** Everything the form needs before it calls the gateway: the customer (who is Adult 1, with their passport), Adult 1's
 *  other details, the infant. */
function fillRequired() {
  fillCustomer();
  type("Passport Number", "AB1234567", screen.getByRole("region", { name: "Customer" }));
  fillTraveler(screen.getByRole("region", { name: "Adult 1" }), { dob: "1990-01-01" });
  fillInfant();
}

describe("Shared booking form on the Flights hold page", () => {
  beforeEach(() => {
    gateway.hold.mockReset();
    gateway.reprice.mockReset();
    gateway.people.mockReset();
    result.state = null;
  });

  it("has the customer section and one card per traveler with the website's passenger fields, empty", () => {
    renderPage(STAFF_DRAFT);
    const customer = screen.getByRole("region", { name: "Customer" });
    for (const label of ["Search existing customer", "First Name *", "Last Name *", "Mobile Number *", "Email *", "Document", "Passport Number"]) {
      expect(within(customer).getByLabelText(label)).toBeInTheDocument();
    }
    expect(within(customer).getByRole("checkbox", { name: "The customer is also Adult 1" })).toBeChecked();
    expect(within(customer).getByRole("checkbox", { name: "Save this customer for next time" })).toBeChecked();
    const adult = screen.getByRole("region", { name: "Adult 1" });
    const infant = screen.getByRole("region", { name: "Infant 1" });
    // The website checkout's fields, in its order (lib/passenger-details).
    const labels = (card: HTMLElement) => Array.from(card.querySelectorAll("label")).map(label => label.textContent);
    expect(labels(infant)).toEqual(["Use saved traveler", "Title *", "Gender *", "First Name *", "Last Name *", "Date of Birth *", "Document *",
      "Passport Number *", "Nationality *", "Country of Issuance *", "Date of Expiry *", "Travels with", "Save this traveler for next time"]);
    for (const label of ["First Name *", "Last Name *", "Passport Number *"]) expect(within(infant).getByLabelText(label)).toHaveValue("");
    for (const label of ["Date of Birth *", "Date of Expiry *"]) expect(within(adult).getByLabelText(label)).toHaveTextContent(/^Select/);
    expect(within(adult).getByLabelText("Title *")).toHaveTextContent("Mr");
    expect(within(infant).getByLabelText("Title *")).toHaveTextContent("Mstr");
    expect(adult).toHaveTextContent("12+ years");
    expect(infant).toHaveTextContent("Under 2 years");
    expect(within(infant).getByLabelText("Travels with")).toHaveTextContent("Adult 1");
    expect(within(adult).queryByRole("combobox", { name: "Use saved traveler, Adult 1" })).not.toBeInTheDocument(); // Adult 1 is the customer
    expect(within(infant).getByRole("combobox", { name: "Use saved traveler, Infant 1" })).toBeInTheDocument();
    expect(screen.queryByText(/never shown in full|show masked/)).not.toBeInTheDocument();   // no masking notice
    expect(screen.getByText("Holding reserves the seats until the time limit. No payment is taken.")).toBeInTheDocument();
  });

  it("checks each traveler as the website does before calling the gateway (gender, passport format, expiry after the travel date)", async () => {
    renderPage(STAFF_DRAFT);
    fillCustomer();
    type("Passport Number", "AB12", screen.getByRole("region", { name: "Customer" }));
    fireEvent.click(screen.getByRole("button", { name: "Hold seats" }));
    const adult = screen.getByRole("region", { name: "Adult 1" });
    expect(await within(adult).findByText("Gender is required")).toBeInTheDocument();
    expect(within(adult).getByText("Enter a valid passport number (6-12 letters/digits)")).toBeInTheDocument();
    expect(within(adult).getByText("Date of birth is required")).toBeInTheDocument();
    expect(within(adult).getByText("Expiry date is required")).toBeInTheDocument();
    expect(gateway.hold).not.toHaveBeenCalled();
    // Expiry days on or before the travel date (19 Nov 2026) can't be picked.
    fireEvent.click(within(adult).getByLabelText("Date of Expiry *"));
    const nineteenth = Array.from(screen.getByRole("dialog").querySelectorAll("button")).find(button => button.textContent === "19");
    expect(nineteenth).toBeDisabled();
  });

  it("Book opens the same page titled Book flight, with Hold seats and the Payments tab note", () => {
    renderPage(STAFF_DRAFT, "book");
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Book flight");
    expect(screen.getByRole("button", { name: "Hold seats" })).toBeInTheDocument();
    expect(screen.getByText(/Payment and issuing happen on the booking's Payments tab\./)).toBeInTheDocument();
  });

  it("sends the gateway's quote and total with the customer card; the customer is Adult 1 by default", async () => {
    gateway.hold.mockResolvedValue({ booking_id: "TRV-ABC123", pnr: "5D8242", selling_total: rs(15_316), label: "UAT test data", warnings: [] });
    renderPage({ ...STAFF_DRAFT, acceptPriceChange: true });
    fillCustomer();
    type("Passport Number", "AB1234567", screen.getByRole("region", { name: "Customer" }));
    const adult = screen.getByRole("region", { name: "Adult 1" });
    expect(within(adult).getByLabelText("First Name *")).toHaveValue("Test");
    expect(within(adult).getByLabelText("Passport Number *")).toHaveValue("AB1234567");
    chooseCountry(adult, "Nationality *", "united arab", "United Arab Emirates");
    fillTraveler(adult, { dob: "1990-01-01" });
    fillInfant();
    fireEvent.click(screen.getByRole("button", { name: "Hold seats" }));
    await waitFor(() => expect(gateway.hold).toHaveBeenCalledTimes(1));
    const request = gateway.hold.mock.calls[0][0];
    expect(request).toMatchObject({
      quote_id: "q1", confirmed_total: rs(15_316), accept_price_change: true,
      customer: { first_name: "Test", last_name: "Customer", phone: "+92 300 1234567", email: "ops@example.invalid", id_type: "PSPT", document_number: "AB1234567" },
    });
    expect(request).not.toHaveProperty("contact");
    expect(request.passengers[0]).not.toHaveProperty("gender");
    expect(request.passengers[0]).toMatchObject({ type: "ADT", title: "MR", first_name: "Test", last_name: "Customer", date_of_birth: "1990-01-01",
      id_type: "PSPT", document_number: "AB1234567", document_country: "PAK", nationality: "ARE", document_expiry: "2031-01-01" });
    expect(request.passengers[1]).toMatchObject({ type: "INF", title: "MASTER", first_name: "Baby", travels_with: 0, document_country: "PAK", nationality: "PAK",
      document_number: "BB1234567", document_expiry: "2031-01-01", date_of_birth: "2026-01-01" });
    expect(await screen.findByRole("heading", { name: "Result page" })).toBeInTheDocument();
    expect(result.state).toMatchObject({ kind: "held", hold: { pnr: "5D8242" } });
  });

  it("shows the gateway's validation messages next to the fields and on the card", async () => {
    gateway.hold.mockRejectedValue(new GatewayError("unavailable", "Some details need correcting.", 422, undefined, [
      { path: ["contact", "email"], message: "String should match pattern '^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$'" },
      { path: ["passengers", 0, "first_name"], message: "String should match pattern '^[A-Za-z][A-Za-z '\\-]{0,24}$'" },
      { path: ["passengers", 0], message: "Test: passport number, issuing country, passport expiry required for a passport." },
    ]));
    renderPage(STAFF_DRAFT);
    fillRequired();
    fireEvent.click(screen.getByRole("button", { name: "Hold seats" }));
    // In the form's words under each field, and the banner lists the fields by label.
    expect(await screen.findByLabelText("Email *", { selector: "input" })).toHaveAccessibleDescription("Email isn't valid");
    expect(screen.getByText("Check these fields: Email (Customer), First Name (Adult 1).")).toBeInTheDocument();
    const adult = screen.getByRole("region", { name: "Adult 1" });
    expect(within(adult).getByLabelText("First Name *")).toHaveAttribute("aria-invalid", "true");
    expect(within(adult).getByRole("alert")).toHaveTextContent("passport number, issuing country, passport expiry required for a passport.");
    expect(screen.queryByRole("heading", { name: "Result page" })).not.toBeInTheDocument();
  });

  it("shows the gateway's own message when a rule refuses the hold", async () => {
    gateway.hold.mockRejectedValue(new GatewayError("unavailable", "Test's passport expires before the last travel date.", 422, undefined));
    renderPage(STAFF_DRAFT);
    fillRequired();
    fireEvent.click(screen.getByRole("button", { name: "Hold seats" }));
    expect(await screen.findByText("Test's passport expires before the last travel date.")).toBeInTheDocument();
  });

  it.each(["booking_off", "not_confirmed_hold", "not_saved", "total_unverified"])("%s goes to the result page's problem state", async code => {
    gateway.hold.mockRejectedValue(new GatewayError("unavailable", `message for ${code}`, 409, code, [], { pnr: "5D8242" }));
    renderPage(STAFF_DRAFT);
    fillRequired();
    fireEvent.click(screen.getByRole("button", { name: "Hold seats" }));
    expect(await screen.findByRole("heading", { name: "Result page" })).toBeInTheDocument();
    expect(result.state).toMatchObject({ kind: "problem", code, message: `message for ${code}`, extra: { pnr: "5D8242" } });
  });

  it("price changed again at hold time: the same dialog appears with the newer price; continuing updates the summary", async () => {
    gateway.hold.mockRejectedValue(new GatewayError("unavailable", "The price changed to Rs 16,000. Revalidate and confirm the new total. Nothing was booked.", 409, "price_changed"));
    gateway.reprice.mockResolvedValue({ ...STAFF_DRAFT.quote, quote_id: "q2", price_changed: true, new_total: rs(16_000), selling_total: rs(16_000),
      old_price_per_adult: rs(13_597), new_price_per_adult: rs(14_281), price_difference_per_adult: rs(684) });
    renderPage(STAFF_DRAFT);
    fillRequired();
    fireEvent.click(screen.getByRole("button", { name: "Hold seats" }));
    const dialog = await screen.findByRole("dialog", { name: "The fare price has changed" });
    expect(dialog).toHaveTextContent("Up Rs 684");
    expect(dialog).toHaveTextContent("New total for 2 travelersRs 16,000");
    fireEvent.click(within(dialog).getByRole("button", { name: "Continue at new price" }));
    expect(screen.getByRole("complementary", { name: "Selected fare", hidden: true })).toHaveTextContent("Rs 16,000");
    gateway.hold.mockResolvedValue({ booking_id: "TRV-ABC123", pnr: "5D8242", selling_total: rs(16_000), label: "UAT test data", warnings: [] });
    fireEvent.click(screen.getByRole("button", { name: "Hold seats" }));
    await waitFor(() => expect(gateway.hold).toHaveBeenCalledTimes(2));
    expect(gateway.hold.mock.calls[1][0]).toMatchObject({ quote_id: "q2", confirmed_total: rs(16_000), accept_price_change: true });
  });

  it("when Valid for runs out the fare is checked again silently; unchanged keeps the page as it is", async () => {
    const expired = { ...STAFF_DRAFT, quote: { ...STAFF_DRAFT.quote, expires_at: new Date(Date.now() - 1000).toISOString() } };
    gateway.reprice.mockResolvedValue({ ...STAFF_DRAFT.quote, quote_id: "q3", expires_at: new Date(Date.now() + 600_000).toISOString() });
    renderPage(expired);
    await waitFor(() => expect(gateway.reprice).toHaveBeenCalledWith("s1", ["x1"]));
    await waitFor(() => expect(within(screen.getByRole("complementary", { name: "Selected fare" })).getByText(/^Valid for/)).toBeInTheDocument());
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("when Valid for runs out and the price moved, the price-changed dialog appears", async () => {
    const expired = { ...STAFF_DRAFT, quote: { ...STAFF_DRAFT.quote, expires_at: new Date(Date.now() - 1000).toISOString() } };
    gateway.reprice.mockResolvedValue({ ...STAFF_DRAFT.quote, quote_id: "q4", price_changed: true, new_total: rs(15_900), selling_total: rs(15_900) });
    renderPage(expired);
    expect(await screen.findByRole("dialog", { name: "The fare price has changed" })).toHaveTextContent("Rs 15,900");
    fireEvent.click(screen.getByRole("button", { name: "Back to results" }));
    expect(await screen.findByRole("heading", { name: /Search page/ })).toHaveTextContent("tab=flights&from=LHE&to=KHI&date=2026-11-19&infants=1");
  });

  it("a fare that's gone on the re-check shows that state", async () => {
    const expired = { ...STAFF_DRAFT, quote: { ...STAFF_DRAFT.quote, expires_at: new Date(Date.now() - 1000).toISOString() } };
    gateway.reprice.mockRejectedValue(new GatewayError("unavailable", "This fare is no longer available. Search again and choose another fare.", 409, "fare_gone"));
    renderPage(expired);
    expect(await screen.findByRole("dialog", { name: "This fare is no longer available" })).toBeInTheDocument();
  });
});

describe("the customer is also Adult 1: first and last name and document, editable both ways", () => {
  beforeEach(() => {
    gateway.hold.mockReset();
    gateway.people.mockReset();
  });

  it("the customer's names and passport fill Adult 1 one-to-one; both stay editable and a change on either side updates the other", () => {
    renderPage(STAFF_DRAFT);
    const customer = screen.getByRole("region", { name: "Customer" });
    const adult = screen.getByRole("region", { name: "Adult 1" });
    type("First Name *", "Ali Hassan", customer);
    type("Last Name *", "Raza", customer);
    expect(within(adult).getByLabelText("First Name *")).toHaveValue("Ali Hassan");
    expect(within(adult).getByLabelText("Last Name *")).toHaveValue("Raza");
    for (const label of ["First Name *", "Last Name *", "Passport Number *"]) expect(within(adult).getByLabelText(label)).not.toHaveAttribute("readonly");
    type("Last Name *", "Raza Khan", adult);                                        // edited on Adult 1 ...
    expect(within(customer).getByLabelText("Last Name *")).toHaveValue("Raza Khan"); // ... shows on the customer
    type("Passport Number", "AB1234567", customer);
    expect(within(adult).getByLabelText("Passport Number *")).toHaveValue("AB1234567");
  });

  it("a missing last name: Hold stops before the gateway with 'Last name is required' under both fields", async () => {
    renderPage(STAFF_DRAFT);
    const customer = screen.getByRole("region", { name: "Customer" });
    const adult = screen.getByRole("region", { name: "Adult 1" });
    type("First Name *", "Customer", customer);
    type("Mobile Number *", "+92 300 1234567", customer);
    type("Email *", "ops@example.invalid", customer);
    type("Passport Number", "AB1234567", customer);
    fillTraveler(adult, { dob: "1990-01-01" });
    fillInfant();
    const lastName = within(adult).getByLabelText("Last Name *");
    expect(lastName).toHaveValue("");
    fireEvent.click(screen.getByRole("button", { name: "Hold seats" }));
    expect(await within(adult).findByText("Last name is required")).toBeInTheDocument();
    expect(within(customer).getByLabelText("Last Name *")).toHaveAccessibleDescription("Last Name is required");
    expect(screen.getByText("Check these fields: Last Name (Customer), Last Name (Adult 1).")).toBeInTheDocument();
    expect(screen.queryByText(/last_name|Required:/)).not.toBeInTheDocument();
    expect(gateway.hold).not.toHaveBeenCalled();
    type("Last Name *", "Raza", adult);                                              // fixed on Adult 1, filled for the customer too
    gateway.hold.mockResolvedValue({ booking_id: "TRV-1", pnr: "ABC123", selling_total: rs(15_316), label: "UAT test data", warnings: [] });
    fireEvent.click(screen.getByRole("button", { name: "Hold seats" }));
    await waitFor(() => expect(gateway.hold).toHaveBeenCalledOnce());
    expect(gateway.hold.mock.calls[0][0].customer).toMatchObject({ first_name: "Customer", last_name: "Raza" });
    expect(gateway.hold.mock.calls[0][0].passengers[0]).toMatchObject({ first_name: "Customer", last_name: "Raza" });
  });

  it("the gateway's 'Required: last_name' becomes 'Last Name is required' under the field", async () => {
    gateway.hold.mockRejectedValue(new GatewayError("unavailable", "Some details need correcting.", 422, "invalid_customer",
      [{ path: ["contact", "last_name"], message: "Required: last_name." }]));
    renderPage(STAFF_DRAFT);
    fillRequired();
    fireEvent.click(screen.getByRole("button", { name: "Hold seats" }));
    const lastName = within(screen.getByRole("region", { name: "Customer" })).getByLabelText("Last Name *");
    await waitFor(() => expect(lastName).toHaveAccessibleDescription("Last Name is required"));
    expect(screen.getByText("Check this field: Last Name (Customer).")).toBeInTheDocument();
  });

  it("CNIC instead of a passport: no issuing country or expiry; 13 digits sent as NATI with Pakistan", async () => {
    gateway.hold.mockResolvedValue({ booking_id: "TRV-1", pnr: "ABC123", selling_total: rs(15_316), label: "UAT test data", warnings: [] });
    renderPage(STAFF_DRAFT);
    fillRequired();
    const infant = screen.getByRole("region", { name: "Infant 1" });
    chooseOption(within(infant).getByRole("combobox", { name: "Document for Infant 1" }), "CNIC / B-form (Pakistan)");
    expect(within(infant).queryByLabelText("Date of Expiry *")).not.toBeInTheDocument();
    expect(within(infant).queryByLabelText("Country of Issuance *")).not.toBeInTheDocument();
    type("CNIC / B-form Number *", "35201-1234567-1", infant);
    expect(within(infant).getByLabelText("CNIC / B-form Number *")).toHaveValue("3520112345671");
    fireEvent.click(screen.getByRole("button", { name: "Hold seats" }));
    await waitFor(() => expect(gateway.hold).toHaveBeenCalledOnce());
    expect(gateway.hold.mock.calls[0][0].passengers[1]).toMatchObject({ id_type: "NATI", document_number: "3520112345671", document_country: "PAK", document_expiry: null });
  });
});

describe("country dropdowns on the hold form", () => {
  beforeEach(() => {
    gateway.hold.mockReset();
    gateway.reprice.mockReset();
  });

  it("default to Pakistan on every traveler card (nationality and country of issuance, as on the website)", () => {
    renderPage({ ...STAFF_DRAFT, request: { ...STAFF_DRAFT.request, adults: 1, children: 1, infants: 1 } });
    for (const name of ["Adult 1", "Child 1", "Infant 1"]) {
      const card = screen.getByRole("region", { name });
      expect(within(card).getByRole("combobox", { name: "Country of Issuance *" })).toHaveTextContent("Pakistan");
      expect(within(card).getByRole("combobox", { name: "Nationality *" })).toHaveTextContent("Pakistan");
    }
  });

  it("search filters by country name and by common names", () => {
    renderPage(STAFF_DRAFT);
    fireEvent.click(within(screen.getByRole("region", { name: "Adult 1" })).getByRole("combobox", { name: "Country of Issuance *" }));
    const input = screen.getByRole("combobox", { name: "Search country" });
    fireEvent.change(input, { target: { value: "saudi" } });
    expect(screen.getAllByRole("option").map(option => option.textContent)).toEqual(["Saudi Arabia"]);
    fireEvent.change(input, { target: { value: "uae" } });
    expect(screen.getAllByRole("option").map(option => option.textContent)).toEqual(["United Arab Emirates"]);
    fireEvent.change(input, { target: { value: "zzz" } });
    expect(screen.getByText("No country found.")).toBeInTheDocument();
  });

  it("is keyboard accessible: type to filter, Enter chooses; the selected name shows and its code is sent", async () => {
    gateway.hold.mockResolvedValue({ booking_id: "TRV-ABC123", pnr: "5D8242", selling_total: STAFF_DRAFT.quote.new_total, label: "UAT test data", warnings: [] });
    renderPage(STAFF_DRAFT);
    const infant = screen.getByRole("region", { name: "Infant 1" });
    const trigger = within(infant).getByRole("combobox", { name: "Country of Issuance *" });
    trigger.focus();
    fireEvent.keyDown(trigger, { key: "Enter" });
    fireEvent.click(trigger);
    const input = screen.getByRole("combobox", { name: "Search country" });
    fireEvent.change(input, { target: { value: "united kingdom" } });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(trigger).toHaveTextContent("United Kingdom");
    fillRequired();
    fireEvent.click(screen.getByRole("button", { name: "Hold seats" }));
    await waitFor(() => expect(gateway.hold).toHaveBeenCalledTimes(1));
    expect(gateway.hold.mock.calls[0][0].passengers[1]).toMatchObject({ type: "INF", document_country: "GBR" });
    expect(gateway.hold.mock.calls[0][0].passengers[0]).toMatchObject({ document_country: "PAK", nationality: "PAK" });
  });

  it("shows the gateway's validation message next to the country field", async () => {
    gateway.hold.mockRejectedValue(new GatewayError("unavailable", "Some details need correcting.", 422, undefined, [
      { path: ["passengers", 0, "nationality"], message: "String should match pattern '^[A-Z]{3}$'" },
    ]));
    renderPage(STAFF_DRAFT);
    fillRequired();
    fireEvent.click(screen.getByRole("button", { name: "Hold seats" }));
    const field = await within(screen.getByRole("region", { name: "Adult 1" })).findByRole("combobox", { name: "Nationality *" });
    await waitFor(() => expect(field).toHaveAccessibleDescription("Nationality isn't valid"));
    expect(field).toHaveAttribute("aria-invalid", "true");
  });

  describe("saved customers and travelers", () => {
    // Made-up search results, as the gateway returns them (full values).
    const doc = (id: string, number: string) => ({ id, id_type: "PSPT" as const, document_country: "PAK", document_number: number, document_expiry: "2031-01-01", document_validity: "valid" as const });
    const ALI = { id: "p-00000001", title: "MR" as const, first_name: "Ali", last_name: "Khan", date_of_birth: "1990-01-31", nationality: "PAK",
      phone: "+92 3001234567", email: "ali@example.invalid", documents: [doc("d-00000001", "AB1234567")], match: "phone" };
    const SARA = { id: "p-00000002", title: "MRS" as const, first_name: "Sara", last_name: "Khan", date_of_birth: "1993-06-15", phone: "+92 3001234567",
      documents: [doc("d-00000002", "AB1230111"), doc("d-00000003", "AB1230222")], match: "phone" };

    /** Type in a live-search field and choose the match by its name. */
    async function pick(input: HTMLElement, query: string, who: string) {
      fireEvent.change(input, { target: { value: query } });
      fireEvent.click(await screen.findByRole("option", { name: new RegExp(`^${who}`) }));
    }
    const findCustomer = () => within(screen.getByRole("region", { name: "Customer" })).getByRole("combobox", { name: "Search existing customer" });

    it("Search existing customer by mobile number lists every match; picking fills the form (editable) and the hold sends the id with the values", async () => {
      gateway.people.mockResolvedValue({ results: [ALI, SARA], can_manage: true, can_merge: false });
      gateway.hold.mockResolvedValue({ booking_id: "TRV-1", pnr: "ABC123", selling_total: rs(15_316) });
      renderPage(STAFF_DRAFT);
      const customer = screen.getByRole("region", { name: "Customer" });
      expect(within(customer).queryByRole("button", { name: "Find" })).not.toBeInTheDocument();   // live search, no Find button
      fireEvent.change(findCustomer(), { target: { value: "3001234567" } });
      const list = await screen.findByRole("listbox", { name: "Search existing customer results" });
      expect(gateway.people).toHaveBeenCalledWith("3001234567", expect.anything());
      expect(within(list).getAllByRole("option")).toHaveLength(2);
      expect(list).toHaveTextContent("Ali KhanPassport AB1234567 · +92 3001234567 · ali@example.invalid");
      fireEvent.click(within(list).getByRole("option", { name: /^Ali Khan/ }));

      // Filled, and still editable.
      expect(customer).toHaveTextContent("Filled from existing customer: Ali Khan");
      expect(within(customer).getByLabelText("First Name *")).toHaveValue("Ali");
      expect(within(customer).getByLabelText("Mobile Number *")).toHaveValue("+92 3001234567");
      expect(within(customer).getByLabelText("Email *")).toHaveValue("ali@example.invalid");
      expect(within(customer).getByLabelText("Passport Number")).toHaveValue("AB1234567");
      expect(customer).toHaveTextContent("Changes to the phone, email or document are saved to this customer's record.");
      type("Email *", "ali.new@example.invalid", customer);
      // The customer is Adult 1: Adult 1 is filled from the same record (date of birth, nationality, passport expiry).
      const adult = screen.getByRole("region", { name: "Adult 1" });
      expect(within(adult).getByLabelText("First Name *")).toHaveValue("Ali");
      expect(within(adult).getByLabelText("Date of Birth *")).toHaveTextContent("31 Jan 1990");
      expect(within(adult).getByLabelText("Date of Expiry *")).toHaveTextContent("1 Jan 2031");
      expect(within(adult).getByLabelText("Gender *")).toHaveTextContent("Male");
      // The infant: a saved traveler fills its card too (the passport still valid is used).
      const infant = screen.getByRole("region", { name: "Infant 1" });
      // Under 2 on the travel date (issue #52: an adult's date of birth on an infant card is refused before Hold).
      gateway.people.mockResolvedValue({ results: [{ ...SARA, date_of_birth: "2025-06-15" }], can_manage: true, can_merge: false });
      await pick(within(infant).getByRole("combobox", { name: "Use saved traveler, Infant 1" }), "Sara", "Sara Khan");
      expect(infant).toHaveTextContent("Filled from saved traveler: Sara Khan");
      expect(within(infant).getByLabelText("Passport Number *")).toHaveValue("AB1230111");
      fireEvent.click(screen.getByRole("button", { name: "Hold seats" }));

      await waitFor(() => expect(gateway.hold).toHaveBeenCalledOnce());
      const body = gateway.hold.mock.calls[0][0];
      expect(body.customer).toEqual({ customer_id: "p-00000001", first_name: "Ali", last_name: "Khan", phone: "+92 3001234567",
        email: "ali.new@example.invalid", id_type: "PSPT", document_number: "AB1234567", save_for_next_time: true });
      // Travelers go as their (checked) details; the gateway links them to the saved person by the document number.
      expect(body.passengers[0]).toMatchObject({ type: "ADT", title: "MR", first_name: "Ali", last_name: "Khan", date_of_birth: "1990-01-31",
        document_number: "AB1234567", document_expiry: "2031-01-01", nationality: "PAK", save_for_next_time: true });
      expect(body.passengers[1]).toMatchObject({ type: "INF", title: "MRS", first_name: "Sara", document_number: "AB1230111", travels_with: 0 });
      for (const passenger of body.passengers) expect(passenger).not.toHaveProperty("traveler_id");
    });

    it("a saved customer with only a passport fills title, gender, date of birth, nationality, passport and expiry; when the airline needs a CNIC the banner says so", async () => {
      // The shape of the record behind the bug report (made-up values): MR, Pakistani, one valid passport, no CNIC.
      const ONLY_PASSPORT = { id: "p-00000009", title: "MR" as const, first_name: "Hafeez", last_name: "Ahmed", date_of_birth: "1988-03-14", nationality: "PAK",
        phone: "+92 3214567890", email: "hafeez@example.invalid", documents: [{ ...doc("d-00000009", "BX7654321"), document_expiry: "2040-11-07" }], match: "contact" };
      gateway.people.mockResolvedValue({ results: [ONLY_PASSPORT], can_manage: true, can_merge: false });
      gateway.hold.mockRejectedValue(new GatewayError("unavailable", "Some details need correcting.", 422, undefined, [
        { path: ["passengers", 0, "document_number"], message: "This airline needs the traveler's CNIC for this flight: choose CNIC as the ID type and enter the 13 digits." },
      ]));
      renderPage(STAFF_DRAFT);
      await pick(findCustomer(), "haf", "Hafeez Ahmed");
      const adult = screen.getByRole("region", { name: "Adult 1" });
      expect(within(adult).getByLabelText("Title *")).toHaveTextContent("Mr");
      expect(within(adult).getByLabelText("Gender *")).toHaveTextContent("Male");
      expect(within(adult).getByLabelText("Date of Birth *")).toHaveTextContent("14 Mar 1988");
      expect(within(adult).getByLabelText("Passport Number *")).toHaveValue("BX7654321");
      expect(within(adult).getByLabelText("Date of Expiry *")).toHaveTextContent("7 Nov 2040");
      expect(within(adult).getByRole("combobox", { name: "Nationality *" })).toHaveTextContent("Pakistan");
      fillInfant();
      fireEvent.click(screen.getByRole("button", { name: "Hold seats" }));
      await waitFor(() => expect(gateway.hold).toHaveBeenCalledOnce());
      expect(gateway.hold.mock.calls[0][0].passengers[0]).toMatchObject({ title: "MR", date_of_birth: "1988-03-14", nationality: "PAK", id_type: "PSPT",
        document_number: "BX7654321", document_country: "PAK", document_expiry: "2040-11-07" });
      expect(await screen.findByText("Check this field: Document number (Adult 1): This airline needs the traveler's CNIC for this flight: choose CNIC as the ID type and enter the 13 digits."))
        .toBeInTheDocument();
    });

    it("CNIC up front: when the fare needs a CNIC, Adult 1 asks for it, a saved CNIC is used, and no hold goes without one", async () => {
      const CNIC_DRAFT = { ...STAFF_DRAFT, quote: { ...STAFF_DRAFT.quote, documents: [{ type: "ADT" as const, number: 1, document: "cnic" as const }] } };
      const BOTH = { id: "p-00000010", title: "MR" as const, first_name: "Hafeez", last_name: "Ahmed", date_of_birth: "1988-03-14", nationality: "PAK",
        phone: "+92 3214567890", email: "hafeez@example.invalid", match: "contact",
        documents: [doc("d-00000010", "BX7654321"), { id: "d-00000011", id_type: "NATI" as const, document_country: "PAK", document_number: "3520112345671",
          document_expiry: null, document_validity: "no_expiry" as const }] };
      const NO_CNIC = { ...BOTH, id: "p-00000012", first_name: "Bilal", documents: [doc("d-00000012", "BX0000001")] };
      gateway.hold.mockResolvedValue({ booking_id: "TRV-1", pnr: "ABC123", selling_total: rs(15_316) });
      const { unmount } = renderPage(CNIC_DRAFT);
      const adult = () => screen.getByRole("region", { name: "Adult 1" });
      // Before anything is typed: CNIC is chosen and the reason shown.
      expect(await within(adult()).findByLabelText("CNIC / B-form Number *")).toBeInTheDocument();
      expect(adult()).toHaveTextContent("This airline needs the traveler's CNIC / B-form for this flight.");
      // A saved customer with a passport and a CNIC: the CNIC is filled.
      gateway.people.mockResolvedValue({ results: [BOTH], can_manage: true, can_merge: false });
      await pick(findCustomer(), "haf", "Hafeez Ahmed");
      expect(within(adult()).getByLabelText("CNIC / B-form Number *")).toHaveValue("3520112345671");
      fillInfant();
      fireEvent.click(screen.getByRole("button", { name: "Hold seats" }));
      await waitFor(() => expect(gateway.hold).toHaveBeenCalledOnce());
      expect(gateway.hold.mock.calls[0][0].passengers[0]).toMatchObject({ id_type: "NATI", document_number: "3520112345671" });
      expect(gateway.hold.mock.calls[0][0].customer).toMatchObject({ id_type: "NATI", document_number: "3520112345671" });
      unmount();
      // Only a passport saved: CNIC stays the document, empty, and Hold says what is missing (no gateway call).
      gateway.hold.mockClear();
      gateway.people.mockResolvedValue({ results: [NO_CNIC], can_manage: true, can_merge: false });
      renderPage(CNIC_DRAFT);
      await pick(findCustomer(), "bil", "Bilal Ahmed");
      expect(within(adult()).getByLabelText("CNIC / B-form Number *")).toHaveValue("");
      fillInfant();
      fireEvent.click(screen.getByRole("button", { name: "Hold seats" }));
      expect(await within(adult()).findByText(/CNIC \/ B-form Number is required|CNIC number is required/)).toBeInTheDocument();
      expect(gateway.hold).not.toHaveBeenCalled();
    });

    it("Clear empties the customer card; one character doesn't search; no match says a new customer is saved", async () => {
      gateway.people.mockResolvedValue({ results: [], can_manage: true, can_merge: false });
      renderPage(STAFF_DRAFT);
      const customer = screen.getByRole("region", { name: "Customer" });
      fireEvent.change(findCustomer(), { target: { value: "a" } });
      await new Promise(resolve => setTimeout(resolve, 400));
      expect(gateway.people).not.toHaveBeenCalled();
      fireEvent.change(findCustomer(), { target: { value: "3009999999" } });
      expect(await screen.findByRole("option", { name: "No customer matches. Type the details below: a new customer is saved with the booking." })).toBeInTheDocument();

      gateway.people.mockResolvedValue({ results: [ALI], can_manage: true, can_merge: false });
      await pick(findCustomer(), "Ali", "Ali Khan");
      expect(within(customer).getByLabelText("First Name *")).toHaveValue("Ali");
      fireEvent.click(within(customer).getByRole("button", { name: "Clear existing customer" }));
      expect(within(customer).getByLabelText("First Name *")).toHaveValue("");
      expect(customer).not.toHaveTextContent("Filled from existing customer");
      expect(within(customer).getByRole("checkbox", { name: "Save this customer for next time" })).toBeChecked();
    });

    it("an existing customer without phone or email: the form asks for them before calling the gateway", async () => {
      gateway.people.mockResolvedValue({ results: [{ ...ALI, phone: undefined, email: undefined }], can_manage: true, can_merge: false });
      renderPage(STAFF_DRAFT);
      const customer = screen.getByRole("region", { name: "Customer" });
      await pick(findCustomer(), "Ali", "Ali Khan");
      fireEvent.click(screen.getByRole("button", { name: "Hold seats" }));
      expect(await within(customer).findByLabelText("Mobile Number *")).toHaveAccessibleDescription("Mobile Number is required");
      expect(gateway.hold).not.toHaveBeenCalled();
    });
  });
});


describe("one shared booking form on both hold routes", () => {
  const TICKET = { id: "t1", sector: "ISB - JED", departure_date: "2026-11-22", departure_time: "06:40", airline: "Fly Jinnah", remaining: 12,
    baggage: "20", hand_carry: "7", stock: "supplier" as const, can_hold: true };
  const renderGroup = () =>
    render(
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
        <MemoryRouter initialEntries={["/admin/search/group-ticketing/hold?ticket=t1&from=ISB&to=JED&date=2026-11-22&adults=2"]}>
          <Routes><Route path="/admin/search/group-ticketing/hold" element={<GroupHoldPage />} /></Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    );
  const cards = () => screen.getAllByRole("region").map(region => region.getAttribute("aria-label") ?? region.textContent?.split(/\s/)[0]);

  beforeEach(() => gateway.groupTicket.mockResolvedValue(TICKET));

  it("both pages: Back to results, title and subtitle, the 4-step stepper on Traveler details, and the same customer fields", async () => {
    for (const page of [() => renderPage(STAFF_DRAFT), renderGroup]) {
      const { unmount } = page();
      expect(screen.getByRole("link", { name: "Back to results" })).toBeInTheDocument();
      expect(screen.getByText("Enter the customer and traveler details, then hold the seats.")).toBeInTheDocument();
      expect(screen.getByRole("list", { name: "Booking steps" })).toHaveTextContent(/Search results.*Traveler details.*Hold seats.*Payment and tickets/);
      expect(screen.getByRole("listitem", { current: "step" })).toHaveTextContent("Traveler details");
      expect(screen.getByRole("form", { name: "Traveler details" })).toBeInTheDocument();
      const customer = screen.getByRole("region", { name: "Customer" });
      expect(Array.from(customer.querySelectorAll("label")).map(node => node.textContent).slice(0, 7))
        .toEqual(["Search existing customer", "First Name *", "Last Name *", "Mobile Number *", "Email *", "Document", "Passport Number"]);
      expect(screen.queryByText(/never shown in full|show masked/)).not.toBeInTheDocument();   // no masking notice
      const panel = await screen.findByRole("complementary");
      expect(within(panel).getByRole("button", { name: "Hold seats" })).toHaveAttribute("form");
      unmount();
    }
  });

  it("field sets per flow: Flights adds Child and Infant cards from the search counts; Group stays adults only", async () => {
    const flights = renderPage({ ...STAFF_DRAFT, request: { ...STAFF_DRAFT.request, adults: 2, children: 1, infants: 1 } });
    expect(cards().filter(name => /^(Adult|Child|Infant) \d$/.test(name ?? ""))).toEqual(["Adult 1", "Adult 2", "Child 1", "Infant 1"]);
    flights.unmount();
    gateway.groupTicket.mockResolvedValue({ ...TICKET, selling_price: rs(168_000) });
    renderGroup();
    await screen.findByText("Fly Jinnah");
    expect(cards().filter(name => /^(Adult|Child|Infant) \d$/.test(name ?? ""))).toEqual(["Adult 1", "Adult 2"]);
    expect(screen.getByRole("region", { name: "Selling price" })).toBeInTheDocument();
  });

  it("Flights shows the fare-confirmed timer; Group says the price is confirmed when the seats are held", async () => {
    const flights = renderPage(STAFF_DRAFT);
    const fare = screen.getByRole("complementary", { name: "Selected fare" });
    expect(fare).toHaveTextContent("Fare confirmed at");
    expect(within(fare).getByText(/^Valid for \d\d:\d\d$/)).toBeInTheDocument();
    expect(fare).not.toHaveTextContent("The price is confirmed when the seats are held.");
    flights.unmount();
    renderGroup();
    const group = await screen.findByRole("complementary", { name: "Selected group fare" });
    await within(group).findByText("Fly Jinnah");
    expect(group).toHaveTextContent("The price is confirmed when the seats are held.");
    expect(group).toHaveTextContent("Baggage7 kg hand carry + 20 kg checked"); // #36: full words on the hold page
    expect(group).not.toHaveTextContent(/Valid for|Fare confirmed/);
  });

  it("the admin-only cost block shows only what the gateway sends (cost and margin permission)", async () => {
    const plain = renderPage(STAFF_DRAFT);
    expect(screen.queryByLabelText("Admin only")).not.toBeInTheDocument();
    plain.unmount();
    const admin = renderPage(ADMIN_DRAFT);
    expect(screen.getByLabelText("Admin only")).toHaveTextContent("Supplier cost Rs 15,015 · Margin Rs 301");
    admin.unmount();
    renderGroup();
    await screen.findByText("Fly Jinnah");
    expect(screen.queryByLabelText("Admin only")).not.toBeInTheDocument();
    cleanup();
    gateway.groupTicket.mockResolvedValue({ ...TICKET, supplier_cost: rs(160_000) });
    renderGroup();
    expect(await screen.findByLabelText("Admin only")).toHaveTextContent("Supplier cost Rs 160,000 per adult");
  });
});

describe("fare check unavailable (503)", () => {
  it("the timer's re-check failing with 503 says 'Fare check unavailable, try again' with the gateway's reason, and Try again re-checks", async () => {
    gateway.reprice.mockReset().mockRejectedValueOnce(new GatewayError("unavailable", "Identity verification is temporarily unavailable.", 503))
      .mockResolvedValueOnce({ ...STAFF_DRAFT.quote, quote_id: "q9", expires_at: new Date(Date.now() + 600_000).toISOString() });
    renderPage({ ...STAFF_DRAFT, quote: { ...STAFF_DRAFT.quote, expires_at: new Date(Date.now() - 1000).toISOString() } });
    const dialog = await screen.findByRole("dialog", { name: "We couldn't confirm this fare" });
    expect(dialog).toHaveTextContent("Fare check unavailable, try again. Identity verification is temporarily unavailable.");
    fireEvent.click(within(dialog).getByRole("button", { name: "Try again" }));
    await waitFor(() => expect(gateway.reprice).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });
});

describe("live search for saved customers and travelers (both hold pages)", () => {
  const USMAN = { id: "p-00000021", title: "MR" as const, first_name: "Usman", last_name: "Tariq", date_of_birth: "1988-05-04", nationality: "PAK",
    phone: "+92 3009876234", email: "usman@example.invalid",
    documents: [{ id: "d-00000021", id_type: "PSPT" as const, document_country: "PAK", document_number: "AB1234967", document_expiry: "2031-01-01", document_validity: "valid" as const }],
    match: "name" };
  const SANA = { ...USMAN, id: "p-00000022", first_name: "Sana", last_name: "Tariq", phone: undefined, email: undefined,
    documents: [{ ...USMAN.documents[0], id: "d-00000022", document_number: "AB1230111" }] };
  const renderGroup = () =>
    render(
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
        <MemoryRouter initialEntries={["/admin/search/group-ticketing/hold?ticket=t1&from=ISB&to=JED&date=2026-11-22&adults=2"]}>
          <Routes><Route path="/admin/search/group-ticketing/hold" element={<GroupHoldPage />} /></Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    );

  beforeEach(() => {
    gateway.people.mockReset().mockResolvedValue({ results: [USMAN, SANA], can_manage: true, can_merge: false });
    gateway.groupTicket.mockResolvedValue({ id: "t1", sector: "ISB - JED", departure_date: "2026-11-22", departure_time: "06:40", airline: "Fly Jinnah",
      remaining: 12, baggage: "20", hand_carry: "7", stock: "supplier", can_hold: true });
  });

  for (const [page, open] of [["Flights", () => renderPage(STAFF_DRAFT)], ["Group", renderGroup]] as const) {
    it(`${page}: typing 'tar' lists matches with name, document, phone and email in full; arrow keys and Enter choose; the customer fills in`, async () => {
      open();
      const input = within(screen.getByRole("region", { name: "Customer" })).getByRole("combobox", { name: "Search existing customer" });
      fireEvent.change(input, { target: { value: "tar" } });
      const list = await screen.findByRole("listbox", { name: "Search existing customer results" });
      await waitFor(() => expect(gateway.people).toHaveBeenCalledWith("tar", expect.anything()));
      expect(within(list).getAllByRole("option").map(option => option.textContent)).toEqual([
        "Usman TariqPassport AB1234967 · +92 3009876234 · usman@example.invalid", "Sana TariqPassport AB1230111"]);
      expect(input).toHaveAttribute("aria-expanded", "true");
      fireEvent.keyDown(input, { key: "ArrowDown" });                                     // Usman -> Sana
      expect(input.getAttribute("aria-activedescendant")).toContain("p-00000022");
      fireEvent.keyDown(input, { key: "ArrowUp" });                                       // back to Usman
      fireEvent.keyDown(input, { key: "Enter" });
      await waitFor(() => expect(screen.queryByRole("listbox")).not.toBeInTheDocument());
      const customer = screen.getByRole("region", { name: "Customer" });
      expect(customer).toHaveTextContent("Filled from existing customer: Usman Tariq");
      expect(within(customer).getByLabelText("Mobile Number *")).toHaveValue("+92 3009876234");
      expect(within(customer).getByLabelText("Email *")).toHaveValue("usman@example.invalid");
      expect(within(screen.getByRole("region", { name: "Adult 1" })).getByLabelText("First Name *")).toHaveValue("Usman");   // the customer is Adult 1
    });

    it(`${page}: Esc closes the list; a traveler card searches by name and fills in the saved traveler`, async () => {
      open();
      const input = within(screen.getByRole("region", { name: "Customer" })).getByRole("combobox", { name: "Search existing customer" });
      fireEvent.change(input, { target: { value: "usm" } });
      await screen.findByRole("listbox");
      fireEvent.keyDown(input, { key: "Escape" });
      await waitFor(() => expect(screen.queryByRole("listbox")).not.toBeInTheDocument());
      const second = screen.getAllByRole("region").find(region => /^(Adult 2|Infant 1)$/.test(region.getAttribute("aria-label") ?? ""))!;
      const label = second.getAttribute("aria-label")!;
      fireEvent.change(within(second).getByRole("combobox", { name: `Use saved traveler, ${label}` }), { target: { value: "sana" } });
      fireEvent.click(await screen.findByRole("option", { name: /^Sana Tariq/ }));
      const card = screen.getByRole("region", { name: label });
      expect(card).toHaveTextContent("Filled from saved traveler: Sana Tariq");
      expect(within(card).getByLabelText("First Name *")).toHaveValue("Sana");            // filled, still editable
      expect(within(card).getByLabelText("Passport Number *")).toHaveValue("AB1230111");
      expect(within(card).getByRole("combobox", { name: `Document for ${label}` })).toBeEnabled();
    });
  }
});
