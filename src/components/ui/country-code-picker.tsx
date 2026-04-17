import * as React from "react";
import { Check, ChevronDown, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { phoneCodes } from "@/data/phone-codes";

interface CountryCodePickerProps {
  value: string;
  onChange: (code: string) => void;
  className?: string;
}

/**
 * Searchable country dial-code picker. Items show "Country (+code)"
 * so typing the country name (e.g. "P" → Pakistan) jumps to it.
 */
export function CountryCodePicker({ value, onChange, className }: CountryCodePickerProps) {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const inputRef = React.useRef<HTMLInputElement>(null);

  const selected = phoneCodes.find((c) => c.code === value) ?? phoneCodes.find((c) => c.iso === "PK")!;

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return phoneCodes;
    return phoneCodes.filter(
      (c) =>
        c.country.toLowerCase().includes(q) ||
        c.code.includes(q) ||
        c.iso.toLowerCase().includes(q),
    );
  }, [query]);

  React.useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery("");
    }
  }, [open]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "flex items-center gap-1.5 h-11 bg-background border border-input rounded-xl px-3 text-sm text-left transition-colors hover:border-primary/50 focus:outline-none focus:ring-2 focus:ring-ring whitespace-nowrap",
            className,
          )}
        >
          <span className="text-base leading-none">{selected.flag}</span>
          <span className="font-medium">{selected.code}</span>
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
                  onChange(c.code);
                  setOpen(false);
                }}
                className={cn(
                  "w-full flex items-center gap-2.5 px-3 py-2 text-sm text-left hover:bg-accent transition-colors",
                  value === c.code && c.iso === selected.iso && "bg-accent",
                )}
              >
                <span className="text-base leading-none">{c.flag}</span>
                <span className="flex-1 text-foreground">{c.country}</span>
                <span className="text-muted-foreground text-xs">{c.code}</span>
                {value === c.code && c.iso === selected.iso && (
                  <Check className="h-3.5 w-3.5 text-primary" />
                )}
              </button>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
