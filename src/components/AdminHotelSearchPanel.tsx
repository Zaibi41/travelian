import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { addDays } from "date-fns";
import { Building2, Hotel } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/admin/ui/button";
import { EmptyState } from "@/components/EmptyState";
import { HotelSearchBar, type HotelSearchValues } from "@/components/public/HotelSearchBar";
import { useLocale } from "@/contexts/LocaleContext";
import { formatDateOnly } from "@/lib/date-only";
import type { Hotel as HotelModel } from "@/data/models";

export function AdminHotelSearchPanel({ hotels }: { hotels: HotelModel[] }) {
  const { formatPrice } = useLocale();
  const [searchValues, setSearchValues] = useState<HotelSearchValues>(() => ({
    location: "",
    checkIn: formatDateOnly(addDays(new Date(), 7)),
    checkOut: formatDateOnly(addDays(new Date(), 10)),
    rooms: 1,
    adults: 2,
    children: 0,
  }));
  const [submitted, setSubmitted] = useState(false);
  const activeHotels = useMemo(() => hotels.filter(hotel => hotel.status === "active"), [hotels]);
  const suggestions = useMemo(() => Array.from(new Set(activeHotels.flatMap(hotel => [hotel.city, hotel.name]).filter(Boolean))), [activeHotels]);
  const destination = searchValues.location;
  const filtered = activeHotels.filter(hotel => !submitted || !destination || hotel.city.toLowerCase().includes(destination.toLowerCase()) || hotel.name.toLowerCase().includes(destination.toLowerCase()));

  return (
    <div className="space-y-5">
      <Card className="travelian-search-card shadow-card">
        <CardContent className="space-y-5 p-5">
          <div>
            <h2 className="text-section font-bold font-display">Hotel Search</h2>
            <p className="mt-1 text-body text-muted-foreground">Search active hotel inventory from Travelian database records.</p>
          </div>
          <HotelSearchBar
            appearance="admin"
            initialValues={searchValues}
            destinationSuggestions={suggestions}
            loading={false}
            onSearch={values => { setSearchValues(values); setSubmitted(true); }}
          />
        </CardContent>
      </Card>
      {filtered.length === 0 ? (
        <EmptyState icon={Building2} title="No active hotels found" description="Published hotel records from the database will appear here. Try another destination or add active inventory from Hotel Inventory." />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {filtered.map(hotel => (
            <Card key={hotel.hotelId} className="shadow-card">
              <CardContent className="flex flex-col gap-4 p-5 sm:flex-row">
                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary"><Hotel className="h-7 w-7" /></div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-bold">{hotel.name}</h3>
                    <Badge variant="secondary">{hotel.starRating || 0} star</Badge>
                  </div>
                  <p className="mt-1 text-body text-muted-foreground">{hotel.city}, {hotel.country}</p>
                  <p className="mt-2 text-body text-muted-foreground">{hotel.amenities?.slice(0, 4).join(" / ") || "Amenities available on request"}</p>
                  <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                    <p className="font-black text-primary">From {formatPrice(hotel.pricePerNight || 0)} / night</p>
                    <Button asChild size="sm" className="rounded-xl"><Link to={`/hotel/${hotel.hotelId}`}>View / Request</Link></Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

