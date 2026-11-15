// The admin's own copy of the product list and icons used by Search's tabs. Umrah is hidden from the whole site, so it has no tab. Copied from the public
// site (src/components/public/product-navigation.ts) so the admin looks the
// same without importing from public folders: a later public change cannot change the admin.
import { Hotel, Plane, Users } from "lucide-react";

export const ADMIN_PRODUCT_TABS = [
  { id: "flights", label: "Flights", icon: Plane },
  { id: "group-ticketing", label: "Group Ticketing", icon: Users },
  { id: "hotels", label: "Hotels", icon: Hotel },
] as const;
