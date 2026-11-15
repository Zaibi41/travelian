import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GatewayError } from "@/lib/gateway/client";
import type { HoldDraft } from "@/lib/admin-search/hold";

const gateway = vi.hoisted(() => ({ hold: vi.fn(), reprice: vi.fn(), people: vi.fn(), groupTicket: vi.fn() }));
vi.mock("@/lib/admin-search/group-holds", async importOriginal => ({ ...(await importOriginal<object>()), fetchGroupTicket: gateway.groupTicket }));
vi.mock("@/lib/saved-people/api", async importOriginal => ({ ...(await importOriginal<object>()), searchPeople: gateway.people }));
vi.mock("@/lib/admin-search/flights", async importOriginal => ({
  ...(await importOriginal<object>()), holdFlight: gateway.hold, repriceFlights: gateway.reprice,
}));

import HoldFlightPage from "@/pages/HoldFlightPage";
import GroupHoldPage from "@/pages/GroupHoldPage";
import { ADMIN_DRAFT, STAFF_DRAFT } from "@/test/hold-fixtures";

globalThis.ResizeObserver ??= class { observe() {} unobserve() {} disconnect() {} } as unknown as typeof ResizeObserver;
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

/** Open a country dropdown on a card, type to search, and pick an option by its name. */
function chooseCountry(card: HTMLElement, label: string, search: string, option: string) {
  fireEvent.click(within(card).getByRole("combobox", { name: label }));
  const input = screen.getByRole("combobox", { name: "Search country" });
  fireEvent.change(input, { target: { value: search } });
  fireEvent.click(screen.getByRole("option", { name: option }));
}

function fillCustomer() {
  const customer = screen.getByRole("region", { name: "Customer" });
  type("Full name", "Test Customer", customer);
  type("Phone", "+92 300 1234567", customer);
  type("Email", "ops@example.invalid", customer);
}

