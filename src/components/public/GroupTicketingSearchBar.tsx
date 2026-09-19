import { useEffect, useState } from "react";
import { ArrowLeftRight, CalendarIcon, Compass, Search } from "lucide-react";
import { format, startOfDay } from "date-fns";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { AirportCombobox } from "@/components/public/AirportCombobox";
import { formatDateOnly, parseDateOnly } from "@/lib/date-only";
import {
  extractAvailableSectors,
  fetchGroupTickets,
  type AvailableSector,
} from "@/lib/group-ticketing";

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
      <PopoverContent className="z-[1120] w-auto p-0" align="start" side="bottom" sideOffset={10} collisionPadding={16}>
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
  availableSectors: initialSectors,
}: {
  initialValues?: GroupTicketingSearchValues;
  onSearch: (values: GroupTicketingSearchValues) => void;
  showLabels?: boolean;
  availableSectors?: AvailableSector[];
}) {
  const [fromValue, setFromValue] = useState(initialValues?.from || "");
  const [toValue, setToValue] = useState(initialValues?.to || "");
  const [dateFrom, setDateFrom] = useState<Date | undefined>(parseDateOnly(initialValues?.dateFrom));
  const [sectors, setSectors] = useState<AvailableSector[]>(initialSectors || []);

  useEffect(() => {
    setFromValue(initialValues?.from || "");
    setToValue(initialValues?.to || "");
    setDateFrom(parseDateOnly(initialValues?.dateFrom));
  }, [initialValues?.from, initialValues?.to, initialValues?.dateFrom]);

  useEffect(() => {
    if (initialSectors && initialSectors.length > 0) {
      setSectors(initialSectors);
      return;
    }
    const controller = new AbortController();
    fetchGroupTickets("all", controller.signal)
      .then((items) => {
        setSectors(extractAvailableSectors(items));
      })
      .catch(() => undefined);
    return () => controller.abort();
  }, [initialSectors]);

  const handleSearch = () => {
    onSearch({
      from: /^[A-Z]{3}$/.test(fromValue) ? fromValue : undefined,
      to: /^[A-Z]{3}$/.test(toValue) ? toValue : undefined,
      dateFrom: dateFrom ? formatDateOnly(dateFrom) : undefined,
    });
  };

  const handleSectorSelect = (secKey: string) => {
    if (!secKey || secKey === "all") {
      setFromValue("");
      setToValue("");
      onSearch({
        from: undefined,
        to: undefined,
        dateFrom: dateFrom ? formatDateOnly(dateFrom) : undefined,
      });
      return;
    }
    const found = sectors.find((s) => s.sector === secKey);
    if (found) {
      setFromValue(found.from);
      setToValue(found.to);
      onSearch({
        from: found.from,
        to: found.to,
        dateFrom: dateFrom ? formatDateOnly(dateFrom) : undefined,
      });
    }
  };

  const currentSectorKey = fromValue && toValue ? `${fromValue}-${toValue}` : "";

  const label = (text: string) => showLabels ? (
    <label className="mb-1 block text-xs font-medium text-muted-foreground">{text}</label>
  ) : null;

  return (
    <div className="w-full space-y-3">
      {/* Available Sector Dropdown & Popular Sector Badges */}
      {sectors.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-2.5 rounded-xl border border-primary/15 bg-primary/5 px-3.5 py-2.5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="flex items-center gap-1.5 text-xs font-bold text-primary">
              <Compass className="h-4 w-4" /> Available Sectors:
            </span>
            <div className="flex flex-wrap items-center gap-1.5">
              {sectors.slice(0, 4).map((sec) => {
                const isSelected = fromValue === sec.from && toValue === sec.to;
                return (
                  <button
                    key={sec.sector}
                    type="button"
                    onClick={() => handleSectorSelect(sec.sector)}
                    className={cn(
                      "rounded-lg px-2.5 py-1 text-xs font-bold transition-colors",
                      isSelected
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "bg-white/80 text-slate-700 hover:bg-white hover:text-primary border border-slate-200",
                    )}
                  >
                    {sec.label} <span className="text-[10px] opacity-70 font-normal">({sec.count})</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-xs font-semibold text-muted-foreground hidden sm:inline">Sector:</label>
            <Select value={currentSectorKey || undefined} onValueChange={handleSectorSelect}>
              <SelectTrigger className="h-8 w-auto min-w-[150px] rounded-lg border-slate-200 bg-white text-xs font-semibold">
                <SelectValue placeholder="Select Available Sector..." />
              </SelectTrigger>
              <SelectContent className="z-[1120] max-h-60">
                <SelectItem value="all" className="text-xs font-semibold">
                  All Available Sectors
                </SelectItem>
                {sectors.map((sec) => (
                  <SelectItem key={sec.sector} value={sec.sector} className="text-xs">
                    {sec.label} ({sec.count} available)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      {/* Main Search Inputs */}
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
          <AirportCombobox value={toValue} onChange={setToValue} placeholder="To where?" iconVariant="arrival" />
        </div>
        <div>
          {label("Departure Date (Optional)")}
          <DatePickerField date={dateFrom} onSelect={setDateFrom} placeholder="All departure dates" />
        </div>
        <Button
          type="button"
          onClick={handleSearch}
          className="h-12 whitespace-nowrap rounded-xl px-6 font-semibold gradient-primary text-primary-foreground"
        >
          <Search className="mr-2 h-4 w-4" /> Search
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        Select a route or sector above. Leave departure date empty to view all available flights for that route.
      </p>
    </div>
  );
}
