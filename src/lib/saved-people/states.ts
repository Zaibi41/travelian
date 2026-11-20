// Plain-language outcomes for the Customers & Travelers screen: gateway error codes become
// sentences (never raw codes, env names or supplier names), and the duplicate and merge
// states are decided here so the dialogs and their tests share one rule.

import { GatewayError } from "@/lib/gateway/client";
import type { PersonSummary } from "./api";

const MESSAGES: Record<string, string> = {
  document_belongs_to_another_person: "This document number is already saved for a different person. Check the number, or open that person instead.",
  document_already_saved: "This document is already saved for this person.",
  document_not_found: "That document wasn't found. It may have been removed already.",
  person_not_found: "This person wasn't found. They may have been merged into another record.",
  person_merged: "This person was merged into another record. Open the other record instead.",
  person_required: "Choose the saved person to add these details to.",
  same_person: "Choose two different people to merge.",
  not_allowed: "Your role can't make this change. A super admin can grant access.",
};

const FIELD_LABELS: Record<string, string> = {
  first_name: "First name", last_name: "Last name", date_of_birth: "Date of birth", nationality: "Nationality", phone_code: "Country code",
  phone: "Phone", email: "Email", document_number: "Document number", document_country: "Document country", document_expiry: "Document expiry",
  reason: "Reason", title: "Title",
};

/** One sentence for a failed request. */
export function peopleErrorMessage(error: unknown, fallback = "That didn't work. Try again in a moment."): string {
  if (!(error instanceof GatewayError)) return fallback;
  if (error.code && MESSAGES[error.code]) return MESSAGES[error.code];
  if (error.kind === "forbidden") return MESSAGES.not_allowed;
  if (error.kind === "unauthorized") return "Your session has expired. Sign in again.";
  if (error.status === 422 && error.fieldErrors.length) {
    return error.fieldErrors.map(field => {
      const name = field.path.filter((part): part is string => typeof part === "string").pop();
      return `${(name && FIELD_LABELS[name]) || "A field"}: ${field.message}`;
    }).join(" ");
  }
  if (error.status === 422) return "Some details need correcting.";
  if (error.kind === "unavailable" && !error.status) return "The admin service can't be reached. Try again when it's back.";
  return fallback;
}

/** What saving a new person led to. */
export type SaveState =
  | { kind: "duplicate"; person: PersonSummary; reason: string }
  | { kind: "error"; message: string };

const DUPLICATE_REASON: Record<string, string> = {
  same_name_and_birth_date: "Same name and date of birth",
  same_email: "Same email",
  same_phone: "Same phone",
};

/** A possible duplicate (409 possible_duplicate) becomes a choice; anything else is a message. */
export function saveStateFrom(error: unknown): SaveState {
  if (error instanceof GatewayError && error.code === "possible_duplicate") {
    const person = error.extra.possible_duplicate as PersonSummary | undefined;
    const reason = typeof error.extra.reason === "string" ? error.extra.reason : "";
    if (person && typeof person === "object" && typeof person.id === "string") {
      return { kind: "duplicate", person, reason: DUPLICATE_REASON[reason] ?? "Looks like the same person" };
    }
  }
  return { kind: "error", message: peopleErrorMessage(error, "The person couldn't be saved. Try again in a moment.") };
}

export const MERGE_REASON_MIN = 5;

/** Merge needs another person and a reason of at least 5 characters (the gateway checks the same). */
export function mergeProblem(sourceId: string, targetId: string | null, reason: string): string | null {
  if (!targetId) return "Choose the person to keep.";
  if (targetId === sourceId) return "Choose two different people to merge.";
  if (reason.trim().length < MERGE_REASON_MIN) return `Give a reason of at least ${MERGE_REASON_MIN} characters.`;
  return null;
}

export function fullName(person: { title?: string | null; first_name: string; last_name: string }) {
  return [person.first_name, person.last_name].filter(Boolean).join(" ");
}

export const ID_TYPE_LABEL: Record<string, string> = { PSPT: "Passport", NATI: "National ID" };
export const VALIDITY_LABEL: Record<string, string> = { valid: "Valid", expiring: "Expiring within 6 months", expired: "Expired" };
export const TITLE_LABEL: Record<string, string> = { MR: "Mr", MRS: "Mrs", MS: "Ms", MASTER: "Mstr", MISS: "Miss" };
