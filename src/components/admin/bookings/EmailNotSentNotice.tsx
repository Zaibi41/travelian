import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/admin/ui/button";
import { Notice } from "@/components/admin/ui/feedback";
import { Input } from "@/components/admin/ui/field";
import { changeCustomerEmail, resendEmail } from "@/lib/admin-bookings/api";
import { formatDateTime } from "@/lib/admin-bookings/format";
import type { BookingDetail } from "@/lib/admin-bookings/types";
import { GatewayError } from "@/lib/gateway/client";

const EMAIL_LABEL: Record<string, string> = {
  booking_held: "Seats held (pay by card)", book_only_held: "Seats held (Book Only)", bank_transfer: "Bank transfer details",
  jazzcash: "JazzCash details", payment_received: "Payment received", ticket_issued: "E-ticket", issuance_pending: "Ticket being issued",
  paid_not_ticketed: "Couldn't issue: refund or rebook", hold_expired: "Hold ended", booking_cancelled: "Booking cancelled",
  unknown: "A customer email",
};

type Problem = NonNullable<BookingDetail["customer_email_problems"]>[number];

/** One email that wasn't delivered: which one, to whom (masked), when, why in plain words, and Resend (gateway#53). */
function ProblemRow({ bookingId, problem }: { bookingId: string; problem: Problem }) {
  const queryClient = useQueryClient();
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null);
  const resend = useMutation({
    mutationFn: () => resendEmail(bookingId, problem.email),
    onSuccess: answer => {
      setResult({ ok: answer.sent, text: answer.message });
      if (answer.sent) void queryClient.invalidateQueries({ queryKey: ["admin-bookings"] });
    },
    onError: error => setResult({ ok: false, text: error instanceof GatewayError ? error.message : "The email couldn't be resent right now. Try again." }),
  });
  return (
    <li className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
      <div className="min-w-0">
        <span className="font-semibold">{EMAIL_LABEL[problem.email] ?? problem.email}</span>
        <span className="text-muted-foreground">{problem.to ? ` · to ${problem.to}` : ""} · {formatDateTime(problem.at)}</span>
        {problem.reason && <span className="block text-label">{problem.reason}</span>}
        {result && <span role="status" className={result.ok ? "block text-label font-medium text-status-fine-text" : "block text-label font-medium text-status-critical-text"}>{result.text}</span>}
      </div>
      {problem.can_resend && !problem.fix_address && (
        <Button type="button" size="sm" variant="outline" className="shrink-0 self-start" disabled={resend.isPending}
          onClick={() => { setResult(null); resend.mutate(); }}>
          {resend.isPending ? "Sending…" : "Resend email"}
        </Button>
      )}
    </li>
  );
}

/** After a bounce or a spam report (gateway#59): staff enter the corrected address; Resend then uses it. */
function FixAddressForm({ bookingId }: { bookingId: string }) {
  const queryClient = useQueryClient();
  const [email, setEmail] = useState("");
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null);
  const valid = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim());
  const save = useMutation({
    mutationFn: () => changeCustomerEmail(bookingId, email.trim()),
    onSuccess: answer => { setResult({ ok: true, text: answer.message }); setEmail(""); void queryClient.invalidateQueries({ queryKey: ["admin-bookings"] }); },
    onError: error => setResult({ ok: false, text: error instanceof GatewayError ? error.message : "The email address couldn't be saved right now. Nothing was changed." }),
  });
  return (
    <form className="mt-2 flex flex-col gap-1" onSubmit={event => { event.preventDefault(); if (valid) { setResult(null); save.mutate(); } }}>
      <label htmlFor={`fix-email-${bookingId}`} className="text-label font-medium text-foreground">Corrected email address</label>
      <div className="flex flex-col gap-2 sm:flex-row">
        <Input id={`fix-email-${bookingId}`} type="email" inputMode="email" autoComplete="off" maxLength={254} placeholder="name@example.com"
          className="min-w-0 sm:max-w-xs" value={email} onChange={event => setEmail(event.target.value)} />
        <Button type="submit" size="sm" disabled={!valid || save.isPending} className="shrink-0">{save.isPending ? "Saving…" : "Save email address"}</Button>
      </div>
      {result && <p role="status" className={result.ok ? "text-label font-medium text-status-fine-text" : "text-label font-medium text-status-critical-text"}>{result.text}</p>}
    </form>
  );
}

/** Customer emails that weren't delivered: staff resend them, fix a bounced address, or contact the customer instead. */
export function EmailNotSentNotice({ booking }: { booking: BookingDetail }) {
  const problems = booking.customer_email_problems ?? [];
  if (!problems.length) return null;
  const fixAddress = problems.some(problem => problem.fix_address);
  return (
    <Notice tone="action" title={problems.length === 1 ? "Email not sent to the customer" : `${problems.length} emails not sent to the customer`}>
      <ul className="flex flex-col gap-2">
        {problems.map(problem => <ProblemRow key={problem.email} bookingId={booking.booking_id} problem={problem} />)}
      </ul>
      {fixAddress && <FixAddressForm bookingId={booking.booking_id} />}
      <p className="mt-1">If it still doesn't arrive, contact the customer by phone or WhatsApp with these details.</p>
    </Notice>
  );
}
