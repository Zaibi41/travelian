import { useId, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/admin/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/admin/ui/dialog";
import { FieldShell, Input, Textarea } from "@/components/admin/ui/field";
import { LabeledSelect } from "@/components/admin/ui/LabeledSelect";
import { Notice } from "@/components/admin/ui/feedback";
import { correctCustomerName, correctTraveler, type TravelerCorrection } from "@/lib/admin-bookings/api";
import type { BookingDetail, BookingPassenger } from "@/lib/admin-bookings/types";

/**
 * Issue 225: Super Admin corrects a traveler or the customer name on a booking. Only changed fields are sent, with a reason;
 * the gateway refuses everyone but Super Admin and logs who, when, which fields and why on the Audit tab.
 * Prices, payments and tickets are never changed here.
 */
const NAME = /^[A-Za-z][A-Za-z '-]{0,63}$/;
const TITLES = [["MR", "Mr"], ["MRS", "Mrs"], ["MISS", "Miss"], ["MASTER", "Mstr"]] as const;

type Field = { key: keyof Omit<TravelerCorrection, "reason">; label: string; type?: "date"; maxLength?: number; upper?: boolean };
const TRAVELER_FIELDS: Field[] = [
  { key: "first_name", label: "First name", maxLength: 64 },
  { key: "last_name", label: "Last name", maxLength: 64 },
  { key: "date_of_birth", label: "Date of birth", type: "date" },
  { key: "document_number", label: "Document number", maxLength: 15, upper: true },
  { key: "document_country", label: "Issuing country (3 letters)", maxLength: 3, upper: true },
  { key: "nationality", label: "Nationality (3 letters)", maxLength: 3, upper: true },
  { key: "document_expiry", label: "Document expiry", type: "date" },
];

function invalid(values: Record<string, string>): string | null {
  for (const key of ["first_name", "last_name"]) if (key in values && !NAME.test(values[key])) return "Names use letters, spaces, apostrophes or hyphens only.";
  if ("document_number" in values && !/^[A-Za-z0-9]{1,15}$/.test(values.document_number)) return "The document number is letters and digits only (up to 15).";
  for (const key of ["document_country", "nationality"]) if (key in values && !/^[A-Z]{3}$/.test(values[key])) return "Countries are 3-letter codes, e.g. PAK.";
  return null;
}

function useCorrection<T>(send: (body: T) => Promise<{ message: string }>, onClose: () => void) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: send,
    onSuccess: result => {
      toast.success(result.message);
      void queryClient.invalidateQueries({ queryKey: ["admin-bookings"] });
      onClose();
    },
  });
}

