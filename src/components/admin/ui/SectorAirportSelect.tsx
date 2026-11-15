import { useId, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import { Popover, PopoverAnchor, PopoverContent } from "@/components/ui/popover";
import { useAirports } from "@/hooks/use-airports";
import { cn } from "@/lib/utils";
import {
  AIRPORT_FIELD, AIRPORT_LIST_PANEL, AirportIcon, AirportLines, FieldLabel, SelectedAirportCard, SelectedAirportText, airportOptionClass, type AirportIconKind,
} from "./search-form";

interface SectorAirportSelectProps {
  id: string;
  label: string;
  placeholder: string;
  /** Only these airports can be chosen (the origins or destinations of the available sectors). */
  codes: string[];
  value?: string;
  onChange: (code?: string) => void;
  icon?: AirportIconKind;
}

/** From or To limited to the available sectors (no free airport search). The field and the
 *  rows show the two-line airport card, with names from the airport list; a code that isn't
 *  in the list shows alone. Arrow keys, Enter and Escape work; Tab leaves. */
export function SectorAirportSelect({ id, label, placeholder, codes, value, onChange, icon = "departure" }: SectorAirportSelectProps) {
  const index = useAirports();
  const listId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);

  const openList = () => {
    const current = value ? codes.indexOf(value) : -1;
    setActive(current >= 0 ? current : 0);
    setOpen(true);
    requestAnimationFrame(() => triggerRef.current?.focus());
  };
  const choose = (code: string) => {
    onChange(code);
    setOpen(false);
  };

  if (value && !open) {
    return <SelectedAirportCard id={id} label={label} code={value} airport={index?.byCode.get(value)} icon={icon} onOpen={openList}
      onClear={() => onChange(undefined)} />;
  }

  const activeId = open && codes[active] ? `${listId}-${codes[active]}` : undefined;
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <FieldLabel id={`${id}-label`}>{label}</FieldLabel>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverAnchor asChild>
          <button
            ref={triggerRef}
            id={id}
            type="button"
            role="combobox"
            aria-labelledby={`${id}-label`}
            aria-expanded={open}
            aria-controls={listId}
            aria-haspopup="listbox"
            aria-activedescendant={activeId}
            disabled={codes.length === 0}
            onClick={() => (open ? setOpen(false) : openList())}
            onKeyDown={event => {
              if (event.key === "ArrowDown" || event.key === "ArrowUp") {
                event.preventDefault();
                if (!open) return openList();
                const step = event.key === "ArrowDown" ? 1 : -1;
                setActive(current => (current + step + codes.length) % codes.length);
              } else if ((event.key === "Enter" || event.key === " ") && open) {
                event.preventDefault();
                if (codes[active]) choose(codes[active]);
              } else if (event.key === "Escape" && open) {
                event.preventDefault();
                setOpen(false);
              } else if (event.key === "Tab") setOpen(false);
            }}
            className={cn(AIRPORT_FIELD, "flex h-14 w-full min-w-0 items-center gap-2.5 px-3 text-left text-body text-muted-foreground",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-60")}
          >
            {value ? <SelectedAirportText code={value} airport={index?.byCode.get(value)} icon={icon} />
              : <><AirportIcon kind={icon} /><span className="min-w-0 flex-1 truncate">{placeholder}</span></>}
            <ChevronDown className="h-4 w-4 shrink-0 opacity-60" aria-hidden="true" />
          </button>
        </PopoverAnchor>
        <PopoverContent align="start" className={AIRPORT_LIST_PANEL} onOpenAutoFocus={event => event.preventDefault()}
          onInteractOutside={event => {
            if (triggerRef.current?.contains(event.target as Node)) event.preventDefault();
          }}>
          <ul id={listId} role="listbox" aria-label={`${label} airports`} className="flex flex-col gap-0.5">
            {codes.map((code, position) => (
              <li
                key={code}
                id={`${listId}-${code}`}
                role="option"
                aria-selected={position === active}
                onPointerDown={event => event.preventDefault()}
                onPointerEnter={() => setActive(position)}
                onClick={() => choose(code)}
                className={airportOptionClass(position === active)}
              >
                <AirportLines code={code} airport={index?.byCode.get(code)} />
              </li>
            ))}
          </ul>
        </PopoverContent>
      </Popover>
    </div>
  );
}
