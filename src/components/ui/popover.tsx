import * as React from "react";
import * as PopoverPrimitive from "@radix-ui/react-popover";

import { cn } from "@/lib/utils";
import { useBelowField } from "@/hooks/use-below-field";

const Popover = PopoverPrimitive.Root;

const PopoverTrigger = PopoverPrimitive.Trigger;

const PopoverAnchor = PopoverPrimitive.Anchor;

const PopoverContent = React.forwardRef<
  React.ElementRef<typeof PopoverPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof PopoverPrimitive.Content> & {
    /** Fixed-size content (the date picker's calendar): never capped and scrolled; opens above the field when there is
     *  more room there (e.g. the last field of a dialog). Every other popover opens below its field. */
    flip?: boolean;
    /** Content that must be seen whole (a picker inside a modal, #114): opens below, or above when there is more room
     *  there, and is capped to the room on that side (its own body scrolls), so it never runs off the screen. */
    fit?: boolean;
  }
>(({ className, align = "center", sideOffset = 4, style, flip = false, fit = false, side = "bottom", ...props }, ref) => {
  const below = useBelowField(ref);
  return (
  <PopoverPrimitive.Portal>
    <PopoverPrimitive.Content
      ref={below.ref}
      align={align}
      sideOffset={sideOffset}
      className={cn(
        "z-[1120] w-72 rounded-md border bg-popover p-4 text-popover-foreground shadow-md outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
        className,
      )}
      {...props}
      side={fit ? side : "bottom"}
      avoidCollisions
      collisionPadding={flip || fit ? props.collisionPadding ?? 12 : below.collisionPadding}
      style={fit ? { ...style, maxHeight: "var(--radix-popover-content-available-height)" } : flip ? { ...style, maxHeight: "none", overflowY: "visible" } : { ...style, maxHeight: "min(24rem, var(--travelian-dropdown-available-height, calc(100dvh - 2rem)))", overflowY: style?.overflowY ?? "auto", "--radix-popover-content-available-height": "var(--travelian-dropdown-available-height, calc(100dvh - 2rem))" } as React.CSSProperties}
    />
  </PopoverPrimitive.Portal>
);
});
PopoverContent.displayName = PopoverPrimitive.Content.displayName;

export { Popover, PopoverTrigger, PopoverAnchor, PopoverContent };
