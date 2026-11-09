import { Info } from "lucide-react";

/** Honest placeholder for a section whose data the gateway doesn't record yet. */
export function NotAvailableNotice({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div role="status" className="flex items-start gap-2.5 rounded-lg border border-border bg-card px-card py-3.5 shadow-card">
      <Info className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
      <div className="flex min-w-0 flex-col gap-0.5">
        <p className="text-body font-semibold text-foreground">{title}</p>
        <p className="text-body text-muted-foreground">{children}</p>
      </div>
    </div>
  );
}

/** Table with the mockup's columns and one row saying the data isn't recorded yet. */
export function NotAvailableTable({ columns, message }: { columns: string[]; message: string }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-border bg-card px-card py-3.5 shadow-card">
      <table className="w-full min-w-[36rem] border-collapse text-table">
        <thead>
          <tr className="bg-muted text-left">
            {columns.map(column => (
              <th key={column} scope="col" className="h-table-header px-2.5 font-semibold text-foreground">{column}</th>
            ))}
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
