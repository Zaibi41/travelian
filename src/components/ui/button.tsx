import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

/**
 * The one button for the public site and the admin (docs/DESIGN_STANDARD.md, issue 118).
 * Colours come from the tokens (src/styles/tokens.css), so the same variant is blue on the public
 * site and navy/teal in the admin.
 *
 * Variants
 *   default   filled primary (public blue, admin navy).
 *   primary   filled action colour: the main action on an admin screen (teal); public: primary blue.
 *   secondary soft grey; outline bordered; ghost text only; link.
 *   destructive / danger  filled red (same look, two names).
 * Sizes
 *   default 40px, sm 36px, lg 44px, icon 40px square: the public site's buttons (14px text).
 *   control 40px (44px on touch), control-sm 36px, control-icon 40px (44px on touch) square,
 *   search 48px rounded-xl semibold (search forms): the token sizes the admin uses.
 */
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        primary: "bg-action text-action-foreground hover:bg-action/90",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        danger: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline: "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-4 py-2 text-sm",
        sm: "h-9 rounded-md px-3 text-sm",
        lg: "h-11 rounded-md px-8 text-sm",
        icon: "h-10 w-10 text-sm",
        control: "h-control px-4 text-body",
        "control-sm": "h-9 px-3 text-body",
        "control-icon": "h-control w-control text-body",
        search: "h-control-lg rounded-field px-6 text-body font-semibold",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return <Comp className={cn(buttonVariants({ variant, size }), className)} ref={ref} {...props} />;
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
