import { useEffect, useId, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronRight, IdCard, Search } from "lucide-react";
import { Button } from "@/components/admin/ui/button";
import { Input } from "@/components/admin/ui/field";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/admin/ui/dialog";
import { countryName } from "@/data/countries";
import { formatPickedDate } from "@/lib/date-iso";
import { listRecentPeople, searchTravelers, type PersonSummary } from "@/lib/saved-people/api";
import { fullName, ID_TYPE_LABEL } from "@/lib/saved-people/states";

const MIN_CHARS = 2;

/** "Pakistan · Passport AG1316841 · 29 Jun 2000": nationality, first document and date of birth, whatever is saved. */
function travelerLine(person: PersonSummary) {
  const document = person.documents[0];
  return [
    countryName(person.nationality) ?? person.nationality ?? null,
    document ? `${ID_TYPE_LABEL[document.id_type] ?? document.id_type} ${document.document_number}` : null,
    person.date_of_birth ? formatPickedDate(person.date_of_birth) : null,
  ].filter(Boolean).join(" · ");
}

/** The text after a short pause in typing. */
function useSettled(value: string, delay = 250) {
  const [settled, setSettled] = useState(value);
  useEffect(() => {
    const timer = window.setTimeout(() => setSettled(value), delay);
    return () => window.clearTimeout(timer);
  }, [value, delay]);
  return settled;
}

/**
 * #167: "Saved Travelers" on the admin traveler card opens this popup with a search box. Before typing it lists the
 * most recent saved people; from 2 characters it searches saved travelers by name or passport number. Choosing one
 * fills the traveler's details (the form does that) and closes the popup.
 */
export function SavedTravelersDialog({ open, onOpenChange, travelerLabel, typeLabel, onPick }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** "Adult 1": which traveler is being filled. */
  travelerLabel: string;
  /** "Adult", "Child" or "Infant". */
  typeLabel: string;
  onPick: (person: PersonSummary) => void;
}) {
  const searchId = useId();
  const [text, setText] = useState("");
  const query = useSettled(text.trim());
  const searching = query.length >= MIN_CHARS;
  useEffect(() => { if (!open) setText(""); }, [open]);

  const recent = useQuery({
    queryKey: ["saved-people", "recent"],
    queryFn: ({ signal }) => listRecentPeople({ signal }),
    enabled: open && !searching,
    staleTime: 30_000,
  });
  const found = useQuery({
    queryKey: ["saved-people", "typeahead", "traveler", query],
    queryFn: ({ signal }) => searchTravelers(query, { signal }),
    enabled: open && searching,
    staleTime: 30_000,
  });
  const current = searching ? found : recent;
  const people = current.data?.results ?? [];
  const count = people.length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Pick from Saved Travelers</DialogTitle>
          <DialogDescription className="sr-only">Search saved travelers by name or passport number and choose one for {travelerLabel}.</DialogDescription>
        </DialogHeader>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <label htmlFor={searchId} className="sr-only">Search saved travelers</label>
          <Input id={searchId} autoFocus value={text} maxLength={64} autoComplete="off" className="pl-9"
            placeholder="Search by name or passport number..." onChange={event => setText(event.target.value)} />
        </div>
        <div className="flex items-center justify-between gap-2 text-label text-muted-foreground">
          <span>{typeLabel}</span>
          <span role="status">{current.isPending ? "Searching…" : current.isError ? "" : `Found ${count} traveler${count === 1 ? "" : "s"}`}</span>
        </div>
        <div className="min-h-24 border-t border-border">
          {current.isPending ? (
            <p className="px-1 py-4 text-body text-muted-foreground">Loading saved travelers…</p>
          ) : current.isError ? (
            <p role="alert" className="px-1 py-4 text-body text-status-critical-text">Saved travelers can't be loaded right now. Type the details on the form instead.</p>
          ) : count === 0 ? (
            <p className="px-1 py-4 text-body text-muted-foreground">
              {searching ? "No saved traveler matches. Type the details on the form instead." : "No saved travelers yet."}
            </p>
          ) : (
            <ul aria-label="Saved travelers" className="flex flex-col divide-y divide-border">
              {people.map(person => {
                const line = travelerLine(person);
                return (
                  <li key={person.id}>
                    <button type="button" onClick={() => { onPick(person); onOpenChange(false); }}
                      className="flex min-h-11 w-full min-w-0 items-center gap-3 rounded-md px-1 py-3 text-left hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                      <IdCard className="h-5 w-5 shrink-0 text-brand-navy" aria-hidden="true" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-body font-semibold text-foreground" title={fullName(person)}>{fullName(person)}</span>
                        {line && <span className="block truncate text-label text-muted-foreground" title={line}>{line}</span>}
                      </span>
                      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
