import { AlertCircle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export function CardGridSkeleton({ count, className }: { count: number; className?: string }) {
  return (
    <div className={cn("grid gap-card-gap", className)} aria-busy="true" aria-label="Loading figures">
      {Array.from({ length: count }, (_, index) => <Skeleton key={index} className="h-[5.25rem] rounded-lg" />)}
    </div>
  );
}

export function DashboardErrorNotice({ message }: { message: string }) {
  return (
    <div role="alert" className="flex items-start gap-2.5 rounded-lg border border-status-critical/40 bg-status-critical-soft px-card py-3 text-body text-status-critical-text">
      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      <p>{message}</p>
    </div>
  );
}
