// The admin's own copy of the product list and icons used by Search's tabs. Umrah is hidden from the whole site, so it has no tab. Copied from the public
// site (src/components/public/product-navigation.ts) so the admin looks the
// same without importing from public folders: a later public change cannot change the admin.
import { Hotel, Plane, Users } from "lucide-react";
import { cn } from "@/lib/utils";

export const ADMIN_PRODUCT_TABS = [
  { id: "flights", label: "Flights", icon: Plane },
  { id: "group-ticketing", label: "Group Ticketing", icon: Users },
  { id: "hotels", label: "Hotels", icon: Hotel },
] as const;

/** One tab in the Search product tabs' style (Search, and the ProductTabLinks page tabs). */
export const productTabClass = (active: boolean) => cn(
  "flex min-h-12 min-w-0 items-center justify-center gap-2 border-b-2 px-4 text-body font-semibold transition-colors",
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary",
  active ? "border-primary bg-primary/5 text-primary" : "border-transparent text-muted-foreground hover:bg-card/60 hover:text-primary",
);
