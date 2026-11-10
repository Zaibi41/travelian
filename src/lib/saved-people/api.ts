// Saved customers and travelers (Customers & Travelers screen). Data: travelian-api-gateway
// /v1/admin/customers only. Every value the gateway returns is already masked; permissions
// (can_manage, can_merge) come from the response, never from the browser.

import { gatewayDelete, gatewayGet, gatewayPatch, gatewayPost, type GatewayOptions } from "@/lib/gateway/client";
import type { components } from "@/lib/gateway/schema";

type Schemas = components["schemas"];
export type PersonSummary = Schemas["SavedPersonSummary"];
export type PersonDetail = Schemas["SavedPersonDetail"];
export type PersonSearch = Schemas["SavedPersonSearch"];
export type SavedDocument = Schemas["SavedDocument"];
export type PersonCreate = Schemas["SavedPersonCreate"];
export type PersonUpdate = Schemas["SavedPersonUpdate"];
export type PersonCreated = Schemas["SavedPersonCreated"];
export type DocumentInput = Schemas["DocumentInput"];
export type DuplicateChoice = Schemas["DuplicateChoice"];

/** The gateway refuses shorter searches (422). */
export const MIN_SEARCH_LENGTH = 3;

const person = (personId: string, options?: GatewayOptions): GatewayOptions => ({ ...options, pathParams: { ...options?.pathParams, person_id: personId } });

export const searchPeople = (q: string, options?: GatewayOptions) =>
  gatewayGet("/v1/admin/customers", { q: q.trim(), limit: 20 }, options);

export const fetchPerson = (personId: string, options?: GatewayOptions) =>
  gatewayGet("/v1/admin/customers/{person_id}", undefined, person(personId, options));

export const createPerson = (body: PersonCreate, options?: GatewayOptions) =>
  gatewayPost("/v1/admin/customers", body, options) as Promise<PersonCreated>;

export const updatePerson = (personId: string, body: PersonUpdate, options?: GatewayOptions) =>
  gatewayPatch("/v1/admin/customers/{person_id}", body, person(personId, options));

export const addDocument = (personId: string, body: DocumentInput, options?: GatewayOptions) =>
  gatewayPost("/v1/admin/customers/{person_id}/documents", body, person(personId, options)) as Promise<PersonDetail>;

export const removeDocument = (personId: string, documentId: string, options?: GatewayOptions) =>
  gatewayDelete("/v1/admin/customers/{person_id}/documents/{document_id}", person(personId, { ...options, pathParams: { document_id: documentId } }));

export const mergePerson = (personId: string, mergeIntoPersonId: string, reason: string, options?: GatewayOptions) =>
  gatewayPost("/v1/admin/customers/{person_id}/merge", { merge_into_person_id: mergeIntoPersonId, reason: reason.trim() }, person(personId, options));
