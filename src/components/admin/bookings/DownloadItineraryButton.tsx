import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Download } from "lucide-react";
import { Button } from "@/components/admin/ui/button";
import { Checkbox } from "@/components/admin/ui/choice";
import { downloadItinerary } from "@/lib/admin-bookings/api";
import { GatewayError } from "@/lib/gateway/client";

/** "Download itinerary (PDF)" and "Download PNG" for a booking (Flights and Group Ticketing). Both come from the gateway
 *  with the user's token (never a plain link): the PDF as "<booking reference>.pdf", the PNG (the same document as an
 *  image) as "<booking reference>-itinerary.png". "Include fare" off (issue #18): the same print without the fare column
 *  and Total / Paid / Due ("-no-fare" in the file name). */
/** Shown under the buttons while the gateway says the itinerary isn't available yet (a group booking before Ticketed). */
export const ITINERARY_NOT_YET = "Available once the tickets are issued (final PNR)";

export function DownloadItineraryButton({ bookingId, available = true }: { bookingId: string; available?: boolean }) {
  const [withFare, setWithFare] = useState(true);
  const download = useMutation({ mutationFn: (format: "pdf" | "png") => downloadItinerary(bookingId, undefined, format, withFare) });
  const pending = (format: "pdf" | "png") => download.isPending && download.variables === format;
  return (
    <div className="flex min-w-0 flex-col items-start gap-1 sm:items-end">
      <div className="flex flex-wrap items-center gap-2 sm:justify-end">
        <label className="flex min-h-11 items-center gap-2 pr-1 text-body text-foreground sm:min-h-0">
          <Checkbox checked={withFare} disabled={!available} onCheckedChange={checked => setWithFare(checked === true)} />
          Include fare
        </label>
        <Button type="button" variant="outline" size="sm" className="gap-1.5" disabled={!available || download.isPending} onClick={() => download.mutate("pdf")}>
          <Download className="h-4 w-4" aria-hidden="true" />
          {pending("pdf") ? "Preparing…" : "Download itinerary (PDF)"}
        </Button>
        <Button type="button" variant="outline" size="sm" className="gap-1.5" disabled={!available || download.isPending} onClick={() => download.mutate("png")}>
          <Download className="h-4 w-4" aria-hidden="true" />
          {pending("png") ? "Preparing…" : "Download PNG"}
        </Button>
      </div>
      {!available && <p className="text-label text-muted-foreground">{ITINERARY_NOT_YET}</p>}
      {download.error && (
        <p role="alert" className="text-helper text-status-critical-text">
          {download.error instanceof GatewayError ? download.error.message : "The itinerary couldn't be downloaded. Try again."}
        </p>
      )}
    </div>
  );
}
