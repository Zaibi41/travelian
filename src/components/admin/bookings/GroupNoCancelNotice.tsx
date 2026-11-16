/** Group fares can't be cancelled through the supplier's API, so group bookings have no Cancel action. */
export const GROUP_NO_CANCEL_TEXT = "Cancellation is not available for group fares. Unpaid holds lapse at the supplier's expiry.";

export function GroupNoCancelNotice() {
  return (
    <p role="note" className="rounded-md border border-border bg-muted px-3 py-2 text-body text-foreground">{GROUP_NO_CANCEL_TEXT}</p>
  );
}
