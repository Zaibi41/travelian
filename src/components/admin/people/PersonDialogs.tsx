import { useEffect, useState } from "react";
import { formatDay } from "@/lib/admin-search/date-display";
import { useQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";
import { Button } from "@/components/admin/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/admin/ui/dialog";
import { Input } from "@/components/admin/ui/field";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/admin/ui/field";
import { CountrySelect } from "@/components/admin/search/CountrySelect";
import { DEFAULT_COUNTRY_CODE } from "@/data/countries";
import { cn } from "@/lib/utils";
import {
  MIN_SEARCH_LENGTH, addDocument, createPerson, editDocument, mergePerson, searchPeople, updatePerson,
  type DocumentInput, type PersonCreate, type PersonCreated, type PersonDetail, type PersonSummary, type PersonUpdate, type SavedDocument,
} from "@/lib/saved-people/api";
import { ID_TYPE_LABEL, TITLE_LABEL, fullName, mergeProblem, peopleErrorMessage, saveStateFrom, type SaveState } from "@/lib/saved-people/states";
import { SavedDocuments } from "./SavedDocuments";
import { DatePickerField } from "@/components/ui/date-picker-field";
import { todayIso } from "@/lib/date-iso";

// Dialogs for Customers & Travelers. Values shown are the gateway's, in full;
// the gateway checks every rule again (duplicates, document numbers, permissions).

const DIALOG = "flex max-h-[85vh] w-[calc(100%-2rem)] max-w-lg flex-col gap-3 overflow-hidden";
const BODY = "-mx-1 flex min-h-0 flex-col gap-3 overflow-y-auto px-1 pb-1";
type Title = NonNullable<PersonCreate["title"]>;
const TITLES: Title[] = ["MR", "MRS", "MASTER", "MISS"];  // #11 order (Ms isn't stored separately yet)
const NONE = "none";

function Field({ id, label, children, className }: { id: string; label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("flex min-w-0 flex-col gap-1", className)}>
      <label htmlFor={id} className="text-label font-medium text-muted-foreground">{label}</label>
      {children}
    </div>
  );
}

function ErrorText({ message }: { message: string | null }) {
  return message ? <p role="alert" className="text-body text-status-critical-text">{message}</p> : null;
}

const optional = (value: string) => value.trim() || undefined;

// ---------- document fields (shared by add person and attach document) ----------

interface DocumentDraft {
  id_type: DocumentInput["id_type"];
  document_country: string;
  document_number: string;
  document_expiry: string;
}

const blankDocument = (): DocumentDraft => ({ id_type: "PSPT", document_country: DEFAULT_COUNTRY_CODE, document_number: "", document_expiry: "" });

const documentBody = (draft: DocumentDraft): DocumentInput => ({
  id_type: draft.id_type, document_country: draft.document_country, document_number: draft.document_number.trim(),
  document_expiry: optional(draft.document_expiry) ?? null,
});

function DocumentFields({ prefix, draft, onChange }: { prefix: string; draft: DocumentDraft; onChange: (next: DocumentDraft) => void }) {
  const set = (patch: Partial<DocumentDraft>) => onChange({ ...draft, ...patch });
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <Field id={`${prefix}-type`} label="Document type">
        <Select value={draft.id_type} onValueChange={value => set({ id_type: value as DocumentDraft["id_type"] })}>
          <SelectTrigger id={`${prefix}-type`} className="h-control text-body"><SelectValue /></SelectTrigger>
          <SelectContent>
            {(["PSPT", "NATI"] as const).map(type => <SelectItem key={type} value={type} className="text-body">{ID_TYPE_LABEL[type]}</SelectItem>)}
          </SelectContent>
        </Select>
      </Field>
      <Field id={`${prefix}-country`} label="Document country">
        <CountrySelect id={`${prefix}-country`} value={draft.document_country} onChange={code => set({ document_country: code })} />
      </Field>
      <Field id={`${prefix}-number`} label="Document number">
        <Input id={`${prefix}-number`} value={draft.document_number} maxLength={20} autoComplete="off" className="h-control text-body"
          onChange={event => set({ document_number: event.target.value })} />
      </Field>
      <Field id={`${prefix}-expiry`} label={draft.id_type === "PSPT" ? "Document expiry" : "Document expiry (optional)"}>
        <DatePickerField id={`${prefix}-expiry`} appearance="admin" value={draft.document_expiry} placeholder="Select expiry date"
          onChange={value => set({ document_expiry: value ?? "" })} />
      </Field>
    </div>
  );
}