function Shell({ title, description, formId, pending, error, problem, onClose, children }: {
  title: string; description: string; formId: string; pending: boolean; error: Error | null; problem: string | null; onClose: () => void; children: React.ReactNode;
}) {
  return (
    <Dialog open onOpenChange={open => !open && onClose()}>
      {/* Header and footer stay in view; the fields scroll between them (modal rule). */}
      <DialogContent className="flex max-h-[90vh] flex-col overflow-hidden sm:max-w-lg">
        <DialogHeader className="shrink-0 pr-8">
          <DialogTitle className="truncate" title={title}>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <div className="-mx-1 flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-1 pb-1">
          {children}
          {(problem || error) && <Notice tone="critical">{problem ?? error?.message}</Notice>}
        </div>
        <DialogFooter className="shrink-0 gap-2 border-t border-border pt-3 sm:gap-2">
          <Button variant="outline" type="button" onClick={onClose}>Cancel</Button>
          <Button variant="primary" type="submit" form={formId} disabled={pending}>{pending ? "Saving…" : "Save correction"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Reason({ id, value, onChange }: { id: string; value: string; onChange: (value: string) => void }) {
  return (
    <FieldShell id={id} label="Reason for the correction">
      <Textarea id={id} rows={2} maxLength={500} value={value} onChange={event => onChange(event.target.value)} placeholder="e.g. Spelling on the passport" />
    </FieldShell>
  );
}

export function CorrectTravelerDialog({ booking, passenger, onClose }: { booking: BookingDetail; passenger: BookingPassenger; onClose: () => void }) {
  const id = useId();
  const original: Record<string, string> = Object.fromEntries([["title", passenger.title], ...TRAVELER_FIELDS.map(f => [f.key, String(passenger[f.key as keyof BookingPassenger] ?? "")])]);
  const [values, setValues] = useState(original);
  const [reason, setReason] = useState("");
  const [problem, setProblem] = useState<string | null>(null);
  const save = useCorrection((body: TravelerCorrection) => correctTraveler(booking.booking_id, passenger.position, body), onClose);
  const titles = passenger.type === "INF" ? TITLES.filter(([code]) => code === "MISS" || code === "MASTER") : TITLES;

  const submit = () => {
    const changed = Object.fromEntries(Object.entries(values).map(([k, v]) => [k, v.trim()]).filter(([k, v]) => v !== "" && v !== (original[k] ?? "")));
    if (!Object.keys(changed).length) return setProblem("Change at least one field.");
    if (reason.trim().length < 5) return setProblem("Say why this is being corrected (at least 5 characters).");
    const wrong = invalid(changed);
    if (wrong) return setProblem(wrong);
    setProblem(null);
    save.mutate({ ...changed, reason: reason.trim() } as TravelerCorrection);
  };
  const name = `${passenger.first_name} ${passenger.last_name}`;
  return (
    <Shell title={`Correct ${name}`} formId={`${id}-form`} pending={save.isPending} error={save.error} problem={problem} onClose={onClose}
      description={`Booking ${booking.booking_id}, passenger ${passenger.position + 1}. Only changed fields are saved; the change and reason are logged.${booking.pnr ? " Already sent to the airline: correct it with the airline too." : ""}`}>
      <form id={`${id}-form`} noValidate className="grid grid-cols-1 gap-3 sm:grid-cols-2" onSubmit={event => { event.preventDefault(); submit(); }}>
        <LabeledSelect id={`${id}-title`} label="Title" value={values.title} onChange={title => setValues(v => ({ ...v, title }))}
          options={titles.map(([value, label]) => ({ value, label }))} />
        {TRAVELER_FIELDS.map(field => (
          <FieldShell key={field.key} id={`${id}-${field.key}`} label={field.label}>
            <Input id={`${id}-${field.key}`} type={field.type ?? "text"} maxLength={field.maxLength} autoComplete="off" value={values[field.key]}
              onChange={event => { const next = field.upper ? event.target.value.toUpperCase() : event.target.value; setValues(v => ({ ...v, [field.key]: next })); }} />
          </FieldShell>
        ))}
        <div className="sm:col-span-2"><Reason id={`${id}-reason`} value={reason} onChange={setReason} /></div>
      </form>
    </Shell>
  );
}

export function CorrectCustomerNameDialog({ booking, onClose }: { booking: BookingDetail; onClose: () => void }) {
  const id = useId();
  const customer = booking.customer!;
  const [first, setFirst] = useState(customer.first_name);
  const [last, setLast] = useState(customer.last_name);
  const [reason, setReason] = useState("");
  const [problem, setProblem] = useState<string | null>(null);
  const save = useCorrection((body: { first_name?: string; last_name?: string; reason: string }) => correctCustomerName(booking.booking_id, body), onClose);
  const submit = () => {
    const changed: Record<string, string> = {};
    if (first.trim() !== customer.first_name) changed.first_name = first.trim();
    if (last.trim() !== customer.last_name) changed.last_name = last.trim();
    if (!Object.keys(changed).length) return setProblem("Change the first or last name.");
    if (reason.trim().length < 5) return setProblem("Say why this is being corrected (at least 5 characters).");
    const wrong = invalid(changed);
    if (wrong) return setProblem(wrong);
    setProblem(null);
    save.mutate({ ...changed, reason: reason.trim() });
  };
  return (
    <Shell title="Correct customer name" formId={`${id}-form`} pending={save.isPending} error={save.error} problem={problem} onClose={onClose}
      description={`Booking ${booking.booking_id}. The change and reason are logged. Phone and email are changed on the Payments tab.`}>
      <form id={`${id}-form`} noValidate className="grid grid-cols-1 gap-3 sm:grid-cols-2" onSubmit={event => { event.preventDefault(); submit(); }}>
        <FieldShell id={`${id}-first`} label="First name"><Input id={`${id}-first`} maxLength={64} value={first} onChange={event => setFirst(event.target.value)} /></FieldShell>
        <FieldShell id={`${id}-last`} label="Last name"><Input id={`${id}-last`} maxLength={64} value={last} onChange={event => setLast(event.target.value)} /></FieldShell>
        <div className="sm:col-span-2"><Reason id={`${id}-reason`} value={reason} onChange={setReason} /></div>
      </form>
    </Shell>
  );
}
