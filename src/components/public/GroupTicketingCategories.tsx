import { Link } from "react-router-dom";
import { Plane, Building2, Landmark, MapPin } from "lucide-react";
import type { GroupTicketCategory } from "@/lib/group-ticketing";

const categoryCards: Array<{
  slug: GroupTicketCategory;
  title: string;
  subtitle: string;
  image: string;
  icon: typeof Plane;
}> = [
  { slug: "umrah", title: "Umrah Group", subtitle: "Makkah and Madinah group seats", image: "https://images.unsplash.com/photo-1591604129939-f1efa4d9f7fa?w=900&h=600&fit=crop", icon: Landmark },
  { slug: "uae", title: "UAE Group", subtitle: "Dubai, Sharjah and Abu Dhabi", image: "https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=900&h=600&fit=crop", icon: Building2 },
  { slug: "ksa", title: "KSA Group", subtitle: "Saudi Arabia group inventory", image: "https://images.unsplash.com/photo-1580418827493-f2b22c0a76cb?w=900&h=600&fit=crop", icon: Landmark },
  { slug: "oman", title: "Oman Group", subtitle: "Muscat and Oman sectors", image: "https://images.unsplash.com/photo-1580834341580-8c17a3a630ca?w=900&h=600&fit=crop", icon: MapPin },
  { slug: "bahrain", title: "Bahrain Group", subtitle: "Bahrain group departures", image: "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=900&h=600&fit=crop", icon: Building2 },
  { slug: "kuwait", title: "Kuwait Group", subtitle: "Kuwait group ticketing", image: "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=900&h=600&fit=crop", icon: Building2 },
  { slug: "all", title: "All Available Group Tickets", subtitle: "Browse every live group ticket", image: "https://images.unsplash.com/photo-1436491865332-7a61a109cc05?w=900&h=600&fit=crop", icon: Plane },
];

export function GroupTicketingCategories({ compact = false }: { compact?: boolean }) {
  return (
    <div className={compact ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3" : "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5"}>
      {categoryCards.map((category) => (
        <Link
          key={category.slug}
          to={`/group-ticketing/${category.slug}`}
          className="group relative min-h-[150px] overflow-hidden rounded-2xl bg-slate-900 shadow-card transition-all hover:-translate-y-0.5 hover:shadow-elevated"
        >
          <img src={category.image} alt="" className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" loading="lazy" />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/45 to-slate-950/10" />
          <div className="relative flex h-full min-h-[150px] flex-col justify-end p-5 text-white">
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-white/15 backdrop-blur">
              <category.icon className="h-5 w-5" />
            </div>
            <h3 className="text-lg font-bold">{category.title}</h3>
            <p className="mt-1 text-sm text-white/75">{category.subtitle}</p>
          </div>
        </Link>
      ))}
    </div>
  );
}

export function groupCategoryLabel(slug?: string) {
  return categoryCards.find((item) => item.slug === slug)?.title || "All Available Group Tickets";
}
