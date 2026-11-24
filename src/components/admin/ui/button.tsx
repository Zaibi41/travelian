import * as React from "react";
import { Button as SharedButton, type ButtonProps as SharedButtonProps } from "@/components/ui/button";

// The admin uses the shared button (src/components/ui/button.tsx, issue 118) at the token sizes:
// default 40px (44px on touch), sm 36px, lg 48px (search form), icon 40px square.
const SIZE = { default: "control", sm: "control-sm", lg: "search", icon: "control-icon" } as const;

export interface ButtonProps extends Omit<SharedButtonProps, "size"> {
  size?: keyof typeof SIZE | null;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(({ size, ...props }, ref) => (
  <SharedButton ref={ref} size={SIZE[size ?? "default"]} {...props} />
));
Button.displayName = "AdminButton";
