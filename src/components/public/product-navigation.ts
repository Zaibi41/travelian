import { Hotel, Plane, Users } from "lucide-react";
import { UmrahIcon } from "./icons/UmrahIcon";

export const PRODUCT_TABS = [
  { id: "flights", label: "Flights", icon: Plane, href: "/" },
  { id: "group-ticketing", label: "Group Ticketing", icon: Users, href: "/group-ticketing" },
  { id: "hotels", label: "Hotels", icon: Hotel, href: "/hotels-search" },
  { id: "umrah", label: "Umrah", icon: UmrahIcon, href: "/umrah-packages" },
];
