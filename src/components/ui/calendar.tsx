import * as React from "react";
import { DayPicker } from "react-day-picker";

import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";

export type CalendarProps = React.ComponentProps<typeof DayPicker>;

function getInitialMonth(props: CalendarProps) {
  if (props.defaultMonth) return props.defaultMonth;
  const selected = props.selected;
  if (selected instanceof Date) return selected;
  if (Array.isArray(selected) && selected[0] instanceof Date) return selected[0];
  if (selected && typeof selected === "object" && "from" in selected && selected.from instanceof Date) return selected.from;
  return undefined;
}

function Calendar({ className, classNames, showOutsideDays = false, captionLayout = "dropdown-buttons", fromYear = 2024, toYear = 2035, ...props }: CalendarProps) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      captionLayout={captionLayout}
      fromYear={fromYear}
      toYear={toYear}
      defaultMonth={getInitialMonth(props)}
      className={cn("p-2", className)}
      classNames={{
        months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
        month: "space-y-2.5",
        caption: "relative flex min-h-9 items-center justify-center px-8 pt-1",
        caption_label: "hidden",
        caption_dropdowns: "flex min-w-0 items-center justify-center gap-2",
        dropdown: "h-9 rounded-md border border-input bg-background px-2 text-sm font-medium text-foreground outline-none transition-colors hover:border-primary/50 focus:ring-2 focus:ring-ring",
        dropdown_month: "w-[116px]",
        dropdown_year: "w-[82px]",
        vhidden: "sr-only",
        nav: "flex items-center gap-1",
        nav_button: cn(
          buttonVariants({ variant: "outline" }),
          "pointer-events-auto h-7 w-7 rounded-lg bg-background p-0 opacity-80 hover:opacity-100 [&_svg]:h-4 [&_svg]:w-4",
        ),
        nav_button_previous: "absolute left-0 top-1",
        nav_button_next: "absolute right-0 top-1",
        table: "w-full border-collapse space-y-1",
        head_row: "flex",
        head_cell: "text-muted-foreground rounded-md w-9 font-normal text-[0.8rem]",
        row: "flex w-full mt-1",
        cell: "h-8 w-9 text-center text-sm p-0 relative [&:has([aria-selected].day-range-end)]:rounded-r-md [&:has([aria-selected].day-outside)]:bg-accent/50 [&:has([aria-selected])]:bg-accent first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20",
        day: cn(buttonVariants({ variant: "ghost" }), "h-8 w-8 p-0 font-normal aria-selected:opacity-100"),
        day_range_end: "day-range-end",
        day_selected:
          "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
        day_today: "bg-accent text-accent-foreground",
        day_outside:
          "day-outside text-muted-foreground opacity-50 aria-selected:bg-accent/50 aria-selected:text-muted-foreground aria-selected:opacity-30",
        day_disabled: "text-muted-foreground opacity-50",
        day_range_middle: "aria-selected:bg-accent aria-selected:text-accent-foreground",
        day_hidden: "invisible",
        ...classNames,
      }}
      {...props}
    />
  );
}
Calendar.displayName = "Calendar";

export { Calendar };
