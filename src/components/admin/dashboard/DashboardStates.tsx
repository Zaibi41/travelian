import { LoadingCards, Notice } from "@/components/admin/ui/feedback";

export function CardGridSkeleton({ count, className }: { count: number; className?: string }) {
  return <LoadingCards count={count} label="Loading figures" className={className} itemClassName="h-[5.25rem]" />;
}

export function DashboardErrorNotice({ message }: { message: string }) {
  return <Notice tone="critical">{message}</Notice>;
}
