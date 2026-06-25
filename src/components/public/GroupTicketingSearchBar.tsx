import { useEffect, useState } from "react";
import { ArrowLeftRight, CalendarIcon, Search } from "lucide-react";
import { format, startOfDay } from "date-fns";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { AirportCombobox } from "@/components/public/AirportCombobox";
import { formatDateOnly, parseDateOnly } from "@/lib/date-only";

export interface GroupTicketingSearchValues {
  from?: string;
  to?: string;
  dateFrom?: string;
}

function DatePickerField({
  date,
  onSelect,
  placeholder,
}: {
  date: Date | undefined;
  onSelect: (date: Date | undefined) => void;
  placeholder: string;
}) {
  const [open, setOpen] = useState(false);
  const today = startOfDay(new Date());
  const selectDate = (nextDate: Date | undefined) => {
    onSelect(nextDate);
    if (nextDate) setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "flex h-12 w-full items-center gap-2 rounded-xl border border-muted bg-muted/30 px-3 text-left text-sm transition-colors hover:border-primary/30",
            !date && "text-muted-foreground",
          )}
        >
          <CalendarIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
          {date ? format(date, "MMM dd, yyyy") : placeholder}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start" side="bottom" sideOffset={8} avoidCollisions={false}>
        <Calendar
          mode="single"
          selected={date}
          onSelect={selectDate}
          disabled={(day) => startOfDay(day) < today}
          initialFocus
          className="pointer-events-auto p-3"
        />
      </PopoverContent>
    </Popover>
  );
}

export function GroupTicketingSearchBar({
  initialValues,
  onSearch,
  showLabels = false,
}: {
  initialValues?: GroupTicketingSearchValues;
  onSearch: (values: GroupTicketingSearchValues) => void;
  showLabels?: boolean;
}) {
  const [fromValue, setFromValue] = useState(initialValues?.from || "");
  const [toValue, setToValue] = useState(initialValues?.to || "");
  const [dateFrom, setDateFrom] = useState<Date | undefined>(parseDateOnly(initialValues?.dateFrom));

  useEffect(() => {
    setFromValue(initialValues?.from || "");
    setToValue(initialValues?.to || "");
    setDateFrom(parseDateOnly(initialValues?.dateFrom));
  }, [initialValues?.from, initialValues?.to, initialValues?.dateFrom]);

  const handleSearch = () => {
    onSearch({
      from: /^[A-Z]{3}$/.test(fromValue) ? fromValue : undefined,
      to: /^[A-Z]{3}$/.test(toValue) ? toValue : undefined,
      dateFrom: dateFrom ? formatDateOnly(dateFrom) : undefined,
    });
  };

  const label = (text: string) => showLabels ? (
    <label className="mb-1 block text-xs font-medium text-muted-foreground">{text}</label>
  ) : null;

  return (
    <div className="rounded-2xl border bg-card p-4 shadow-card">
      <div className="grid grid-cols-1 items-end gap-3 md:grid-cols-[1fr_auto_1fr_1fr_auto]">
        <div>
          {label("From")}
          <AirportCombobox value={fromValue} onChange={setFromValue} placeholder="From where?" />
        </div>
        <div className="hidden items-center justify-center pb-1 md:flex">
          <button
            type="button"
            onClick={() => {
              const previousFrom = fromValue;
              setFromValue(toValue);
              setToValue(previousFrom);
            }}
            aria-label="Swap origin and destination"
            className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-primary/30 text-primary transition-colors hover:bg-primary hover:text-primary-foreground"
          >
            <ArrowLeftRight className="h-4 w-4" />
          </button>
        </div>
        <div>
          {label("To")}
          <AirportCombobox value={toValue} onChange={setToValue} placeholder="To where?" />
        </div>
        <div>
          {label("Date from")}
          <DatePickerField date={dateFrom} onSelect={setDateFrom} placeholder="Departure date" />
        </div>
        <Button
          type="button"
          onClick={handleSearch}
          className="h-12 whitespace-nowrap rounded-xl px-6 font-semibold gradient-primary text-primary-foreground"
        >
          <Search className="mr-2 h-4 w-4" /> Search
        </Button>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        Filter by route and departure date. Leave fields empty to browse all group tickets.
      </p>
    </div>
  );
}
