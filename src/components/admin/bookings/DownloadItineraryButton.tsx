import { useMutation } from "@tanstack/react-query";
import { Download } from "lucide-react";
import { Button } from "@/components/admin/ui/button";
import { downloadItinerary } from "@/lib/admin-bookings/api";
import { GatewayError } from "@/lib/gateway/client";

/** "Download itinerary (PDF)" for a booking (Flights and Group Ticketing). The file comes from the gateway with the
 *  user's token (never a plain link) and is saved as "<booking reference>.pdf". */
export function DownloadItineraryButton({ bookingId }: { bookingId: string }) {
  const download = useMutation({ mutationFn: () => downloadItinerary(bookingId) });
  return (
    <div className="flex min-w-0 flex-col items-start gap-1 sm:items-end">
      <Button type="button" variant="outline" size="sm" className="gap-1.5" disabled={download.isPending} onClick={() => download.mutate()}>
        <Download className="h-4 w-4" aria-hidden="true" />
        {download.isPending ? "Preparing…" : "Download itinerary (PDF)"}
      </Button>
      {download.error && (
        <p role="alert" className="text-helper text-status-critical-text">
          {download.error instanceof GatewayError ? download.error.message : "The itinerary couldn't be downloaded. Try again."}
        </p>
      )}
    </div>
  );
}
