import { Map } from "lucide-react";
import { Button } from "@/components/ui/button";
import { WhatsAppIcon } from "@/components/public/WhatsAppIcon";

export default function TourDetailPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
      <div className="rounded-2xl border bg-card p-8 text-center shadow-card">
        <Map className="mx-auto h-12 w-12 text-muted-foreground" />
        <h1 className="mt-4 text-2xl font-bold text-foreground">Tour details are not published</h1>
        <p className="mx-auto mt-2 max-w-2xl text-sm text-muted-foreground">
          This tour package is not available from the Travelian database right now. Please contact Travelian for destination, itinerary, hotel, meals, availability and pricing.
        </p>
        <a href="https://wa.me/923244440014?text=Hello%20Travelian%2C%20please%20help%20me%20with%20tour%20package%20details." target="_blank" rel="noreferrer">
          <Button className="mt-5 rounded-xl bg-[#25D366] text-white hover:bg-[#20bd5a]">
            <WhatsAppIcon className="mr-2 h-4 w-4" /> Ask on WhatsApp
          </Button>
        </a>
      </div>
    </div>
  );
}
