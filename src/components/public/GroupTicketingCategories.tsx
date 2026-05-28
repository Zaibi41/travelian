import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Plane, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { fetchGroupTicketCategories, type GroupTicketCategory } from "@/lib/group-ticketing";

function CategorySkeleton({ compact }: { compact: boolean }) {
  return (
    <div className={compact ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3" : "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5"}>
      {[0, 1, 2].map((item) => <div key={item} className="min-h-[150px] animate-pulse rounded-2xl bg-muted" />)}
    </div>
  );
}

export function GroupTicketingCategories({ compact = false }: { compact?: boolean }) {
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
        <p className="mt-1 text-sm text-muted-foreground">Categories are supplier-driven and will appear once the group API responds.</p>
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
        <p className="mt-1 text-sm text-muted-foreground">Travelian will show categories automatically when the supplier returns group inventory.</p>
      </div>
    );
  }

  return (
    <div className={compact ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3" : "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5"}>
      {categories.map((category) => (
        <Link
          key={category.slug}
          to={`/group-ticketing/${category.slug}`}
          className="group relative min-h-[150px] overflow-hidden rounded-2xl bg-slate-900 shadow-card transition-all hover:-translate-y-0.5 hover:shadow-elevated"
        >
          {category.image && <img src={category.image} alt="" className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" loading="lazy" />}
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/95 via-slate-950/55 to-slate-800/35" />
          <div className="relative flex h-full min-h-[150px] flex-col justify-end p-5 text-white">
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-white/15 backdrop-blur">
              <Plane className="h-5 w-5" />
            </div>
            <h3 className="text-lg font-bold">{category.label}</h3>
            <p className="mt-1 text-sm text-white/75">{category.count} available group{category.count === 1 ? "" : "s"}</p>
          </div>
        </Link>
      ))}
    </div>
  );
}
