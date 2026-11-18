import { Helmet } from "react-helmet-async";
import { cn } from "@/lib/utils";
import { CopyPnr } from "@/components/CopyPnr";

/** The page title (and the browser tab) of a booking: the airline PNR is the code people quote, so it leads
 *  ("PNR 3E3476", with "Booking TRV-NEBO8F" beside it, smaller). Without a PNR yet (or one this viewer may not see),
 *  just "Booking TRV-NEBO8F". */
function bookingTitle(bookingId: string, pnr?: string | null) {
  return pnr ? `PNR ${pnr} · Booking ${bookingId}` : `Booking ${bookingId}`;
}

export function BookingHeading({ bookingId, pnr, className }: { bookingId: string; pnr?: string | null; className?: string }) {
  return (
    <>
      <Helmet><title>{`${bookingTitle(bookingId, pnr)} · Travelian Admin`}</title></Helmet>
      <div className="flex min-w-0 flex-wrap items-baseline gap-x-2.5 gap-y-0.5">
        <h1 className={cn("min-w-0 break-all font-display text-page-title font-bold", className)}>{pnr ? `PNR ${pnr}` : `Booking ${bookingId}`}</h1>
        {pnr && <CopyPnr pnr={pnr} className="self-center" />}
        {pnr && <span className="min-w-0 break-all text-body font-medium text-muted-foreground">Booking {bookingId}</span>}
      </div>
    </>
  );
}
