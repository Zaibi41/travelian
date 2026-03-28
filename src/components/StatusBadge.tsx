import { Badge } from "@/components/ui/badge";

const statusStyles: Record<string, string> = {
  active: "bg-success/10 text-success border-success/20",
  confirmed: "bg-success/10 text-success border-success/20",
  completed: "bg-success/10 text-success border-success/20",
  pending: "bg-warning/10 text-warning border-warning/20",
  suspended: "bg-destructive/10 text-destructive border-destructive/20",
  cancelled: "bg-destructive/10 text-destructive border-destructive/20",
  rejected: "bg-destructive/10 text-destructive border-destructive/20",
  inactive: "bg-muted text-muted-foreground border-muted",
  credit: "bg-success/10 text-success border-success/20",
  debit: "bg-destructive/10 text-destructive border-destructive/20",
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <Badge variant="outline" className={`capitalize text-xs ${statusStyles[status] || ''}`}>
      {status.replace('_', ' ')}
    </Badge>
  );
}