// ---------- possible duplicate ----------

export function DuplicateNotice({ state, busy, onChoose, onBack }: {
  state: Extract<SaveState, { kind: "duplicate" }>;
  busy: boolean;
  onChoose: (choice: "add_to_existing" | "keep_separate") => void;
  onBack: () => void;
}) {
  const person = state.person;
  return (
    <section aria-label="Possible duplicate" className="flex flex-col gap-3">
      <div role="status" className="flex flex-col gap-2 rounded-xl border border-border border-l-[length:var(--status-stripe)] border-l-status-action bg-card px-card py-3">
        <p className="text-body font-semibold text-foreground">Possible duplicate: {state.reason}</p>
        <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-1 text-body">
          <dt className="text-muted-foreground">Name</dt><dd className="truncate text-foreground" title={fullName(person)}>{fullName(person)}</dd>
          <dt className="text-muted-foreground">Date of birth</dt><dd className="text-foreground">{formatDay(person.date_of_birth) || "—"}</dd>
          <dt className="text-muted-foreground">Phone</dt><dd className="truncate text-foreground">{person.phone ?? "—"}</dd>
          <dt className="text-muted-foreground">Email</dt><dd className="truncate text-foreground">{person.email ?? "—"}</dd>
        </dl>
        <SavedDocuments documents={person.documents ?? []} />
      </div>
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button type="button" variant="ghost" disabled={busy} onClick={onBack}>Back</Button>
        <Button type="button" variant="outline" disabled={busy} onClick={() => onChoose("keep_separate")}>Keep separate</Button>
        <Button type="button" disabled={busy} onClick={() => onChoose("add_to_existing")}>Add to this person</Button>
      </div>
    </section>
  );
}

// ---------- add or edit a person ----------

interface PersonDraft {
  title: string;
  first_name: string;
  last_name: string;
  date_of_birth: string;
  nationality: string;
  phone_code: string;
  phone: string;
  email: string;
}

function draftFrom(person?: PersonSummary): PersonDraft {
  return {
    title: person?.title ?? NONE, first_name: person?.first_name ?? "", last_name: person?.last_name ?? "", date_of_birth: person?.date_of_birth ?? "",
    nationality: person?.nationality ?? "", phone_code: person ? "" : "92", phone: "", email: person?.email ?? "",
  };
}

export function createBody(draft: PersonDraft, document: DocumentDraft | null): PersonCreate {
  return {
    title: draft.title === NONE ? null : (draft.title as Title), first_name: draft.first_name.trim(), last_name: draft.last_name.trim(),
    date_of_birth: optional(draft.date_of_birth) ?? null, nationality: optional(draft.nationality) ?? null,
    phone_code: draft.phone.trim() ? optional(draft.phone_code) ?? null : null, phone: optional(draft.phone) ?? null,
    email: optional(draft.email) ?? null, document: document && document.document_number.trim() ? documentBody(document) : null,
  };
}

