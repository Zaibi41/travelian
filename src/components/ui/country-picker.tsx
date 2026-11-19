import * as React from "react";
import { Check, ChevronDown, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { phoneCodes } from "@/data/phone-codes";

interface CountryPickerProps {
  id?: string;
  value: string;
  onChange: (country: string) => void;
  placeholder?: string;
  className?: string;
}

/**
 * Searchable country selector showing full country list with flags.
 * Typing jumps to matches (e.g. "P" → Pakistan).
 */
export function CountryPicker({ id, value, onChange, placeholder = "Select country", className }: CountryPickerProps) {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const inputRef = React.useRef<HTMLInputElement>(null);

  const selected = phoneCodes.find((c) => c.country === value);

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return phoneCodes;
    return phoneCodes.filter((c) => c.country.toLowerCase().includes(q));
  }, [query]);

  React.useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50);
    else setQuery("");
  }, [open]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          id={id}
          type="button"
          className={cn(
            "flex items-center gap-2 w-full h-11 bg-background border border-input rounded-xl px-3 text-sm text-left transition-colors hover:border-primary/50 focus:outline-none focus:ring-2 focus:ring-ring",
            !selected && "text-muted-foreground",
            className,
          )}
        >
          {selected ? (
            <>
              <span className="text-base leading-none">{selected.flag}</span>
              <span className="font-medium text-foreground">{selected.country}</span>
            </>
          ) : (
            <span>{placeholder}</span>
          )}
          <ChevronDown className="h-3.5 w-3.5 opacity-60 ml-auto" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-0 z-[200]" align="start">
        <div className="p-2 border-b">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search country..."
              className="w-full h-9 pl-8 pr-2 text-sm rounded-md border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
        </div>
        <div className="max-h-64 overflow-y-auto py-1">
          {filtered.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-6">No countries found</p>
          ) : (
            filtered.map((c) => (
              <button
                key={c.iso}
                type="button"
                onClick={() => {
                  onChange(c.country);
                  setOpen(false);
                }}
                className={cn(
                  "w-full flex items-center gap-2.5 px-3 py-2 text-sm text-left hover:bg-accent transition-colors",
                  value === c.country && "bg-accent",
                )}
              >
                <span className="text-base leading-none">{c.flag}</span>
                <span className="flex-1 text-foreground">{c.country}</span>
                {value === c.country && <Check className="h-3.5 w-3.5 text-primary" />}
              </button>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
