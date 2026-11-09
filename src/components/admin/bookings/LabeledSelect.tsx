import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { FilterOption } from "@/components/admin/FilterSelect";

interface LabeledSelectProps {
  id: string;
  label: string;
  value: string;
  options: FilterOption[];
  onChange: (value: string) => void;
  /** Visible but not usable; `note` says why (shown under the field). */
  disabled?: boolean;
  note?: string;
}

/** Filter field with its label above (Bookings mockup). Portal Select: stays attached
 *  to its trigger, is collision-aware, closes on Escape and outside click. */
export function LabeledSelect({ id, label, value, options, onChange, disabled, note }: LabeledSelectProps) {
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <label htmlFor={id} className="text-label font-medium text-muted-foreground">{label}</label>
      <Select value={value} onValueChange={onChange} disabled={disabled}>
        <SelectTrigger id={id} aria-describedby={note ? `${id}-note` : undefined} className="h-control w-full min-w-0 rounded-sm border-border bg-card px-2.5 text-body shadow-none">
          <span className="truncate"><SelectValue /></span>
        </SelectTrigger>
        <SelectContent className="max-h-72">
          {options.map(option => (
            <SelectItem key={option.value} value={option.value} className="text-body">
              <span className="block max-w-[18rem] truncate">{option.label}</span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {note && <p id={`${id}-note`} className="line-clamp-2 text-label text-muted-foreground">{note}</p>}
    </div>
  );
}