/** Edit sends only what changed; a blank date of birth, phone or email keeps the saved value. */
export function updateBody(draft: PersonDraft, person: PersonSummary): PersonUpdate {
  const body: PersonUpdate = {};
  const title = draft.title === NONE ? null : (draft.title as Title);
  if (title !== (person.title ?? null)) body.title = title;
  if (draft.first_name.trim() !== person.first_name) body.first_name = draft.first_name.trim();
  if (draft.last_name.trim() !== person.last_name) body.last_name = draft.last_name.trim();
  if ((optional(draft.nationality) ?? null) !== (person.nationality ?? null)) body.nationality = optional(draft.nationality) ?? null;
  if (optional(draft.date_of_birth) && draft.date_of_birth !== person.date_of_birth) body.date_of_birth = draft.date_of_birth;
  if (optional(draft.phone)) {
    body.phone = draft.phone.trim();
    if (optional(draft.phone_code)) body.phone_code = draft.phone_code.trim();
  }
  if (optional(draft.email) && draft.email.trim() !== person.email) body.email = draft.email.trim();
  return body;
}

export const CREATED_MESSAGE: Record<PersonCreated["outcome"], string> = {
  created: "Person saved.",
  existing: "This person is already saved with that document.",
  added_to_existing: "Details added to the saved person.",
};

