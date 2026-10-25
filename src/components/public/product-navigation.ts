import { Hotel, MapPin, Plane, Tickets } from "lucide-react";

export const PRODUCT_TABS = [
  { id: "flights", label: "Flights", icon: Plane, href: "/" },
  { id: "group-ticketing", label: "Group Ticketing", icon: Tickets, href: "/group-ticketing" },
  { id: "hotels", label: "Hotels", icon: Hotel, href: "/hotels-search" },
  { id: "umrah", label: "Umrah", icon: MapPin, href: "/umrah-packages" },
];