describe("Shared booking form on the Flights hold page", () => {
  beforeEach(() => {
    gateway.hold.mockReset();
    gateway.reprice.mockReset();
    gateway.people.mockReset();
    result.state = null;
  });

  it("has the Group customer section and one card per traveler from the search counts, with empty identity fields", () => {
    renderPage(STAFF_DRAFT);
    const customer = screen.getByRole("region", { name: "Customer" });
    for (const label of ["Find saved customer", "Full name", "Phone", "Email", "Document type", "Document number"]) expect(within(customer).getByLabelText(label)).toBeInTheDocument();
    expect(within(customer).getByRole("checkbox", { name: "The customer is also Adult 1" })).toBeChecked();
    expect(within(customer).getByRole("checkbox", { name: "Save this customer for next time" })).toBeChecked();
    const adult = screen.getByRole("region", { name: "Adult 1" });
    const infant = screen.getByRole("region", { name: "Infant 1" });
    for (const label of ["Date of birth", "Document number", "Document expiry"]) expect(within(infant).getByLabelText(label)).toHaveValue("");
    for (const label of ["Given name", "Surname", "Date of birth", "Document expiry"]) expect(within(adult).getByLabelText(label)).toHaveValue("");
    for (const label of ["Title", "Gender", "Nationality", "Document type", "Issuing country"]) expect(within(adult).getByLabelText(label)).toBeInTheDocument();
    expect(within(adult).getByLabelText("Title")).toHaveTextContent("Mr");
    expect(within(infant).getByLabelText("Title")).toHaveTextContent("Master");
    expect(adult).toHaveTextContent("12 or over on the travel date");
    expect(infant).toHaveTextContent("Under 2 on the travel date");
    expect(within(infant).getByLabelText("Travels with")).toHaveTextContent("Adult 1");
    expect(within(infant).queryByLabelText("Nationality")).not.toBeInTheDocument();
    expect(within(adult).getByRole("button", { name: "Use saved traveler, Adult 1" })).toBeInTheDocument();
    expect(screen.getByText(/Passport, ID number and date of birth are never shown in full here/)).toBeInTheDocument();
    expect(screen.getByText("Holding reserves the seats until the time limit. No payment is taken.")).toBeInTheDocument();
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
    type("Document number", "AB1234567", screen.getByRole("region", { name: "Customer" }));
    const adult = screen.getByRole("region", { name: "Adult 1" });
    expect(within(adult).getByLabelText("Given name")).toHaveValue("Test");
    expect(within(adult).getByLabelText("Document number")).toHaveValue("AB1234567");
    type("Date of birth", "1990-01-01", adult);
    chooseCountry(adult, "Nationality", "united arab", "United Arab Emirates");
    type("Document expiry", "2031-01-01", adult);
    const infant = screen.getByRole("region", { name: "Infant 1" });
    type("Given name", "Baby", infant);
    type("Surname", "Passenger", infant);
    type("Date of birth", "2026-01-01", infant);
    fireEvent.click(screen.getByRole("button", { name: "Hold seats" }));
    await waitFor(() => expect(gateway.hold).toHaveBeenCalledTimes(1));
    const request = gateway.hold.mock.calls[0][0];
    expect(request).toMatchObject({
      quote_id: "q1", confirmed_total: rs(15_316), accept_price_change: true,
      customer: { full_name: "Test Customer", phone: "+92 300 1234567", email: "ops@example.invalid", id_type: "PSPT", document_number: "AB1234567" },
    });
    expect(request).not.toHaveProperty("contact");
    expect(request.passengers[0]).not.toHaveProperty("gender");
    expect(request.passengers[0]).toMatchObject({ type: "ADT", title: "MR", first_name: "Test", last_name: "Customer", date_of_birth: "1990-01-01",
      id_type: "PSPT", document_number: "AB1234567", document_country: "PAK", nationality: "ARE", document_expiry: "2031-01-01" });
    expect(request.passengers[1]).toMatchObject({ type: "INF", title: "MASTER", first_name: "Baby", travels_with: 0, document_country: "PAK", nationality: null, document_number: null });
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
    fireEvent.click(screen.getByRole("button", { name: "Hold seats" }));
    expect(await screen.findByLabelText("Email", { selector: "input" })).toHaveAccessibleDescription(/String should match pattern/);
    const adult = screen.getByRole("region", { name: "Adult 1" });
    expect(within(adult).getByLabelText("Given name")).toHaveAttribute("aria-invalid", "true");
    expect(within(adult).getByRole("alert")).toHaveTextContent("passport number, issuing country, passport expiry required for a passport.");
    expect(screen.queryByRole("heading", { name: "Result page" })).not.toBeInTheDocument();
  });

  it("shows the gateway's own message when a rule refuses the hold", async () => {
    gateway.hold.mockRejectedValue(new GatewayError("unavailable", "Test's passport expires before the last travel date.", 422, undefined));
    renderPage(STAFF_DRAFT);
    fireEvent.click(screen.getByRole("button", { name: "Hold seats" }));
    expect(await screen.findByText("Test's passport expires before the last travel date.")).toBeInTheDocument();
  });

  it.each(["booking_off", "not_confirmed_hold", "not_saved", "total_unverified"])("%s goes to the result page's problem state", async code => {
    gateway.hold.mockRejectedValue(new GatewayError("unavailable", `message for ${code}`, 409, code, [], { pnr: "5D8242" }));
    renderPage(STAFF_DRAFT);
    fireEvent.click(screen.getByRole("button", { name: "Hold seats" }));
    expect(await screen.findByRole("heading", { name: "Result page" })).toBeInTheDocument();
    expect(result.state).toMatchObject({ kind: "problem", code, message: `message for ${code}`, extra: { pnr: "5D8242" } });
  });

  it("price changed again at hold time: the same dialog appears with the newer price; continuing updates the summary", async () => {
    gateway.hold.mockRejectedValue(new GatewayError("unavailable", "The price changed to Rs 16,000. Revalidate and confirm the new total. Nothing was booked.", 409, "price_changed"));
    gateway.reprice.mockResolvedValue({ ...STAFF_DRAFT.quote, quote_id: "q2", price_changed: true, new_total: rs(16_000), selling_total: rs(16_000),
      old_price_per_adult: rs(13_597), new_price_per_adult: rs(14_281), price_difference_per_adult: rs(684) });
    renderPage(STAFF_DRAFT);
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

describe("country dropdowns on the hold form", () => {
  beforeEach(() => {
    gateway.hold.mockReset();
    gateway.reprice.mockReset();
  });

  it("default to Pakistan on every traveler card (issuing country; nationality for adults and children)", () => {
    renderPage({ ...STAFF_DRAFT, request: { ...STAFF_DRAFT.request, adults: 1, children: 1, infants: 1 } });
    for (const name of ["Adult 1", "Child 1", "Infant 1"]) {
      const card = screen.getByRole("region", { name });
      expect(within(card).getByRole("combobox", { name: "Issuing country" })).toHaveTextContent("Pakistan");
      if (name !== "Infant 1") expect(within(card).getByRole("combobox", { name: "Nationality" })).toHaveTextContent("Pakistan");
    }
    expect(within(screen.getByRole("region", { name: "Infant 1" })).queryByRole("combobox", { name: "Nationality" })).not.toBeInTheDocument();
  });

  it("search filters by country name and by common names", () => {
    renderPage(STAFF_DRAFT);
    fireEvent.click(within(screen.getByRole("region", { name: "Adult 1" })).getByRole("combobox", { name: "Issuing country" }));
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
    const trigger = within(infant).getByRole("combobox", { name: "Issuing country" });
    trigger.focus();
    fireEvent.keyDown(trigger, { key: "Enter" });
    fireEvent.click(trigger);
    const input = screen.getByRole("combobox", { name: "Search country" });
    fireEvent.change(input, { target: { value: "united kingdom" } });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(trigger).toHaveTextContent("United Kingdom");
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
    fireEvent.click(screen.getByRole("button", { name: "Hold seats" }));
    const field = await within(screen.getByRole("region", { name: "Adult 1" })).findByRole("combobox", { name: "Nationality" });
    await waitFor(() => expect(field).toHaveAccessibleDescription("String should match pattern '^[A-Z]{3}$'"));
    expect(field).toHaveAttribute("aria-invalid", "true");
  });

  describe("saved customers and travelers", () => {
    // Made-up, already-masked search results, as the gateway returns them.
    const doc = (id: string, masked: string) => ({ id, id_type: "PSPT" as const, document_country: "PAK", document_number_masked: masked, document_expiry_masked: "2031", document_validity: "valid" as const });
    const ALI = { id: "p-00000001", title: "MR" as const, first_name: "Ali", last_name: "Khan", birth_year: 1990, nationality: "PAK",
      phone_masked: "+92 •••••••567", email_masked: "a•••@example.invalid", documents: [doc("d-00000001", "••••••567")], match: "phone" };
    const SARA = { id: "p-00000002", title: "MRS" as const, first_name: "Sara", last_name: "Khan", birth_year: 1993, phone_masked: "+92 •••••••567",
      documents: [doc("d-00000002", "••••••111"), doc("d-00000003", "••••••222")], match: "phone" };

    async function pick(button: HTMLElement, query: string, who: string) {
      fireEvent.click(button);
      const dialog = await screen.findByRole("dialog");
      fireEvent.change(within(dialog).getByLabelText("Mobile number, CNIC, passport, email or name"), { target: { value: query } });
      fireEvent.click(within(dialog).getByRole("button", { name: "Search" }));
      fireEvent.click(await within(dialog).findByRole("button", { name: `Use ${who}` }));
    }

    it("finds customers by mobile number, lists every match and sends only the saved ids; the gateway fills the details", async () => {
      gateway.people.mockResolvedValue({ results: [ALI, SARA], can_manage: true, can_merge: false });
      gateway.hold.mockResolvedValue({ booking_id: "TRV-1", pnr: "ABC123", selling_total: rs(15_316) });
      renderPage(STAFF_DRAFT);
      const customer = screen.getByRole("region", { name: "Customer" });
      fireEvent.click(within(customer).getByRole("button", { name: "Find" }));
      const dialog = await screen.findByRole("dialog", { name: "Find a saved customer" });
      fireEvent.change(within(dialog).getByLabelText("Mobile number, CNIC, passport, email or name"), { target: { value: "3001234567" } });
      fireEvent.click(within(dialog).getByRole("button", { name: "Search" }));
      const list = await within(dialog).findByRole("list", { name: "Saved people" });
      expect(gateway.people).toHaveBeenCalledWith("3001234567", expect.anything());
      expect(within(list).getAllByRole("button", { name: /^Use / })).toHaveLength(2);
      expect(list).toHaveTextContent("Ali Khan");
      expect(list).toHaveTextContent("+92 •••••••567");
      fireEvent.click(within(list).getByRole("button", { name: "Use Ali Khan" }));

      expect(customer).toHaveTextContent("Ali Khan");
      expect(customer).toHaveTextContent("Passport ••••••567");
      expect(within(customer).queryByLabelText("Email")).not.toBeInTheDocument();
      // The customer is Adult 1: the saved customer becomes the saved traveler (one document, chosen automatically).
      const adult = screen.getByRole("region", { name: "Adult 1" });
      expect(adult).toHaveTextContent("Ali Khan");
      expect(adult).toHaveTextContent("Saved customer");
      expect(within(adult).queryByLabelText("Document number")).not.toBeInTheDocument();
      // The infant: a saved traveler with two documents; one must be chosen.
      const infant = screen.getByRole("region", { name: "Infant 1" });
      gateway.people.mockResolvedValue({ results: [SARA], can_manage: true, can_merge: false });
      await pick(within(infant).getByRole("button", { name: "Use saved traveler, Infant 1" }), "Sara", "Sara Khan");
      fireEvent.click(screen.getByRole("button", { name: "Hold seats" }));
      expect(await within(infant).findByRole("alert")).toHaveTextContent("Choose which saved document travels.");
      expect(gateway.hold).not.toHaveBeenCalled();
      fireEvent.click(within(infant).getByRole("radio", { name: "Passport ••••••222" }));
      fireEvent.click(screen.getByRole("button", { name: "Hold seats" }));

      await waitFor(() => expect(gateway.hold).toHaveBeenCalledOnce());
      const body = gateway.hold.mock.calls[0][0];
      expect(body.customer).toEqual({ customer_id: "p-00000001", save_for_next_time: true });
      expect(body.passengers[0]).toEqual({ type: "ADT", title: "MR", traveler_id: "p-00000001", document_id: "d-00000001", save_for_next_time: true });
      expect(body.passengers[1]).toMatchObject({ type: "INF", traveler_id: "p-00000002", document_id: "d-00000003", travels_with: 0 });
      // No identity value is ever sent with a saved person.
      for (const passenger of body.passengers) for (const field of ["first_name", "last_name", "date_of_birth", "document_number", "document_expiry", "nationality"]) {
        expect(passenger).not.toHaveProperty(field);
      }
    });

    it("Type details instead goes back to the typed form; no match says to type the details", async () => {
      gateway.people.mockResolvedValue({ results: [], can_manage: true, can_merge: false });
      renderPage(STAFF_DRAFT);
      const customer = screen.getByRole("region", { name: "Customer" });
      fireEvent.click(within(customer).getByRole("button", { name: "Find" }));
      const dialog = await screen.findByRole("dialog", { name: "Find a saved customer" });
      fireEvent.change(within(dialog).getByLabelText("Mobile number, CNIC, passport, email or name"), { target: { value: "ab" } });
      fireEvent.click(within(dialog).getByRole("button", { name: "Search" }));
      expect(within(dialog).getByRole("alert")).toHaveTextContent("Type at least 3 characters.");
      expect(gateway.people).not.toHaveBeenCalled();
      fireEvent.change(within(dialog).getByLabelText("Mobile number, CNIC, passport, email or name"), { target: { value: "3009999999" } });
      fireEvent.click(within(dialog).getByRole("button", { name: "Search" }));
      expect(await within(dialog).findByRole("status")).toHaveTextContent("No saved person matches");

      gateway.people.mockResolvedValue({ results: [ALI], can_manage: true, can_merge: false });
      fireEvent.change(within(dialog).getByLabelText("Mobile number, CNIC, passport, email or name"), { target: { value: "Ali" } });
      fireEvent.click(within(dialog).getByRole("button", { name: "Search" }));
      fireEvent.click(await within(dialog).findByRole("button", { name: "Use Ali Khan" }));
      fireEvent.click(within(customer).getByRole("button", { name: "Type details instead" }));
      expect(within(customer).getByLabelText("Email")).toBeInTheDocument();
      expect(customer).not.toHaveTextContent("Saved customer");
    });

    it("a saved customer without phone or email: the gateway's field errors bring those fields back, typed values are sent", async () => {
      gateway.people.mockResolvedValue({ results: [{ ...ALI, phone_masked: undefined, email_masked: undefined }], can_manage: true, can_merge: false });
      gateway.hold.mockRejectedValueOnce(new GatewayError("unavailable", "The saved customer has no phone or email. Add them for this booking.", 422, "contact_incomplete",
        [{ path: ["contact", "phone"], message: "Required." }, { path: ["contact", "email"], message: "Required." }]));
      renderPage(STAFF_DRAFT);
      const customer = screen.getByRole("region", { name: "Customer" });
      await pick(within(customer).getByRole("button", { name: "Find" }), "Ali", "Ali Khan");
      expect(customer).toHaveTextContent("Ali Khan");
      fireEvent.click(screen.getByRole("button", { name: "Hold seats" }));
      expect(await within(customer).findByLabelText("Phone")).toBeInTheDocument();
      type("Phone", "+92 300 1234567", customer);
      type("Email", "ali@example.invalid", customer);
      gateway.hold.mockResolvedValue({ booking_id: "TRV-1", pnr: "ABC123", selling_total: rs(15_316) });
      fireEvent.click(screen.getByRole("button", { name: "Hold seats" }));
      await waitFor(() => expect(gateway.hold).toHaveBeenCalledTimes(2));
      expect(gateway.hold.mock.calls[1][0].customer).toEqual({ customer_id: "p-00000001", phone: "+92 300 1234567", email: "ali@example.invalid", save_for_next_time: true });
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
      expect(within(customer).getAllByText(/Find saved customer|Full name|Phone|Email|Document type|Document number/).map(node => node.textContent))
        .toEqual(["Find saved customer", "Full name", "Phone", "Email", "Document type", "Document number"]);
      expect(screen.getByText(/Passport, ID number and date of birth are never shown in full here/)).toBeInTheDocument();
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
    expect(group).toHaveTextContent("Baggage7+20 kg");
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
