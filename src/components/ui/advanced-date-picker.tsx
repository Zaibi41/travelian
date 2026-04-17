import * as React from "react";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { DayPicker } from "react-day-picker";
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { buttonVariants } from "@/components/ui/button";

interface AdvancedDatePickerProps {
  date: Date | undefined;
  onSelect: (d: Date | undefined) => void;
  placeholder?: string;
  fromYear?: number;
  toYear?: number;
  disabled?: (date: Date) => boolean;
  className?: string;
  triggerClassName?: string;
}

/**
 * Premium date picker with month/year dropdowns for fast navigation.
 * Used for date of birth, expiry dates, and other long-range date inputs.
 */
export function AdvancedDatePicker({
  date,
  onSelect,
  placeholder = "Select date",
  fromYear,
  toYear,
  disabled,
  className,
  triggerClassName,
}: AdvancedDatePickerProps) {
  const currentYear = new Date().getFullYear();
  const from = fromYear ?? 1925;
  const to = toYear ?? currentYear + 25;
  const [month, setMonth] = React.useState<Date>(date ?? new Date());

  React.useEffect(() => {
    if (date) setMonth(date);
  }, [date]);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "flex items-center gap-2 w-full h-11 bg-background border border-input rounded-xl px-3 text-sm text-left transition-colors hover:border-primary/50 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
            !date && "text-muted-foreground",
            triggerClassName,
          )}
        >
          <CalendarIcon className="h-4 w-4 text-muted-foreground shrink-0" />
          {date ? format(date, "MMM dd, yyyy") : placeholder}
        </button>
      </PopoverTrigger>
      <PopoverContent className={cn("w-auto p-0 z-[200]", className)} align="start">
        <DayPicker
          mode="single"
          selected={date}
          onSelect={onSelect}
          month={month}
          onMonthChange={setMonth}
          captionLayout="dropdown-buttons"
          fromYear={from}
          toYear={to}
          disabled={disabled}
          showOutsideDays
          className="p-3 pointer-events-auto"
          classNames={{
            months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
            month: "space-y-3",
            caption: "flex justify-center pt-1 relative items-center",
            caption_label: "hidden",
            caption_dropdowns: "flex gap-1.5 items-center",
            dropdown:
              "h-8 rounded-md border border-input bg-background text-xs px-2 font-medium text-foreground hover:border-primary/50 focus:outline-none focus:ring-2 focus:ring-ring",
            dropdown_month: "min-w-[90px]",
            dropdown_year: "min-w-[70px]",
            vhidden: "hidden",
            nav: "space-x-1 flex items-center",
            nav_button: cn(
              buttonVariants({ variant: "outline" }),
              "h-7 w-7 bg-transparent p-0 opacity-60 hover:opacity-100",
            ),
            nav_button_previous: "absolute left-1",
            nav_button_next: "absolute right-1",
            table: "w-full border-collapse space-y-1",
            head_row: "flex",
            head_cell: "text-muted-foreground rounded-md w-9 font-normal text-[0.75rem]",
            row: "flex w-full mt-1.5",
            cell: "h-9 w-9 text-center text-sm p-0 relative [&:has([aria-selected])]:bg-accent first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20",
            day: cn(
              buttonVariants({ variant: "ghost" }),
              "h-9 w-9 p-0 font-normal aria-selected:opacity-100 hover:bg-accent",
            ),
            day_selected:
              "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
            day_today: "bg-accent text-accent-foreground font-semibold",
            day_outside: "text-muted-foreground opacity-40",
            day_disabled: "text-muted-foreground opacity-40",
            day_hidden: "invisible",
          }}
        />
      </PopoverContent>
    </Popover>
  );
}
