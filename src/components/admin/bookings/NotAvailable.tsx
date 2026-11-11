import { Notice } from "@/components/admin/ui/feedback";
import { TABLE } from "@/components/admin/ui/classes";
import { cn } from "@/lib/utils";

/** Honest placeholder for a section whose data the gateway doesn't record yet. */
export function NotAvailableNotice({ title, children }: { title: string; children: React.ReactNode }) {
  return <Notice title={title}>{children}</Notice>;
}

/** Table with the mockup's columns and one row saying the data isn't recorded yet. */
export function NotAvailableTable({ columns, message }: { columns: string[]; message: string }) {
  return (
    <div className={cn(TABLE.wrap, "px-card py-3.5")}>
      <table className={cn(TABLE.table, "min-w-[36rem]")}>
        <thead>
          <tr className={TABLE.headRow}>
            {columns.map(column => <th key={column} scope="col" className={TABLE.th}>{column}</th>)}
          </tr>
        </thead>
        <tbody>
          <tr>
            <td colSpan={columns.length} className="px-2.5 py-3 text-body text-muted-foreground">{message}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
