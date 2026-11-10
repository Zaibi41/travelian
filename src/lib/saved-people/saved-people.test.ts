import { describe, expect, it, vi } from "vitest";
import { GatewayError } from "@/lib/gateway/client";
import { addDocument, createPerson, fetchPerson, mergePerson, removeDocument, searchPeople, updatePerson } from "./api";
import { MERGE_REASON_MIN, mergeProblem, peopleErrorMessage, saveStateFrom } from "./states";
import { customersTabPath, personPath } from "./routes";

// Made-up, masked values only.
const SUMMARY = { id: "p-00000001", first_name: "Test", last_name: "Person", birth_year: 1990, phone_masked: "+92 •••••••567", documents: [] };

function gateway(status: number, body: unknown) {
  const fetchImpl = vi.fn(async (_url: string, _init?: RequestInit) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } }));
  return { fetchImpl, options: { baseUrl: "https://gateway.test", accessToken: "test-token", fetchImpl: fetchImpl as unknown as typeof fetch } };
}
const call = (mock: ReturnType<typeof gateway>["fetchImpl"]) => {
  const [url, init] = mock.mock.calls[0];
  return { url: String(url), method: init?.method, body: init?.body ? JSON.parse(String(init.body)) : undefined };
};

describe("saved people API client", () => {
  it("searches with the trimmed query and a limit of 20", async () => {
    const { fetchImpl, options } = gateway(200, { results: [SUMMARY], can_manage: true, can_merge: false });
    const found = await searchPeople("  35202-1234567-1 ", options);
    expect(call(fetchImpl).url).toBe("https://gateway.test/v1/admin/customers?q=35202-1234567-1&limit=20");
    expect(found.can_merge).toBe(false);
  });

  it("uses the right method and path for each action", async () => {
    let g = gateway(200, SUMMARY);
    await fetchPerson("p/1", g.options);
    expect(call(g.fetchImpl)).toMatchObject({ url: "https://gateway.test/v1/admin/customers/p%2F1", method: "GET" });

    g = gateway(201, { person: SUMMARY, outcome: "created" });
    await createPerson({ first_name: "Test", last_name: "Person" }, g.options);
    expect(call(g.fetchImpl)).toMatchObject({ url: "https://gateway.test/v1/admin/customers", method: "POST", body: { first_name: "Test", last_name: "Person" } });

    g = gateway(200, SUMMARY);
    await updatePerson("p-1", { phone: "3001234567" }, g.options);
    expect(call(g.fetchImpl)).toMatchObject({ url: "https://gateway.test/v1/admin/customers/p-1", method: "PATCH", body: { phone: "3001234567" } });

    g = gateway(201, SUMMARY);
    await addDocument("p-1", { id_type: "NATI", document_country: "PAK", document_number: "3520212345671" }, g.options);
    expect(call(g.fetchImpl)).toMatchObject({ url: "https://gateway.test/v1/admin/customers/p-1/documents", method: "POST" });

    g = gateway(200, SUMMARY);
    await removeDocument("p-1", "d-1", g.options);
    expect(call(g.fetchImpl)).toMatchObject({ url: "https://gateway.test/v1/admin/customers/p-1/documents/d-1", method: "DELETE", body: undefined });

    g = gateway(200, SUMMARY);
    await mergePerson("p-1", "p-2", "  Same person twice  ", g.options);
    expect(call(g.fetchImpl)).toMatchObject({ url: "https://gateway.test/v1/admin/customers/p-1/merge", method: "POST", body: { merge_into_person_id: "p-2", reason: "Same person twice" } });
  });

  it("carries the possible duplicate and its code on a 409", async () => {
    const { options } = gateway(409, { detail: "A saved person looks like the same person.", code: "possible_duplicate", possible_duplicate: SUMMARY, reason: "same_phone" });
    const error = await createPerson({ first_name: "Test", last_name: "Person" }, options).catch(e => e);
    expect(error).toBeInstanceOf(GatewayError);
    expect(error.code).toBe("possible_duplicate");
    expect(saveStateFrom(error)).toEqual({ kind: "duplicate", person: SUMMARY, reason: "Same phone" });
  });

  it("reports PATCH and DELETE validation and conflicts like POST", async () => {
    const { options } = gateway(409, { detail: "That person was merged into another record.", code: "person_merged" });
    const error = await updatePerson("p-1", { first_name: "New" }, options).catch(e => e);
    expect([error.status, error.code]).toEqual([409, "person_merged"]);
  });

  it("keeps the 403 code so agency roles get a plain message", async () => {
    const { options } = gateway(403, { detail: "Not back office.", code: "not_allowed" });
    const error = await searchPeople("test", options).catch(e => e);
    expect(error.kind).toBe("forbidden");
    expect(peopleErrorMessage(error)).toBe("Your role can't make this change. A super admin can grant access.");
  });
});

describe("duplicate and conflict states", () => {
  const error = (code: string, status = 409, extra: Record<string, unknown> = {}) => new GatewayError("unavailable", "raw gateway sentence", status, code, [], extra);

  it("turns a possible duplicate into a choice with a plain reason", () => {
    expect(saveStateFrom(error("possible_duplicate", 409, { possible_duplicate: SUMMARY, reason: "same_name_and_birth_date" })))
      .toEqual({ kind: "duplicate", person: SUMMARY, reason: "Same name and date of birth" });
  });

  it("never shows a raw code", () => {
    for (const code of ["document_belongs_to_another_person", "document_already_saved", "person_merged", "same_person", "person_required", "booking_not_found", "something_new"]) {
      const state = saveStateFrom(error(code));
      expect(state.kind).toBe("error");
      if (state.kind === "error") {
        expect(state.message).not.toContain(code);
        expect(state.message).not.toContain("_");
      }
    }
    expect(saveStateFrom(error("document_belongs_to_another_person"))).toEqual({
      kind: "error", message: "This document number is already saved for a different person. Check the number, or open that person instead.",
    });
  });

  it("names the field for validation errors", () => {
    const invalid = new GatewayError("unavailable", "Some details need correcting.", 422, undefined, [{ path: ["document", "document_number"], message: "A Pakistani national ID (CNIC or B-form) is 13 digits." }]);
    expect(peopleErrorMessage(invalid)).toBe("Document number: A Pakistani national ID (CNIC or B-form) is 13 digits.");
  });

  it("a duplicate without a person falls back to a message", () => {
    expect(saveStateFrom(error("possible_duplicate")).kind).toBe("error");
  });
});

describe("merge state", () => {
  it("needs another person and a reason", () => {
    expect(mergeProblem("a", null, "Same person")).toBe("Choose the person to keep.");
    expect(mergeProblem("a", "a", "Same person")).toBe("Choose two different people to merge.");
    expect(mergeProblem("a", "b", " no ")).toBe(`Give a reason of at least ${MERGE_REASON_MIN} characters.`);
    expect(mergeProblem("a", "b", "Same person")).toBeNull();
  });
});

describe("routes", () => {
  it("keeps the search across tabs and encodes person ids", () => {
    expect(customersTabPath({ slug: "travelers", label: "Travelers" }, " khan ")).toBe("/admin/customers/travelers?q=khan");
    expect(customersTabPath({ slug: "", label: "Customers" })).toBe("/admin/customers");
    expect(personPath("a/b")).toBe("/admin/customers/people/a%2Fb");
  });
});
