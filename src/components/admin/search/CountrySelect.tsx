import { useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import { Command, CommandEmpty, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { countries, countryName } from "@/data/countries";
import { cn } from "@/lib/utils";

interface CountrySelectProps {
  id: string;
  /** Three-letter code the gateway expects, e.g. "PAK". */
  value: string;
  onChange: (code: string) => void;
  invalid?: boolean;
  describedBy?: string;
}

/** Searchable country dropdown (hold form): shows the country name, keeps the alpha-3 code.
 *  Type to filter by name (or a common alias such as "UAE"); arrow keys and Enter choose;
 *  Escape or a click outside closes. The list stays attached to the field (portal popover). */
export function CountrySelect({ id, value, onChange, invalid, describedBy }: CountrySelectProps) {
  const [open, setOpen] = useState(false);
  const selected = countryName(value);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          id={id}
          type="button"
          role="combobox"
          aria-expanded={open}
          aria-haspopup="listbox"
          aria-invalid={invalid}
          aria-describedby={describedBy}
          className={cn(
            "flex h-control w-full min-w-0 items-center justify-between gap-2 rounded-md border border-input bg-background px-3 text-left text-body",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            !selected && "text-muted-foreground",
          )}
        >
          <span className="truncate" title={selected}>{selected ?? "Choose a country"}</span>
          <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[var(--radix-popover-trigger-width)] min-w-[16rem] max-w-[calc(100vw-2rem)] p-0" collisionPadding={16}>
        <Command label="Search country" filter={(itemValue, search) => (itemValue.toLowerCase().includes(search.trim().toLowerCase()) ? 1 : 0)}>
          <CommandInput placeholder="Search country" aria-label="Search country" className="text-body" />
          <CommandList className="max-h-64">
            <CommandEmpty className="py-4 text-center text-body text-muted-foreground">No country found.</CommandEmpty>
            {countries.map(country => (
              <CommandItem
                key={country.code}
                value={[country.name, ...(country.aliases ?? []), country.code].join(" ")}
                onSelect={() => {
                  onChange(country.code);
                  setOpen(false);
                }}
                className="gap-2 text-body"
              >
                <Check className={cn("h-4 w-4 shrink-0", value === country.code ? "opacity-100" : "opacity-0")} aria-hidden="true" />
                <span className="truncate">{country.name}</span>
              </CommandItem>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
