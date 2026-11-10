import { useId, useMemo, useRef, useState } from "react";
import { Plane, X } from "lucide-react";
import { Popover, PopoverAnchor, PopoverContent } from "@/components/ui/popover";
import { useAirports } from "@/hooks/use-airports";
import { MIN_QUERY, searchAirports, type Airport } from "@/lib/admin-search/airports";
import { cn } from "@/lib/utils";

interface AirportComboboxProps {
  id: string;
  label: string;
  placeholder: string;
  /** The 3-letter IATA code sent to the gateway (unchanged from the plain code field). */
  value?: string;
  onChange: (code?: string) => void;
}

function AirportLines({ code, airport }: { code: string; airport?: Airport }) {
  const first = airport ? `${airport.iata} - ${airport.city}` : code;
  const second = airport ? `${airport.name}, ${airport.country}` : "";
  return (
    <span className="flex min-w-0 flex-1 items-center gap-2">
      <Plane className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
      <span className="flex min-w-0 flex-col text-left leading-tight">
        <span className="truncate text-body font-semibold text-foreground" title={first}>{first}</span>
        {second && <span className="truncate text-label text-muted-foreground" title={second}>{second}</span>}
      </span>
    </span>
  );
}

/** Origin or destination: type a code, city, airport or country and choose from at most 8
 *  suggestions (searched in memory, no request). Arrow keys, Enter, Escape; Tab leaves.
 *  After a choice the field shows the airport with an x to clear it. */
export function AirportCombobox({ id, label, placeholder, value, onChange }: AirportComboboxProps) {
  const index = useAirports();
  const listId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState("");
  const [active, setActive] = useState(0);
  const results = useMemo(() => (index ? searchAirports(index, text) : []), [index, text]);
  const open = editing && text.trim().length >= MIN_QUERY;
  const selected = value ? index?.byCode.get(value) : undefined;

  const choose = (airport: Airport) => {
    onChange(airport.iata);
    setEditing(false);
    setText("");
  };
  const startEditing = () => {
    setEditing(true);
    setText("");
    setActive(0);
    requestAnimationFrame(() => inputRef.current?.focus());
  };

  if (value && !editing) {
    const name = selected ? `${selected.iata} - ${selected.city}, ${selected.name}, ${selected.country}` : value;
    return (
      <div className="flex min-w-0 flex-col gap-1">
        <span id={`${id}-label`} className="text-label font-medium text-muted-foreground">{label}</span>
        <div className="flex min-h-control min-w-0 items-center gap-1 rounded-sm border border-input bg-background py-1 pl-2.5 pr-1">
          <button id={id} type="button" aria-labelledby={`${id}-label ${id}`} onClick={startEditing}
            className="flex min-w-0 flex-1 rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" title={name}>
            <AirportLines code={value} airport={selected} />
          </button>
          <button type="button" aria-label={`Clear ${label.toLowerCase()} airport`} onClick={() => { onChange(undefined); startEditing(); }}
            className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-sm text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </div>
    );
  }

  const activeId = open && results[active] ? `${listId}-${results[active].iata}` : undefined;
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <label htmlFor={id} className="text-label font-medium text-muted-foreground">{label}</label>
      <Popover open={open} onOpenChange={next => !next && setEditing(false)}>
        <PopoverAnchor asChild>
          <input
            ref={inputRef}
            id={id}
            role="combobox"
            aria-expanded={open}
            aria-controls={listId}
            aria-autocomplete="list"
            aria-activedescendant={activeId}
            value={text}
            maxLength={64}
            placeholder={placeholder}
            autoComplete="off"
            spellCheck={false}
            onFocus={() => setEditing(true)}
            onChange={event => {
              setEditing(true);
              setText(event.target.value);
              setActive(0);
            }}
            onBlur={() => {
              // Leaving with an exact code typed keeps working as before (e.g. "LHE" then Tab).
              const code = text.trim().toUpperCase();
              if (/^[A-Z]{3}$/.test(code) && index?.byCode.has(code)) onChange(code);
              setEditing(false);
              setText("");
            }}
            onKeyDown={event => {
              if (event.key === "ArrowDown" && results.length) {
                event.preventDefault();
                setActive(current => (current + 1) % results.length);
              } else if (event.key === "ArrowUp" && results.length) {
                event.preventDefault();
                setActive(current => (current - 1 + results.length) % results.length);
              } else if (event.key === "Enter" && open) {
                event.preventDefault();
                if (results[active]) choose(results[active]);
              } else if (event.key === "Escape" && open) {
                event.preventDefault();
                setText("");
              }
            }}
            className="flex h-control w-full min-w-0 rounded-sm border border-input bg-background px-3 text-body placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </PopoverAnchor>
        <PopoverContent
          align="start"
          className="w-[var(--radix-popper-anchor-width)] min-w-[16rem] max-w-[calc(100vw-2rem)] p-1"
          onOpenAutoFocus={event => event.preventDefault()}
          onCloseAutoFocus={event => event.preventDefault()}
          onInteractOutside={event => {
            if (event.target === inputRef.current) event.preventDefault();
          }}
        >
          <ul id={listId} role="listbox" aria-label={`${label} airports`} className="flex flex-col">
            {!index && <li role="option" aria-selected={false} aria-disabled className="px-2.5 py-2 text-body text-muted-foreground">Loading airports…</li>}
            {index && results.length === 0 && <li role="option" aria-selected={false} aria-disabled className="px-2.5 py-2 text-body text-muted-foreground">No airports found</li>}
            {results.map((airport, position) => (
              <li
                key={airport.iata}
                id={`${listId}-${airport.iata}`}
                role="option"
                aria-selected={position === active}
                onPointerDown={event => event.preventDefault()}
                onPointerEnter={() => setActive(position)}
                onClick={() => choose(airport)}
                className={cn("flex min-w-0 cursor-pointer rounded-sm px-2 py-1.5", position === active && "bg-accent")}
              >
                <AirportLines code={airport.iata} airport={airport} />
              </li>
            ))}
          </ul>
        </PopoverContent>
      </Popover>
    </div>
  );
}
