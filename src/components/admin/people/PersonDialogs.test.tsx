import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GatewayError } from "@/lib/gateway/client";

// Made-up values.
const SAVED = { id: "p-00000001", first_name: "Test", last_name: "Person", date_of_birth: "1990-01-31", phone: "+92 3001234567", email: "test@example.invalid",
  documents: [{ id: "d-1", id_type: "PSPT", document_country: "PAK", document_number: "AB1234567", document_expiry: "2031-01-01", document_validity: "valid" }] };
const OTHER = { ...SAVED, id: "p-00000002", first_name: "Test", last_name: "Persons", documents: [] };

const createPerson = vi.fn();
const mergePerson = vi.fn();
const searchPeople = vi.fn();
vi.mock("@/lib/saved-people/api", async importOriginal => ({
  ...(await importOriginal<typeof import("@/lib/saved-people/api")>()),
  createPerson: (...args: unknown[]) => createPerson(...args),
  mergePerson: (...args: unknown[]) => mergePerson(...args),
  searchPeople: (...args: unknown[]) => searchPeople(...args),
}));

import { MergeDialog, PersonFormDialog, createBody, updateBody } from "./PersonDialogs";

const wrap = (node: React.ReactNode) => render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>{node}</QueryClientProvider>);

beforeEach(() => {
  createPerson.mockReset();
  mergePerson.mockReset();
  searchPeople.mockReset();
});

describe("Add Customer: possible duplicate", () => {
  it("shows the match in full and resends with the chosen option", async () => {
    createPerson
      .mockRejectedValueOnce(new GatewayError("unavailable", "raw", 409, "possible_duplicate", [], { possible_duplicate: SAVED, reason: "same_name_and_birth_date" }))
      .mockResolvedValueOnce({ person: SAVED, outcome: "added_to_existing" });
    const onSaved = vi.fn();
    wrap(<PersonFormDialog open onOpenChange={() => undefined} onSaved={onSaved} />);
    fireEvent.change(screen.getByLabelText("First name"), { target: { value: "Test" } });
    fireEvent.change(screen.getByLabelText("Last name"), { target: { value: "Person" } });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    const notice = await screen.findByRole("region", { name: "Possible duplicate" });
    expect(notice).toHaveTextContent("Possible duplicate: Same name and date of birth");
    expect(notice).toHaveTextContent("AB1234567");
    expect(notice).not.toHaveTextContent("possible_duplicate");
    fireEvent.click(screen.getByRole("button", { name: "Add to this person" }));
    await waitFor(() => expect(onSaved).toHaveBeenCalledWith("p-00000001", "Details added to the saved person."));
    expect(createPerson.mock.calls[1][0].duplicate_choice).toEqual({ choice: "add_to_existing", person_id: "p-00000001" });
  });

  it("keep separate sends that choice; Back returns to the form", async () => {
    const duplicate = new GatewayError("unavailable", "raw", 409, "possible_duplicate", [], { possible_duplicate: SAVED, reason: "same_email" });
    createPerson.mockRejectedValueOnce(duplicate).mockRejectedValueOnce(duplicate).mockResolvedValueOnce({ person: OTHER, outcome: "created" });
    const onSaved = vi.fn();
    wrap(<PersonFormDialog open onOpenChange={() => undefined} onSaved={onSaved} />);
    fireEvent.change(screen.getByLabelText("First name"), { target: { value: "Test" } });
    fireEvent.change(screen.getByLabelText("Last name"), { target: { value: "Persons" } });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    fireEvent.click(await screen.findByRole("button", { name: "Back" }));
    expect(screen.getByLabelText("First name")).toHaveValue("Test");
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    fireEvent.click(await screen.findByRole("button", { name: "Keep separate" }));
    await waitFor(() => expect(onSaved).toHaveBeenCalledWith("p-00000002", "Person saved."));
    expect(createPerson.mock.calls[2][0].duplicate_choice).toEqual({ choice: "keep_separate", person_id: "p-00000001" });
  });

  it("a document conflict is a plain message, not a choice", async () => {
    createPerson.mockRejectedValueOnce(new GatewayError("unavailable", "raw", 409, "document_belongs_to_another_person"));
    wrap(<PersonFormDialog open onOpenChange={() => undefined} onSaved={vi.fn()} />);
    fireEvent.change(screen.getByLabelText("First name"), { target: { value: "Test" } });
    fireEvent.change(screen.getByLabelText("Last name"), { target: { value: "Person" } });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("already saved for a different person");
    expect(screen.queryByRole("region", { name: "Possible duplicate" })).toBeNull();
  });
});

describe("request bodies", () => {
  const draft = { title: "MR", first_name: " Test ", last_name: "Person", date_of_birth: "", nationality: "PAK", phone_code: "92", phone: "", email: "" };

  it("create leaves out the country code without a phone and the document without a number", () => {
    expect(createBody(draft, { id_type: "PSPT", document_country: "PAK", document_number: " ", document_expiry: "", document_issue_date: "" })).toEqual({
      title: "MR", first_name: "Test", last_name: "Person", date_of_birth: null, nationality: "PAK", phone_code: null, phone: null, email: null, document: null,
    });
  });

  it("edit sends only changed fields; blank or unchanged date of birth and email keep the saved value", () => {
    expect(updateBody({ ...draft, first_name: "Test", phone: "3001234567", phone_code: "" }, { ...SAVED, title: "MR", nationality: "PAK" } as never)).toEqual({ phone: "3001234567" });
  });
});

describe("Merge duplicates", () => {
  it("needs a person to keep and a reason, then merges into that person", async () => {
    searchPeople.mockResolvedValue({ results: [SAVED, OTHER], can_manage: true, can_merge: true });
    mergePerson.mockResolvedValue(OTHER);
    const onMerged = vi.fn();
    wrap(<MergeDialog open source={SAVED as never} onOpenChange={() => undefined} onMerged={onMerged} />);
    const merge = screen.getByRole("button", { name: "Merge" });
    expect(merge).toBeDisabled();
    fireEvent.change(screen.getByLabelText("Person to keep"), { target: { value: "test" } });
    fireEvent.click(screen.getByRole("button", { name: "Search" }));
    const option = await screen.findByRole("radio");                       // the source itself is not offered
    expect(screen.getAllByRole("radio")).toHaveLength(1);
    fireEvent.click(option);
    expect(merge).toBeDisabled();
    fireEvent.change(screen.getByLabelText("Reason"), { target: { value: "Same person, two records" } });
    expect(merge).toBeEnabled();
    fireEvent.click(merge);
    await waitFor(() => expect(onMerged).toHaveBeenCalledWith("p-00000002"));
    expect(mergePerson).toHaveBeenCalledWith("p-00000001", "p-00000002", "Same person, two records");
  });

  it("shows a plain message when the gateway refuses", async () => {
    searchPeople.mockResolvedValue({ results: [OTHER], can_manage: true, can_merge: true });
    mergePerson.mockRejectedValue(new GatewayError("unavailable", "raw", 409, "person_merged"));
    wrap(<MergeDialog open source={SAVED as never} onOpenChange={() => undefined} onMerged={vi.fn()} />);
    fireEvent.change(screen.getByLabelText("Person to keep"), { target: { value: "test" } });
    fireEvent.click(screen.getByRole("button", { name: "Search" }));
    fireEvent.click(await screen.findByRole("radio"));
    fireEvent.change(screen.getByLabelText("Reason"), { target: { value: "Same person" } });
    fireEvent.click(screen.getByRole("button", { name: "Merge" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("This person was merged into another record.");
  });
});
