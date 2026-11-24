import * as React from "react";
import * as Base from "@/components/ui/card";
import { cn } from "@/lib/utils";

// The admin uses the shared card (src/components/ui/card.tsx, issue 118) with the rounded-xl corner
// and the admin type scale (18px title, 14px description). The shadow stays the small one.
export const Card = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(({ className, ...props }, ref) => (
  <Base.Card ref={ref} className={cn("rounded-xl", className)} {...props} />
));
Card.displayName = "AdminCard";

export const CardTitle = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLHeadingElement>>(({ className, ...props }, ref) => (
  <Base.CardTitle ref={ref} className={cn("font-display text-section", className)} {...props} />
));
CardTitle.displayName = "AdminCardTitle";

export const CardDescription = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(({ className, ...props }, ref) => (
  <Base.CardDescription ref={ref} className={cn("text-body", className)} {...props} />
));
CardDescription.displayName = "AdminCardDescription";

export { CardHeader, CardContent, CardFooter } from "@/components/ui/card";
