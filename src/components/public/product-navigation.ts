import { Hotel, Plane, Users } from "lucide-react";
import { UmrahIcon } from "./icons/UmrahIcon";
import { useSiteSwitches } from "@/lib/site-switches";

export const PRODUCT_TABS = [
  { id: "flights", label: "Flights", icon: Plane, href: "/", match: ["/", "/flights-search"] },
  { id: "group-ticketing", label: "Group Ticketing", icon: Users, href: "/group-ticketing", match: ["/group-ticketing"] },
  { id: "hotels", label: "Hotels", icon: Hotel, href: "/hotels-search", match: ["/hotels-search", "/hotel"] },
  { id: "umrah", label: "Umrah", icon: UmrahIcon, href: "/umrah-packages", match: ["/umrah-packages", "/umrah"] },
];

/** The product tabs to show: Umrah only when the gateway's switch is on (D39). */
export function useProductTabs() {
  const { umrah } = useSiteSwitches();
  return PRODUCT_TABS.filter(tab => tab.id !== "umrah" || umrah);
}
