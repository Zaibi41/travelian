import { useId, useMemo, useRef, useState } from "react";
import { Popover, PopoverAnchor, PopoverContent } from "@/components/ui/popover";
import { AirportPickerSheet, type AirportPickerSection } from "@/components/ui/airport-picker-sheet";
import { useAirports } from "@/hooks/use-airports";
import { useIsMobile } from "@/hooks/use-mobile";
import { useOpenSignal } from "@/hooks/use-open-signal";
import { readRecentAirports, rememberRecentAirport } from "@/lib/recent-airports";
import { MIN_QUERY, popularAirports, searchAirports, type Airport } from "@/lib/admin-search/airports";
import { cn } from "@/lib/utils";
import {
  AIRPORT_FIELD, AIRPORT_LIST_PANEL, AirportIcon, AirportLines, FieldLabel, SelectedAirportCard, airportOptionClass, type AirportIconKind,
} from "./search-form";

interface AirportComboboxProps {
  id: string;
  label: string;
  placeholder: string;
  /** The 3-letter IATA code sent to the gateway (unchanged from the plain code field). */
  value?: string;
  onChange: (code?: string) => void;
  /** Leading field icon: take-off for From, landing for To (public site). */
  icon?: AirportIconKind;
  /** Phones only: called after an airport is chosen in the full-screen picker (not when it is just closed), so the
   *  form can open its next field (From → To → departure date). */
  onAdvance?: () => void;
  /** Opens the field (the picker on phones) each time this changes to a new non-zero number. */
  openSignal?: number;
}

/** Origin or destination: opening the field lists popular airports; typing a code, city, airport
 *  or country lists at most 8 matches (searched in memory, no request). Arrow keys, Enter, Escape; Tab leaves.
 *  After a choice the field shows the airport with an x to clear it. */
export function AirportCombobox({ id, label, placeholder, value, onChange, icon = "departure", onAdvance, openSignal }: AirportComboboxProps) {
  const index = useAirports();
  // Phones (below 768px): a full-screen picker instead of the dropdown, which the keyboard would hide (issue 148).
  const isPhone = useIsMobile();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetText, setSheetText] = useState("");
  const listId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState("");
  const [active, setActive] = useState(0);
  const typed = text.trim().length >= MIN_QUERY;
  const results = useMemo(() => (index ? (typed ? searchAirports(index, text) : popularAirports(index)) : []), [index, text, typed]);
  const open = editing;
  const selected = value ? index?.byCode.get(value) : undefined;

  const choose = (airport: Airport) => {
    onChange(airport.iata);
    rememberRecentAirport("admin", { code: airport.iata, city: airport.city, name: airport.name, country: airport.country });
    setEditing(false);
    setText("");
  };
  const openSheet = () => {
    setSheetText("");
    setSheetOpen(true);
  };
  useOpenSignal(openSignal, () => (isPhone ? openSheet() : startEditing()));
  // Before typing: the airports chosen before, then the popular airports; typing lists the same matches as the dropdown.
  const sheetTyped = sheetText.trim().length >= MIN_QUERY;
  const sheetSections = useMemo<AirportPickerSection[]>(() => {
    if (!index || !sheetOpen) return [];
    const toOption = (airport: Airport) => ({ code: airport.iata, city: airport.city, detail: `${airport.name}, ${airport.country}` });
    if (sheetTyped) return [{ id: "matches", label: "Airports", options: searchAirports(index, sheetText).map(toOption) }];
    const recent = readRecentAirports("admin").flatMap(item => index.byCode.get(item.code) ?? []);
    const recentCodes = new Set(recent.map(airport => airport.iata));
    return [
      { id: "recent", label: "Recent searches", options: recent.map(toOption) },
      { id: "popular", label: "Popular airports", options: popularAirports(index).filter(airport => !recentCodes.has(airport.iata)).map(toOption) },
    ];
  }, [index, sheetOpen, sheetText, sheetTyped]);
  const sheet = isPhone && (
    <AirportPickerSheet
      open={sheetOpen}
      title={icon === "arrival" ? "Where to?" : "Where from?"}
      query={sheetText}
      onQueryChange={setSheetText}
      sections={sheetSections}
      status={index ? undefined : <p role="status" className="px-3 py-3 text-body text-muted-foreground">Loading airports…</p>}
      selectedCode={value}
      onSelect={code => {
        const airport = index?.byCode.get(code);
        if (!airport) return;
        choose(airport);
        setSheetOpen(false);
        onAdvance?.();
      }}
      onClose={() => setSheetOpen(false)}
    />
  );
  const startEditing = () => {
    if (isPhone) {
      openSheet();
      return;
    }
    setEditing(true);
    setText("");
    setActive(0);
    requestAnimationFrame(() => inputRef.current?.focus());
  };

  if (value && !editing) {
    return (
      <>
        <SelectedAirportCard id={id} label={label} code={value} airport={selected} icon={icon} onOpen={startEditing}
          onClear={() => { onChange(undefined); startEditing(); }} />
        {sheet}
      </>
    );
  }

  const activeId = open && results[active] ? `${listId}-${results[active].iata}` : undefined;
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <Popover open={open} onOpenChange={next => !next && setEditing(false)}>
        <PopoverAnchor asChild>
          <div className="relative min-w-0">
          <AirportIcon kind={icon} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            ref={inputRef}
            id={id}
            role="combobox"
            aria-expanded={isPhone ? sheetOpen : open}
            aria-controls={isPhone ? undefined : listId}
            aria-haspopup={isPhone ? "dialog" : undefined}
            // Phones: the field only opens the full-screen picker; its own search box takes the typing.
            readOnly={isPhone}
            onClick={() => { if (isPhone) openSheet(); }}
            aria-autocomplete="list"
            aria-activedescendant={activeId}
            value={text}
            maxLength={64}
            placeholder={placeholder}
            autoComplete="off"
            spellCheck={false}
            onFocus={() => { if (!isPhone) setEditing(true); }}
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
              if (isPhone) {
                if (event.key === "Enter" || event.key === " " || event.key === "ArrowDown") {
                  event.preventDefault();
                  openSheet();
                }
                return;
              }
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
                setEditing(false);
              }
            }}
            className={cn(AIRPORT_FIELD, "flex h-14 w-full min-w-0 pl-10 pr-3 text-body placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring")}
          />
          </div>
        </PopoverAnchor>
        <PopoverContent data-scroll-into-view=""
          align="start"
          className={AIRPORT_LIST_PANEL}
          onOpenAutoFocus={event => event.preventDefault()}
          onCloseAutoFocus={event => event.preventDefault()}
          onInteractOutside={event => {
            if (event.target === inputRef.current) event.preventDefault();
          }}
        >
          <ul id={listId} role="listbox" aria-label={`${label} airports`} className="flex flex-col gap-0.5">
            {!index && <li role="option" aria-selected={false} aria-disabled className="px-3 py-3 text-body text-muted-foreground">Loading airports…</li>}
            {index && results.length === 0 && <li role="option" aria-selected={false} aria-disabled className="px-3 py-3 text-body text-muted-foreground">No airports found</li>}
            {results.map((airport, position) => (
              <li
                key={airport.iata}
                id={`${listId}-${airport.iata}`}
                role="option"
                aria-selected={position === active}
                onPointerDown={event => event.preventDefault()}
                onPointerEnter={() => setActive(position)}
                onClick={() => choose(airport)}
                className={airportOptionClass(position === active)}
              >
                <AirportLines code={airport.iata} airport={airport} />
              </li>
            ))}
          </ul>
        </PopoverContent>
      </Popover>
      {sheet}
    </div>
  );
}
