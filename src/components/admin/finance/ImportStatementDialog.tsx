// Import a statement (travelian#71): choose the CSV, see its columns, say which column is which, import. The gateway
// reads every amount and date; if any row can't be read, nothing is imported and the rows are listed.
import { useId, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/admin/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/admin/ui/dialog";
import { Notice } from "@/components/admin/ui/feedback";
import { LabeledSelect } from "@/components/admin/ui/LabeledSelect";
import { TABLE } from "@/components/admin/ui/classes";
import { fetchPaymentAccounts } from "@/lib/admin-bookings/api";
import { importStatement, previewStatement, type StatementImportBody, type StatementImportResult, type StatementPreview } from "@/lib/finance/api";
import { GatewayError } from "@/lib/gateway/client";
import { cn } from "@/lib/utils";

type Kind = StatementImportBody["kind"];
type Field = keyof StatementImportBody["columns"];
const NONE = "__none";
const FIELDS: Record<Kind, { field: Field; label: string; required?: boolean }[]> = {
  payfast: [{ field: "reference", label: "Transaction id", required: true }, { field: "amount", label: "Amount (gross)", required: true },
    { field: "fee", label: "Fee" }, { field: "net", label: "Net" }, { field: "date", label: "Transaction date" }, { field: "payout_date", label: "Payout date" }],
  bank: [{ field: "date", label: "Date", required: true }, { field: "description", label: "Description / narration" }, { field: "reference", label: "Reference" },
    { field: "credit", label: "Credit (money in)" }, { field: "debit", label: "Debit (money out)" }, { field: "amount", label: "Amount (if one column)" }],
  supplier: [{ field: "reference", label: "PNR or booking reference", required: true }, { field: "amount", label: "Amount charged", required: true },
    { field: "date", label: "Date" }, { field: "description", label: "Description" }],
};
const TITLE: Record<Kind, string> = { payfast: "Import PayFast settlement", bank: "Import bank statement", supplier: "Import supplier statement" };
const MAX_BYTES = 2 * 1024 * 1024;

export function ImportStatementDialog({ kind, onClose }: { kind: Kind; onClose: () => void }) {
  const id = useId();
  const queryClient = useQueryClient();
  const [file, setFile] = useState<{ name: string; content: string } | null>(null);
  const [preview, setPreview] = useState<StatementPreview | null>(null);
  const [columns, setColumns] = useState<Partial<Record<Field, string>>>({});
  const [dateFormat, setDateFormat] = useState<StatementImportBody["date_format"]>("DD/MM/YYYY");
  const [accountId, setAccountId] = useState("");
  const [providerId, setProviderId] = useState<"southair" | "sooperfare">("sooperfare");
  const [result, setResult] = useState<StatementImportResult | null>(null);
  const [problems, setProblems] = useState<string[]>([]);
  const accounts = useQuery({ queryKey: ["admin-bookings", "payment-accounts"], queryFn: ({ signal }) => fetchPaymentAccounts({ signal }), enabled: kind === "bank" });

  const read = useMutation({
    mutationFn: async (picked: File) => {
      if (picked.size > MAX_BYTES) throw new Error("The file is larger than 2 MB. Split it by month.");
      const content = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result ?? ""));
        reader.onerror = () => reject(new Error("The file couldn't be read. Try again."));
        reader.readAsText(picked);
      });
      setFile({ name: picked.name, content });
      return previewStatement(picked.name, content);
    },
    onSuccess: data => { setPreview(data); setColumns({}); setProblems([]); },
  });
  const save = useMutation({
    mutationFn: () => importStatement({
      kind, file_name: file!.name, content: file!.content, columns, date_format: dateFormat,
      account_id: kind === "bank" ? accountId : null, provider_id: kind === "supplier" ? providerId : null,
    }),
    onSuccess: data => {
      setResult(data);
      toast.success("Statement imported.");
      void queryClient.invalidateQueries({ queryKey: ["finance", "recon"] });
    },
    onError: error => setProblems(error instanceof GatewayError && Array.isArray(error.extra.problems) ? error.extra.problems as string[] : []),
  });
  const fields = FIELDS[kind];
  const missing = fields.filter(f => f.required && !columns[f.field]).map(f => f.label);
  const bankNeedsAmount = kind === "bank" && !columns.credit && !columns.amount;
  const ready = !!preview && !missing.length && !bankNeedsAmount && (kind !== "bank" || !!accountId);

  return (
    <Dialog open onOpenChange={open => !open && !save.isPending && onClose()}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>{TITLE[kind]}</DialogTitle>
          <DialogDescription>A CSV file up to 2 MB. Nothing in Travelian's payments or bookings is changed by an import.</DialogDescription>
        </DialogHeader>
        {result ? (
          <div className="flex flex-col gap-2 text-body" role="status">
            <p className="font-semibold">{result.lines} line{result.lines === 1 ? "" : "s"} imported.</p>
            <ul className="list-disc pl-5 text-muted-foreground">
              {result.matched > 0 && <li>{result.matched} matched</li>}
              {result.suggested > 0 && <li>{result.suggested} with a suggested match: confirm or reject each one</li>}
              {result.unmatched > 0 && <li>{result.unmatched} not matched</li>}
              {result.fees_recorded > 0 && <li>{result.fees_recorded} PayFast fee{result.fees_recorded === 1 ? "" : "s"} recorded on payments</li>}
              <li>{result.mismatches_added} new mismatch{result.mismatches_added === 1 ? "" : "es"} to work through</li>
            </ul>
          </div>
        ) : (
          <form id={id} className="flex flex-col gap-3" onSubmit={event => { event.preventDefault(); if (ready) save.mutate(); }}>
            <label className="flex flex-col gap-1 text-label text-muted-foreground">
              CSV file
              <input type="file" accept=".csv,text/csv" className="text-body text-foreground file:mr-3 file:h-control file:rounded-md file:border file:bg-background file:px-3 file:text-body"
                onChange={event => { const picked = event.target.files?.[0]; if (picked) read.mutate(picked); }} />
            </label>
            {read.error && <Notice tone="critical">{read.error.message}</Notice>}
            {kind === "bank" && (
              <LabeledSelect id={`${id}-account`} label="Receiving account" value={accountId || NONE} onChange={value => setAccountId(value === NONE ? "" : value)}
                options={[{ value: NONE, label: "Choose the account" }, ...(accounts.data?.accounts ?? []).map(a => ({ value: a.id, label: a.label }))]} />
            )}
            {kind === "supplier" && (
              <LabeledSelect id={`${id}-supplier`} label="Supplier" value={providerId} onChange={value => setProviderId(value as "southair" | "sooperfare")}
                options={[{ value: "sooperfare", label: "SooperFare" }, { value: "southair", label: "Southair" }]} />
            )}
            {preview && (
              <>
                <p className="text-body text-muted-foreground">{preview.rows} row{preview.rows === 1 ? "" : "s"}. Say which column holds what:</p>
                <div className="grid gap-3 sm:grid-cols-2">
                  {fields.map(f => (
                    <LabeledSelect key={f.field} id={`${id}-${f.field}`} label={`${f.label}${f.required ? "" : " (optional)"}`} value={columns[f.field] ?? NONE}
                      onChange={value => setColumns(current => ({ ...current, [f.field]: value === NONE ? undefined : value }))}
                      options={[{ value: NONE, label: "Not in this file" }, ...preview.columns.filter(Boolean).map(column => ({ value: column, label: column }))]} />
                  ))}
                  <LabeledSelect id={`${id}-date-format`} label="Dates are written as" value={dateFormat}
                    onChange={value => setDateFormat(value as StatementImportBody["date_format"])}
                    options={preview.date_formats.map(format => ({ value: format, label: format }))} />
                </div>
                <div className={cn(TABLE.wrap, "shadow-none")}>
                  <table className={cn(TABLE.table, "min-w-[30rem]")} aria-label="First rows of the file">
                    <thead><tr className={TABLE.headRow}>{preview.columns.map((c, i) => <th key={i} scope="col" className={TABLE.th}>{c}</th>)}</tr></thead>
                    <tbody>{preview.sample.map((row, r) => <tr key={r} className={TABLE.row}>{row.map((cell, c) => <td key={c} className={cn(TABLE.td, "max-w-[12rem] truncate")} title={cell}>{cell}</td>)}</tr>)}</tbody>
                  </table>
                </div>
                {(missing.length > 0 || bankNeedsAmount) && (
                  <p className="text-label text-muted-foreground">Still to choose: {[...missing, ...(bankNeedsAmount ? ["Credit or Amount"] : [])].join(", ")}.</p>
                )}
              </>
            )}
            {save.error && (
              <Notice tone="critical" title={save.error.message}>
                {problems.length > 0 && <ul className="list-disc pl-5">{problems.slice(0, 10).map(problem => <li key={problem}>{problem}</li>)}</ul>}
              </Notice>
            )}
          </form>
        )}
        <DialogFooter className="sticky bottom-0 gap-2 border-t bg-background pt-3">
          <Button variant="outline" onClick={onClose} disabled={save.isPending}>{result ? "Close" : "Cancel"}</Button>
          {!result && <Button type="submit" form={id} variant="primary" disabled={!ready || save.isPending}>{save.isPending ? "Importing…" : "Import"}</Button>}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
