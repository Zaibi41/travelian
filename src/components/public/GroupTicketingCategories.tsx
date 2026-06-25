import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Plane, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { fetchGroupTicketCategories, maskCategoryForDisplay, type GroupTicketCategory } from "@/lib/group-ticketing";

function CategorySkeleton({ compact }: { compact: boolean }) {
  return (
    <div className={compact ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3" : "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5"}>
      {[0, 1, 2].map((item) => <div key={item} className="min-h-[150px] animate-pulse rounded-2xl bg-muted" />)}
    </div>
  );
}

export function GroupTicketingCategories({ compact = false }: { compact?: boolean }) {
  const { category: activeSlug } = useParams();
  const [categories, setCategories] = useState<GroupTicketCategory[]>([]);
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");

  const load = () => {
    const controller = new AbortController();
    setStatus("loading");
    fetchGroupTicketCategories(controller.signal)
      .then((items) => {
        setCategories(items);
        setStatus("success");
      })
      .catch(() => {
        setCategories([]);
        setStatus("error");
      });
    return () => controller.abort();
  };

  useEffect(load, []);

  if (status === "loading") return <CategorySkeleton compact={compact} />;

  if (status === "error") {
    return (
      <div className="rounded-2xl border bg-card p-5 shadow-card">
        <p className="text-sm font-semibold text-foreground">Group categories could not be loaded</p>
        <p className="mt-1 text-sm text-muted-foreground">The group ticketing service is temporarily unavailable. Please retry shortly or contact Travelian for the latest availability.</p>
        <Button variant="outline" size="sm" className="mt-4 rounded-xl" onClick={load}>
          <RefreshCw className="mr-2 h-4 w-4" /> Retry
        </Button>
      </div>
    );
  }

  if (categories.length === 0) {
    return (
      <div className="rounded-2xl border bg-card p-5 shadow-card">
        <p className="text-sm font-semibold text-foreground">No group ticket categories available</p>
        <p className="mt-1 text-sm text-muted-foreground">Travelian will show collections automatically when group inventory is available.</p>
      </div>
    );
  }

  return (
    <div className={compact ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3" : "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5"}>
      {categories.map((category) => {
        const display = maskCategoryForDisplay(category);
        return (
        <Link
          key={category.slug}
          to={`/group-ticketing/${category.slug}`}
          aria-current={activeSlug === category.slug ? "page" : undefined}
          className={`group relative min-h-[150px] overflow-hidden rounded-2xl bg-slate-900 shadow-card transition-all hover:-translate-y-0.5 hover:shadow-elevated ${activeSlug === category.slug ? "ring-2 ring-primary ring-offset-2 ring-offset-background" : ""}`}
        >
          {category.image && <img src={category.image} alt="" className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" loading="lazy" />}
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/95 via-slate-950/55 to-slate-800/35" />
          <div className="relative flex h-full min-h-[150px] flex-col justify-end p-5 text-white">
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-white/15 backdrop-blur">
              <Plane className="h-5 w-5" />
            </div>
            <h3 className="text-lg font-bold">{display.label}</h3>
            <p className="mt-1 text-sm text-white/75">{display.count} available group{display.count === 1 ? "" : "s"}</p>
          </div>
        </Link>
      );})}
    </div>
  );
}
