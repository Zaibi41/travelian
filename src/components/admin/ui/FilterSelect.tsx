import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select";

export interface FilterOption {
  value: string;
  label: string;
}

interface FilterSelectProps {
  id: string;
  label: string;
  value: string;
  options: FilterOption[];
  onChange: (value: string) => void;
}

/** Compact filter chip ("Date  All ▾"). Uses the shared portal Select: attached
 *  to its trigger, collision-aware, closes on Escape and outside click. */
export function FilterSelect({ id, label, value, options, onChange }: FilterSelectProps) {
  const selected = options.find(option => option.value === value) ?? options[0];
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger
        id={id}
        aria-label={`${label}: ${selected?.label ?? ""}`}
        className="h-control w-auto max-w-full gap-1.5 rounded-md border-border bg-card px-3 text-body shadow-none focus:ring-2 focus:ring-ring focus:ring-offset-1"
      >
        <span className="text-muted-foreground">{label}</span>
        <span className="truncate font-medium text-foreground">{selected?.label}</span>
      </SelectTrigger>
      <SelectContent className="max-h-72">
        {options.map(option => (
          <SelectItem key={option.value} value={option.value} className="text-body">
            <span className="block max-w-[16rem] truncate">{option.label}</span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
