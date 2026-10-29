import { Hotel, Plane, Users } from "lucide-react";
import { UmrahIcon } from "./icons/UmrahIcon";

export const PRODUCT_TABS = [
  { id: "flights", label: "Flights", icon: Plane, href: "/", match: ["/", "/flights-search"] },
  { id: "group-ticketing", label: "Group Ticketing", icon: Users, href: "/group-ticketing", match: ["/group-ticketing"] },
  { id: "hotels", label: "Hotels", icon: Hotel, href: "/hotels-search", match: ["/hotels-search", "/hotel"] },
  { id: "umrah", label: "Umrah", icon: UmrahIcon, href: "/umrah-packages", match: ["/umrah-packages", "/umrah"] },
];
