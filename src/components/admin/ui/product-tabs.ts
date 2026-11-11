// The admin's own copy of the product list and icons used by Search's tabs. Copied from the public
// site (src/components/public/product-navigation.ts and icons/UmrahIcon.tsx) so the admin looks the
// same without importing from public folders: a later public change cannot change the admin.
import { Hotel, Plane, Users } from "lucide-react";
import { UmrahIcon } from "./UmrahIcon";

export const ADMIN_PRODUCT_TABS = [
  { id: "flights", label: "Flights", icon: Plane },
  { id: "group-ticketing", label: "Group Ticketing", icon: Users },
  { id: "hotels", label: "Hotels", icon: Hotel },
  { id: "umrah", label: "Umrah", icon: UmrahIcon },
] as const;
