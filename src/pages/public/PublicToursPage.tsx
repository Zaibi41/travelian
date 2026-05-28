import { Map, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/public/PageHeader";
import { WhatsAppIcon } from "@/components/public/WhatsAppIcon";

const categories = ["Domestic tours", "International tours", "Group tours", "Custom tours"];

export default function PublicToursPage() {
  const tours: never[] = [];

  return (
    <div>
      <PageHeader title="Tour Packages" tagline="Admin-managed domestic, international, group and custom tours" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10">
        <section>
          <h2 className="text-lg font-bold text-foreground mb-4">Tour Categories</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {categories.map((category) => (
              <div key={category} className="rounded-2xl border bg-card p-5 shadow-card">
                <Map className="h-5 w-5 text-primary" />
                <p className="mt-3 font-semibold text-foreground">{category}</p>
              </div>
            ))}
          </div>
        </section>

        {tours.length === 0 && (
          <div className="rounded-2xl border bg-card p-8 text-center shadow-card">
            <Map className="mx-auto h-12 w-12 text-muted-foreground" />
            <h2 className="mt-4 text-xl font-bold text-foreground">No tour packages are published right now</h2>
            <p className="mx-auto mt-2 max-w-2xl text-sm text-muted-foreground">
              Travelian only displays active tour packages from the database. Our team can still prepare a custom itinerary with hotels, transport, meals and availability dates.
            </p>
            <a
              href="https://wa.me/923244440014?text=Hello%20Travelian%2C%20please%20help%20me%20with%20a%20custom%20tour%20package."
              target="_blank"
              rel="noreferrer"
            >
              <Button className="mt-5 rounded-xl bg-[#25D366] text-white hover:bg-[#20bd5a]">
                <WhatsAppIcon className="mr-2 h-4 w-4" /> Request a Tour
              </Button>
            </a>
          </div>
        )}

        <section className="rounded-2xl border bg-muted/30 p-6">
          <div className="flex gap-3">
            <MessageCircle className="mt-1 h-5 w-5 text-primary" />
            <div>
              <h2 className="font-bold text-foreground">Custom tour planning</h2>
              <p className="mt-1 text-sm text-muted-foreground">Share destination, duration, hotel class, transport, meals, inclusions and preferred dates for a Travelian quote.</p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
