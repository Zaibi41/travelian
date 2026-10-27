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



// Search shortcuts only; these do not represent available inventory.
const SUGGESTED_SECTORS: AvailableSector[] = ["LHE-JED", "ISB-JED", "KHI-JED", "LHE-MED"].map(sector => {
  const [from, to] = sector.split("-");
  return { sector, from, to, label: `${from} → ${to}`, count: 0 };
});

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



  const hasAvailableSectors = sectors.length > 0;
  const displayedSectors = hasAvailableSectors ? sectors : SUGGESTED_SECTORS;

  const handleSectorSelect = (secKey: string) => {

    if (!secKey || secKey === "all") {

      setFromValue("");

      setToValue("");

      if (!hasAvailableSectors) return;

      onSearch({

        from: undefined,

        to: undefined,

        dateFrom: dateFrom ? formatDateOnly(dateFrom) : undefined,

      });

      return;

    }

    const found = displayedSectors.find((s) => s.sector === secKey);

    if (found) {

      setFromValue(found.from);

      setToValue(found.to);

      if (!hasAvailableSectors) return;

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

      {displayedSectors.length > 0 && (

        <div className="grid grid-cols-1 items-center gap-x-2 gap-y-1.5 sm:flex sm:flex-wrap">

          <div className="contents">

            <span className="order-1 flex items-center gap-1.5 whitespace-nowrap text-xs font-medium text-muted-foreground">

              <Compass className="h-3.5 w-3.5" /> {hasAvailableSectors ? "Available Sectors:" : "Suggested routes:"}

            </span>

            <div className="order-2 col-span-full flex min-w-0 gap-1.5 overflow-x-auto pb-0.5 sm:order-2 sm:flex-1 sm:flex-wrap sm:pb-0">

              {displayedSectors.slice(0, 4).map((sec) => {

                const isSelected = fromValue === sec.from && toValue === sec.to;

                return (

                  <button

                    key={sec.sector}

                    type="button"

                    aria-pressed={isSelected}

                    onClick={() => handleSectorSelect(sec.sector)}

                    className={cn(

                      "min-h-8 shrink-0 whitespace-nowrap rounded-md border px-2 py-1 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:min-h-7",

                      isSelected

                        ? "border-primary bg-primary text-primary-foreground"

                        : "border-border bg-muted/30 text-muted-foreground hover:border-primary/30 hover:bg-muted hover:text-primary",

                    )}

                  >

                    {sec.label} {hasAvailableSectors && <span className="text-[10px] opacity-70 font-normal">({sec.count})</span>}

                  </button>

                );

              })}

            </div>

          </div>



          <div className="order-3 w-full sm:ml-auto sm:w-auto">

            <Select value={displayedSectors.some(sector => sector.sector === currentSectorKey) ? currentSectorKey : "select-sector-placeholder"} onValueChange={handleSectorSelect}>

              <SelectTrigger aria-label={`Select available sector${currentSectorKey ? `, ${currentSectorKey}` : ""}`} className="h-8 w-full min-w-[11rem] justify-between gap-2 rounded-md border-border bg-transparent px-2 text-xs sm:w-auto hover:bg-muted">

                <SelectValue placeholder="Select available sector" />

              </SelectTrigger>

              <SelectContent className="z-[1120] max-h-60">

                <SelectItem value="select-sector-placeholder" disabled className="text-xs">Select available sector</SelectItem>

                <SelectItem value="all" className="text-xs font-semibold">

                  {hasAvailableSectors ? "All Available Sectors" : "All routes"}

                </SelectItem>

                {displayedSectors.map((sec) => (

                  <SelectItem key={sec.sector} value={sec.sector} className="text-xs">

                    {sec.label}{hasAvailableSectors ? ` (${sec.count} available)` : ""}

                  </SelectItem>

                ))}

              </SelectContent>

            </Select>

          </div>

        </div>

      )}



      {/* Main Search Inputs */}

      <div className="group-search-fields grid grid-cols-1 items-end gap-3 md:grid-cols-[1fr_auto_1fr_1fr_auto]">

        <div>

          {label("From")}

          <AirportCombobox value={fromValue} onChange={setFromValue} placeholder="From" />

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

          <AirportCombobox value={toValue} onChange={setToValue} placeholder="To" iconVariant="arrival" />

        </div>

        <div>

          {label("Departure Date (Optional)")}

          <DatePickerField date={dateFrom} onSelect={setDateFrom} placeholder="All departure dates" />

        </div>

        <Button

          type="button"

          onClick={handleSearch}

          className="unified-search-submit h-12 whitespace-nowrap rounded-xl px-6 font-semibold gradient-primary text-primary-foreground"

        >

          <Search className="mr-2 h-4 w-4" /> Search

        </Button>

      </div>

      
    </div>

  );

}

