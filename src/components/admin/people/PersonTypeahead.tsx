import { useEffect, useId, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";
import { Popover, PopoverAnchor, PopoverContent } from "@/components/ui/popover";
import { Input } from "@/components/admin/ui/field";
import { searchCustomers, searchTravelers, type PersonSummary } from "@/lib/saved-people/api";
import { fullName, ID_TYPE_LABEL } from "@/lib/saved-people/states";
import { cn } from "@/lib/utils";

const MIN_CHARS = 2;
const DEBOUNCE_MS = 250;

/** The text after a 250 ms pause in typing. */
function useDebounced(value: string, delay = DEBOUNCE_MS) {
  const [settled, setSettled] = useState(value);
  useEffect(() => {
    const timer = window.setTimeout(() => setSettled(value), delay);
    return () => window.clearTimeout(timer);
  }, [value, delay]);
  return settled;
}

/** "Passport AB1234967" for the first saved document; null without one. */
function documentLine(person: PersonSummary) {
  const document = person.documents[0];
  return document ? `${ID_TYPE_LABEL[document.id_type]} ${document.document_number}` : null;
}

/** Live search for a saved person on the hold form: from 2 characters (250 ms after typing stops) a list of up to 8
 *  matches opens under the field. Arrow keys move, Enter chooses, Esc closes. Choosing hands the
 *  person to the form, which sends only their id (the gateway fills the details in). */
export function PersonTypeahead({ id, label, kind, placeholder, emptyText, onPick, autoFocus }: {
  id: string;
  label: string;
  kind: "customer" | "traveler";
  placeholder: string;
  emptyText: string;
  onPick: (person: PersonSummary) => void;
  autoFocus?: boolean;
}) {
  const listId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [text, setText] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const query = useDebounced(text.trim());
  const searching = query.length >= MIN_CHARS;
  const people = useQuery({
    queryKey: ["saved-people", "typeahead", kind, query],
    queryFn: ({ signal }) => (kind === "customer" ? searchCustomers : searchTravelers)(query, { signal }),
    enabled: searching,
    staleTime: 30_000,
  });
  const results = searching ? people.data?.results ?? [] : [];
  const shown = open && searching && (people.isFetched || results.length > 0);
  const activeId = shown && results[active] ? `${listId}-${results[active].id}` : undefined;

  useEffect(() => setActive(0), [query]);

  const choose = (person: PersonSummary) => {
    onPick(person);
    setText("");
    setOpen(false);
  };

  return (
    <Popover open={shown} onOpenChange={next => { if (!next) setOpen(false); }}>
      <PopoverAnchor asChild>
        <div className="relative min-w-0">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <Input
            ref={inputRef}
            id={id}
            role="combobox"
            aria-label={label}
            aria-expanded={shown}
            aria-controls={listId}
            aria-autocomplete="list"
            aria-activedescendant={activeId}
            value={text}
            maxLength={64}
            placeholder={placeholder}
            autoComplete="off"
            autoFocus={autoFocus}
            className="pl-9"
            onChange={event => { setText(event.target.value); setOpen(true); }}
            onFocus={() => setOpen(true)}
            onKeyDown={event => {
              if (event.key === "ArrowDown" && results.length) {
                event.preventDefault();
                setOpen(true);
                setActive(current => (current + 1) % results.length);
              } else if (event.key === "ArrowUp" && results.length) {
                event.preventDefault();
                setActive(current => (current - 1 + results.length) % results.length);
              } else if (event.key === "Enter") {
                event.preventDefault();  // never submits the booking form
                if (shown && results[active]) choose(results[active]);
              } else if (event.key === "Escape" && shown) {
                event.preventDefault();
                setOpen(false);
              }
            }}
          />
        </div>
      </PopoverAnchor>
      <PopoverContent align="start" className="w-[max(var(--radix-popper-anchor-width),20rem)] max-w-[calc(100vw-1.5rem)] p-1.5"
        onOpenAutoFocus={event => event.preventDefault()} onCloseAutoFocus={event => event.preventDefault()}
        onInteractOutside={event => { if (event.target === inputRef.current) event.preventDefault(); }}>
        <ul id={listId} role="listbox" aria-label={`${label} results`} className="flex max-h-80 flex-col gap-0.5 overflow-y-auto">
          {results.length === 0 ? (
            <li role="option" aria-selected={false} aria-disabled className="px-3 py-2.5 text-body text-muted-foreground">
              {people.isError ? "Saved people can't be searched right now. Type the details below." : emptyText}
            </li>
          ) : results.map((person, position) => {
            const details = [documentLine(person), kind === "customer" ? person.phone : null, kind === "customer" ? person.email : null]
              .filter(Boolean).join(" · ");
            return (
              <li key={person.id} id={`${listId}-${person.id}`} role="option" aria-selected={position === active}
                onPointerDown={event => event.preventDefault()} onPointerEnter={() => setActive(position)} onClick={() => choose(person)}
                className={cn("flex min-w-0 cursor-pointer flex-col rounded-md px-3 py-2", position === active ? "bg-accent ring-1 ring-inset ring-primary/40" : "hover:bg-muted/60")}>
                <span className="truncate text-body font-semibold text-foreground" title={fullName(person)}>{fullName(person)}</span>
                {details && <span className="truncate text-label text-muted-foreground" title={details}>{details}</span>}
              </li>
            );
          })}
        </ul>
      </PopoverContent>
    </Popover>
  );
}