export function PersonFormDialog({ open, onOpenChange, person, onSaved }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Edit this person; omit to add a new one. */
  person?: PersonSummary;
  onSaved: (personId: string, message: string) => void;
}) {
  const editing = Boolean(person);
  const [draft, setDraft] = useState<PersonDraft>(() => draftFrom(person));
  const [document, setDocument] = useState<DocumentDraft>(blankDocument);
  const [state, setState] = useState<SaveState | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) {
      setDraft(draftFrom(person));
      setDocument(blankDocument());
      setState(null);
    }
  }, [open, person]);

  const set = (patch: Partial<PersonDraft>) => setDraft(current => ({ ...current, ...patch }));
  const id = (name: string) => `person-${name}`;

  async function save(choice?: "add_to_existing" | "keep_separate") {
    setBusy(true);
    try {
      if (person) {
        await updatePerson(person.id, updateBody(draft, person));
        onSaved(person.id, "Changes saved.");
      } else {
        const body = createBody(draft, document);
        if (choice && state?.kind === "duplicate") body.duplicate_choice = { choice, person_id: state.person.id };
        const created = await createPerson(body);
        onSaved(created.person.id, CREATED_MESSAGE[created.outcome]);
      }
    } catch (error) {
      setState(person ? { kind: "error", message: peopleErrorMessage(error, "The changes couldn't be saved. Try again in a moment.") } : saveStateFrom(error));
    } finally {
      setBusy(false);
    }
  }

  const missing = !draft.first_name.trim() || !draft.last_name.trim();
  return (
    <Dialog open={open} onOpenChange={next => !busy && onOpenChange(next)}>
      <DialogContent className={DIALOG}>
        <DialogHeader>
          <DialogTitle>{editing ? "Edit person" : "Add Customer"}</DialogTitle>
          {editing && person && <DialogDescription className="truncate">{fullName(person)}</DialogDescription>}
        </DialogHeader>
        {state?.kind === "duplicate" ? (
          <DuplicateNotice state={state} busy={busy} onChoose={choice => void save(choice)} onBack={() => setState(null)} />
        ) : (
          <form
            className="flex min-h-0 flex-col gap-3"
            onSubmit={event => {
              event.preventDefault();
              if (!missing) void save();
            }}
          >
            <div className={BODY}>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-[8rem_minmax(0,1fr)_minmax(0,1fr)]">
                <Field id={id("title")} label="Title">
                  <Select value={draft.title} onValueChange={value => set({ title: value })}>
                    <SelectTrigger id={id("title")} className="h-control text-body"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NONE} className="text-body">—</SelectItem>
                      {TITLES.map(title => <SelectItem key={title} value={title} className="text-body">{TITLE_LABEL[title]}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </Field>
                <Field id={id("first")} label="First name">
                  <Input id={id("first")} value={draft.first_name} maxLength={25} required className="h-control text-body" onChange={event => set({ first_name: event.target.value })} />
                </Field>
                <Field id={id("last")} label="Last name">
                  <Input id={id("last")} value={draft.last_name} maxLength={25} required className="h-control text-body" onChange={event => set({ last_name: event.target.value })} />
                </Field>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Field id={id("dob")} label="Date of birth">
                  <DatePickerField id={id("dob")} appearance="admin" value={draft.date_of_birth} max={todayIso()} placeholder="Select date of birth" onChange={value => set({ date_of_birth: value ?? "" })} />
                </Field>
                <Field id={id("nationality")} label="Nationality">
                  <CountrySelect id={id("nationality")} value={draft.nationality} onChange={code => set({ nationality: code })} />
                </Field>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-[6rem_minmax(0,1fr)]">
                <Field id={id("phone-code")} label="Country code">
                  <Input id={id("phone-code")} inputMode="numeric" value={draft.phone_code} maxLength={4} className="h-control text-body"
                    onChange={event => set({ phone_code: event.target.value.replace(/\D/g, "") })} />
                </Field>
                <Field id={id("phone")} label="Phone">
                  <Input id={id("phone")} inputMode="numeric" value={draft.phone} maxLength={10} placeholder={person?.phone ?? undefined}
                    className="h-control text-body" onChange={event => set({ phone: event.target.value.replace(/\D/g, "") })} />
                </Field>
              </div>
              <Field id={id("email")} label="Email">
                <Input id={id("email")} type="email" value={draft.email} maxLength={50} placeholder={person?.email ?? undefined}
                  className="h-control text-body" onChange={event => set({ email: event.target.value })} />
              </Field>
              {!editing && (
                <fieldset className="flex flex-col gap-2 border-t border-border pt-3">
                  <legend className="text-body font-semibold text-foreground">Document (optional)</legend>
                  <DocumentFields prefix="person-document" draft={document} onChange={setDocument} />
                </fieldset>
              )}
              <ErrorText message={state?.kind === "error" ? state.message : null} />
            </div>
            <DialogFooter className="gap-2">
              <Button type="button" variant="outline" disabled={busy} onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button type="submit" disabled={busy || missing}>{busy ? "Saving…" : "Save"}</Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ---------- attach a document ----------

/** Attach a document, or (with `document`, issue #12) edit a saved one: number, country of issue, expiry. */
export function DocumentDialog({ open, onOpenChange, person, onSaved, document }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  person: PersonSummary;
  onSaved: (detail: PersonDetail) => void;
  document?: SavedDocument | null;
}) {
  const fromDocument = (): DocumentDraft => document
    ? { id_type: document.id_type, document_country: document.document_country, document_number: document.document_number, document_expiry: document.document_expiry ?? "" }
    : blankDocument();
  const [draft, setDraft] = useState<DocumentDraft>(fromDocument);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (open) {
      setDraft(fromDocument());
      setError(null);
    }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  async function save() {
    setBusy(true);
    setError(null);
    try {
      onSaved(document ? await editDocument(person.id, document.id, documentBody(draft)) : await addDocument(person.id, documentBody(draft)));
    } catch (failure) {
      setError(peopleErrorMessage(failure, "The document couldn't be saved. Try again in a moment."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={next => !busy && onOpenChange(next)}>
      <DialogContent className={DIALOG}>
        <DialogHeader>
          <DialogTitle>{document ? "Edit document" : "Attach document"}</DialogTitle>
          <DialogDescription>{document
            ? `${fullName(person)}. A new number (for example a renewed passport) replaces this document for new bookings; past bookings keep the old one.`
            : fullName(person)}</DialogDescription>
        </DialogHeader>
        <form className="flex min-h-0 flex-col gap-3" onSubmit={event => { event.preventDefault(); void save(); }}>
          <div className={BODY}>
            <DocumentFields prefix="attach-document" draft={draft} onChange={setDraft} />
            <ErrorText message={error} />
          </div>
          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" disabled={busy} onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={busy || !draft.document_number.trim()}>{busy ? "Saving…" : "Save document"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ---------- merge ----------

export function MergeDialog({ open, onOpenChange, source, onMerged }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The duplicate record; it is merged into the person chosen here. */
  source: PersonSummary;
  onMerged: (keptPersonId: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [submitted, setSubmitted] = useState("");
  const [target, setTarget] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (open) {
      setQuery("");
      setSubmitted("");
      setTarget(null);
      setReason("");
      setError(null);
    }
  }, [open]);

  const results = useQuery({
    queryKey: ["saved-people", "merge-search", submitted],
    queryFn: ({ signal }) => searchPeople(submitted, { signal }),
    enabled: open && submitted.length >= MIN_SEARCH_LENGTH,
    retry: false,
  });
  const candidates = (results.data?.results ?? []).filter(person => person.id !== source.id);

  async function merge() {
    const problem = mergeProblem(source.id, target, reason);
    if (problem || !target) {
      setError(problem);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await mergePerson(source.id, target, reason);
      onMerged(target);
    } catch (failure) {
      setError(peopleErrorMessage(failure, "The merge didn't go through. Nothing was changed."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={next => !busy && onOpenChange(next)}>
      <DialogContent className={DIALOG}>
        <DialogHeader>
          <DialogTitle>Merge duplicates</DialogTitle>
          <DialogDescription>
            <span className="font-medium text-foreground">{fullName(source)}</span> is merged into the person you keep. Its documents and bookings move to that person.
          </DialogDescription>
        </DialogHeader>
        <div className={BODY}>
          <form
            role="search"
            className="flex min-w-0 flex-col gap-1"
            onSubmit={event => {
              event.preventDefault();
              setSubmitted(query.trim());
              setTarget(null);
            }}
          >
            <label htmlFor="merge-search" className="text-label font-medium text-muted-foreground">Person to keep</label>
            <div className="flex gap-2">
              <div className="relative min-w-0 flex-1">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
                <Input id="merge-search" value={query} maxLength={64} onChange={event => setQuery(event.target.value)}
                  placeholder="CNIC, passport, phone, email or name" className="h-control pl-8 text-body" />
              </div>
              <Button type="submit" variant="outline" disabled={query.trim().length < MIN_SEARCH_LENGTH}>Search</Button>
            </div>
          </form>
          {results.isFetching && <p className="text-body text-muted-foreground">Searching…</p>}
          {results.error && <ErrorText message={peopleErrorMessage(results.error, "Search didn't work. Try again in a moment.")} />}
          {results.data && candidates.length === 0 && <p className="text-body text-muted-foreground">No other saved person matches.</p>}
          {candidates.length > 0 && (
            <fieldset className="flex flex-col gap-1.5">
              <legend className="sr-only">Person to keep</legend>
              {candidates.map(person => (
                <label key={person.id} className={cn("flex min-w-0 cursor-pointer items-start gap-2.5 rounded-md border border-border px-3 py-2",
                  target === person.id && "border-brand-navy bg-accent/40")}>
                  <input type="radio" name="merge-target" value={person.id} checked={target === person.id} onChange={() => setTarget(person.id)} className="mt-1" />
                  <span className="flex min-w-0 flex-col">
                    <span className="truncate text-body font-medium text-foreground" title={fullName(person)}>{fullName(person)}</span>
                    <span className="truncate text-label text-muted-foreground">
                      {[formatDay(person.date_of_birth), person.phone, person.email].filter(Boolean).join(" · ") || "No contact details"}
                    </span>
                  </span>
                </label>
              ))}
            </fieldset>
          )}
          <div className="flex flex-col gap-1">
            <label htmlFor="merge-reason" className="text-label font-medium text-muted-foreground">Reason</label>
            <Textarea id="merge-reason" value={reason} maxLength={500} rows={3} className="text-body" onChange={event => setReason(event.target.value)} />
          </div>
          <ErrorText message={error} />
        </div>
        <DialogFooter className="gap-2">
          <Button type="button" variant="outline" disabled={busy} onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button type="button" disabled={busy || Boolean(mergeProblem(source.id, target, reason))} onClick={() => void merge()}>
            {busy ? "Merging…" : "Merge"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
