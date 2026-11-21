// "I've paid": the customer uploads the bank transfer / JazzCash slip (gateway#56). The file goes straight to private
// storage through a link the gateway signs; the gateway checks it and alerts Travelian's staff. The booking is not paid
// until staff confirm the money arrived. JPG, PNG, WebP or PDF, at most 5 MB.
import { useId, useRef, useState } from "react";
import { CheckCircle2, FileUp, Loader2 } from "lucide-react";
import { PublicBookingError, SLIP_TYPES, slipFileProblem, uploadPaymentSlip, type BookingAccess, type SlipDetails } from "@/lib/public-booking";
import { cn } from "@/lib/utils";

type State = { kind: "idle" } | { kind: "uploading"; percent: number } | { kind: "done"; message: string } | { kind: "error"; message: string };

/** `details.method` unknown (My Bookings lookup): the customer says how they paid. */
export function PaymentSlipUpload({ reference, access, details }: {
  reference: string; access: BookingAccess; details: Omit<SlipDetails, "method"> & { method?: SlipDetails["method"] };
}) {
  const inputId = useId();
  const refId = useId();
  const input = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [payerReference, setPayerReference] = useState("");
  const [state, setState] = useState<State>({ kind: "idle" });
  const [method, setMethod] = useState<SlipDetails["method"]>(details.method ?? "bank_transfer");

  const pick = (chosen: File | null) => {
    setFile(chosen);
    const problem = chosen ? slipFileProblem(chosen) : null;
    setState(problem ? { kind: "error", message: problem } : { kind: "idle" });
  };
  const send = async () => {
    if (!file) return;
    setState({ kind: "uploading", percent: 0 });
    try {
      const result = await uploadPaymentSlip(reference, file, { ...details, method: details.method ?? method, payerReference: payerReference.trim() || undefined }, access,
        percent => setState({ kind: "uploading", percent }));
      setState({ kind: "done", message: result.message });
    } catch (error) {
      setState({ kind: "error", message: error instanceof PublicBookingError ? error.message : "The slip couldn't be sent. Please try again." });
    }
  };

  if (state.kind === "done") {
    return (
      <div role="status" className="flex items-start gap-3 rounded-xl border border-success/30 bg-success/10 p-3 text-sm text-foreground">
        <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-success" aria-hidden="true" />
        <p>{state.message}</p>
      </div>
    );
  }
  const busy = state.kind === "uploading";
  return (
    <section aria-labelledby={`${inputId}-title`} className="space-y-3 rounded-xl border bg-card p-3 sm:p-4">
      <div>
        <h3 id={`${inputId}-title`} className="text-sm font-semibold text-foreground">Already paid? Upload your payment slip</h3>
        <p className="text-xs text-muted-foreground">A screenshot or PDF of the transfer receipt. JPG, PNG, WebP or PDF, up to 5 MB.</p>
      </div>
      {!details.method && (
        <fieldset className="flex flex-wrap gap-2">
          <legend className="mb-1 text-xs font-medium text-muted-foreground">How did you pay?</legend>
          {([["bank_transfer", "Bank transfer"], ["jazzcash", "JazzCash"]] as const).map(([value, label]) => (
            <label key={value} className={cn("inline-flex h-11 cursor-pointer items-center gap-2 rounded-lg border px-3 text-sm font-medium focus-within:ring-2 focus-within:ring-ring",
              method === value ? "border-primary bg-primary/5 text-primary" : "text-foreground")}>
              <input type="radio" name={`${inputId}-method`} value={value} checked={method === value} onChange={() => setMethod(value)} className="sr-only" />
              {label}
            </label>
          ))}
        </fieldset>
      )}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <input ref={input} id={inputId} type="file" accept={SLIP_TYPES.join(",")} className="sr-only" disabled={busy}
          onChange={event => pick(event.target.files?.[0] ?? null)} />
        <label htmlFor={inputId} className={cn("inline-flex h-11 shrink-0 cursor-pointer items-center justify-center gap-2 rounded-lg border px-4 text-sm font-semibold text-primary hover:bg-primary/5 focus-within:ring-2 focus-within:ring-ring",
          busy && "pointer-events-none opacity-60")}>
          <FileUp className="h-4 w-4" aria-hidden="true" /> {file ? "Choose another file" : "Choose file"}
        </label>
        <span className="min-w-0 truncate text-sm text-muted-foreground" title={file?.name}>{file ? file.name : "No file chosen"}</span>
      </div>
      <div className="space-y-1">
        <label htmlFor={refId} className="block text-xs font-medium text-muted-foreground">Your transaction ID (optional)</label>
        <input id={refId} value={payerReference} onChange={event => setPayerReference(event.target.value)} maxLength={64} disabled={busy}
          className="h-11 w-full rounded-lg border bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
      </div>
      {busy && (
        <div className="space-y-1" role="status" aria-live="polite">
          <div className="h-2 overflow-hidden rounded-full bg-muted" aria-hidden="true">
            <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${state.percent}%` }} />
          </div>
          <p className="text-xs text-muted-foreground">Uploading… {state.percent}%</p>
        </div>
      )}
      {state.kind === "error" && <p role="alert" className="text-sm font-medium text-destructive">{state.message}</p>}
      <button type="button" onClick={send} disabled={!file || busy || state.kind === "error"}
        className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50 sm:w-auto">
        {busy && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />} Send slip
      </button>
    </section>
  );
}
