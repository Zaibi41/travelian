import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";
import { Button } from "@/components/admin/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/admin/ui/dialog";
import { Input } from "@/components/admin/ui/field";
import { Notice } from "@/components/admin/ui/feedback";
import { Skeleton } from "@/components/ui/skeleton";
import { MaskedDocuments } from "./MaskedDocuments";
import { MIN_SEARCH_LENGTH, searchPeople, type PersonSummary } from "@/lib/saved-people/api";
import { fullName, peopleErrorMessage } from "@/lib/saved-people/states";

/**
 * Find a saved customer or traveler by mobile number, CNIC, passport, email or name (the gateway's
 * search, at least 3 characters) and pick one. Everything shown is masked by the gateway; the
 * booking form then sends only the person's id and the gateway fills in the details itself.
 */
export function SavedPersonPicker({ open, title, description, suggested = [], initialQuery, onPick, onClose }: {
  open: boolean; title: string; description: string; suggested?: PersonSummary[];
  /** Typed outside the dialog (e.g. the customer card's search field): searched as soon as it opens. */
  initialQuery?: string;
  onPick: (person: PersonSummary) => void; onClose: () => void;
}) {
  const [text, setText] = useState("");
  const [query, setQuery] = useState("");
  const [tooShort, setTooShort] = useState(false);
  useEffect(() => {
    const value = initialQuery?.trim() ?? "";
    if (!open || !value) return;
    setText(value);
    setTooShort(value.length < MIN_SEARCH_LENGTH);
    if (value.length >= MIN_SEARCH_LENGTH) setQuery(value);
  }, [open, initialQuery]);
  const searching = query.length >= MIN_SEARCH_LENGTH;
  const people = useQuery({
    queryKey: ["saved-people", "search", query],
    queryFn: ({ signal }) => searchPeople(query, { signal }),
    enabled: open && searching,
    staleTime: 30_000,
  });
  const submit = () => {
    const value = text.trim();
    setTooShort(value.length < MIN_SEARCH_LENGTH);
    if (value.length >= MIN_SEARCH_LENGTH) setQuery(value);
  };
  const results = searching ? people.data?.results ?? [] : [];
  const offered = searching ? results : suggested;

  return (
    <Dialog open={open} onOpenChange={next => { if (!next) onClose(); }}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <form role="search" className="flex gap-2" onSubmit={event => { event.preventDefault(); submit(); }}>
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <Input autoFocus aria-label="Mobile number, CNIC, passport, email or name" value={text} maxLength={64} placeholder="Mobile number, CNIC, passport, email or name"
              onChange={event => setText(event.target.value)} className="pl-9" />
          </div>
          <Button type="submit" variant="outline">Search</Button>
        </form>
        {tooShort && <p role="alert" className="text-body text-status-critical-text">Type at least {MIN_SEARCH_LENGTH} characters.</p>}

        {searching && people.isPending ? (
          <div className="flex flex-col gap-2" aria-busy="true" aria-label="Searching saved people">
            {Array.from({ length: 3 }, (_, index) => <Skeleton key={index} className="h-16 rounded-lg" />)}
          </div>
        ) : searching && people.error ? (
          <Notice tone="critical">{peopleErrorMessage(people.error, "Saved people couldn't be searched. Type the details in the form instead.")}</Notice>
        ) : offered.length > 0 ? (
          <ul aria-label="Saved people" className="flex flex-col divide-y divide-border rounded-lg border border-border">
            {offered.map(person => (
              <li key={person.id} className="flex flex-col gap-2 px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex min-w-0 flex-col gap-0.5">
                  <p className="truncate text-body font-semibold text-foreground" title={fullName(person)}>{fullName(person)}</p>
                  <p className="text-label text-muted-foreground">
                    {[person.phone_masked, person.email_masked, person.birth_year ? `Born ${person.birth_year}` : null, person.nationality].filter(Boolean).join(" · ") || "No contact details saved"}
                  </p>
                  <MaskedDocuments documents={person.documents} />
                </div>
                <Button type="button" variant="primary" size="sm" className="shrink-0 self-start sm:self-center" aria-label={`Use ${fullName(person)}`} onClick={() => onPick(person)}>
                  Use
                </Button>
              </li>
            ))}
          </ul>
        ) : searching ? (
          <p role="status" className="text-body text-muted-foreground">No saved person matches “{query}”. Type their details in the form instead; they are saved after the hold.</p>
        ) : (
          <p className="text-body text-muted-foreground">Search by the full mobile number, CNIC or passport number, an email, or the start of the name.</p>
        )}
      </DialogContent>
    </Dialog>
  );
}
