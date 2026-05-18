import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Car, Clock, Luggage, MapPin, Search, Shield, Users } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SEO } from "@/components/SEO";
import { searchTransfers, type TransferOffer } from "@/lib/travelian-api";
import { useLocale } from "@/contexts/LocaleContext";

export default function PublicTransfersPage() {
  const [params, setParams] = useSearchParams();
  const { currency } = useLocale();
  const [pickup, setPickup] = useState(params.get("pickup") || "Dubai International Airport");
  const [dropoff, setDropoff] = useState(params.get("dropoff") || "Downtown Dubai");
  const [transfers, setTransfers] = useState<TransferOffer[]>([]);
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  const pickupDate = params.get("pickupDate") || new Date(Date.now() + 86400000 * 7).toISOString().slice(0, 10);
  const passengers = Number(params.get("passengers") || 1);

  useEffect(() => {
    const controller = new AbortController();
    setStatus("loading");
    setMessage("");
    searchTransfers({
      pickup: params.get("pickup") || pickup,
      dropoff: params.get("dropoff") || dropoff,
      pickupDate,
      passengers,
      currency,
    }, controller.signal)
      .then(result => {
        setTransfers(result.transfers);
        setStatus("success");
        setMessage(result.transfers.length ? "" : "No transfer offers returned.");
      })
      .catch(error => {
        if (controller.signal.aborted) return;
        setTransfers([]);
        setStatus("error");
        setMessage(error instanceof Error ? error.message : "Transfer search failed.");
      });

    return () => controller.abort();
  }, [params, currency]);

  const submitSearch = () => {
    setParams(new URLSearchParams({
      pickup,
      dropoff,
      pickupDate,
      passengers: String(passengers),
      currency,
    }));
  };

  const formatMoney = (offer: TransferOffer) => `${offer.price.currency || "PKR"} ${Math.round(offer.price.total).toLocaleString()}`;

  return (
    <div>
      <SEO title="Airport Transfers - Travelian" description="Search live Travelian airport transfer options." />
      <section className="gradient-hero py-8">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h1 className="mb-4 text-2xl font-bold text-primary-foreground md:text-3xl">Airport Transfers</h1>
          <div className="grid gap-3 rounded-2xl bg-card/10 p-4 backdrop-blur-sm md:grid-cols-[1fr_1fr_auto]">
            <div className="relative">
              <MapPin className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />
              <Input value={pickup} onChange={(event) => setPickup(event.target.value)} className="h-11 bg-card pl-9" placeholder="Pick-up location" />
            </div>
            <div className="relative">
              <MapPin className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />
              <Input value={dropoff} onChange={(event) => setDropoff(event.target.value)} className="h-11 bg-card pl-9" placeholder="Drop-off location" />
            </div>
            <Button onClick={submitSearch} className="h-11 gradient-primary text-primary-foreground">
              <Search className="mr-2 h-4 w-4" /> Search
            </Button>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">
            {status === "loading" ? "Searching Travelport transfers" : `${transfers.length} transfer options found`}
          </p>
          <p className="text-xs text-muted-foreground">{pickupDate} - {passengers} passenger{passengers > 1 ? "s" : ""}</p>
        </div>

        {status === "error" && (
          <div className="mb-4 rounded-xl border border-warning/20 bg-warning/5 px-4 py-3 text-sm text-warning">{message}</div>
        )}

        {status === "loading" && (
          <Card className="border-primary/15 shadow-card">
            <CardContent className="p-5">
              <p className="text-sm font-semibold text-foreground">Searching transfer inventory</p>
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted">
                <div className="h-full w-1/3 animate-[premiumProgress_1.8s_ease-in-out_infinite] bg-gradient-to-r from-primary via-gold to-primary" />
              </div>
            </CardContent>
          </Card>
        )}

        {status !== "loading" && transfers.length > 0 && (
          <div className="space-y-4">
            {transfers.map(offer => (
              <Card key={offer.transferId} className="overflow-hidden border-0 shadow-card hover:shadow-hover">
                <CardContent className="p-5">
                  <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div className="flex gap-4">
                      <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-accent">
                        <Car className="h-7 w-7 text-primary" />
                      </div>
                      <div>
                        <h2 className="font-semibold text-foreground">{offer.vehicleName}</h2>
                        <p className="mt-1 text-sm text-muted-foreground">{offer.pickup} to {offer.dropoff}</p>
                        <div className="mt-3 flex flex-wrap gap-3 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" /> {offer.passengers} passengers</span>
                          <span className="flex items-center gap-1"><Luggage className="h-3.5 w-3.5" /> {offer.bags} bags</span>
                          <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> {offer.durationMinutes} min</span>
                          <span className="flex items-center gap-1"><Shield className="h-3.5 w-3.5" /> {offer.cancellationPolicy}</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-foreground">{formatMoney(offer)}</p>
                      <p className="text-[10px] text-muted-foreground">total, incl. taxes</p>
                      <Link to={`/booking?type=transfer&id=${encodeURIComponent(offer.transferId)}&price=${offer.price.total}&currency=${encodeURIComponent(offer.price.currency)}`}>
                        <Button className="mt-3 rounded-xl gradient-primary text-primary-foreground">Select</Button>
                      </Link>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {status !== "loading" && transfers.length === 0 && (
          <div className="py-16 text-center">
            <Car className="mx-auto mb-4 h-14 w-14 text-muted-foreground" />
            <h2 className="mb-2 text-lg font-semibold text-foreground">No transfers found</h2>
            <p className="text-sm text-muted-foreground">{message || "Try another pick-up or drop-off location."}</p>
          </div>
        )}
      </div>
    </div>
  );
}

