import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plane, Search, Clock, ArrowRight } from "lucide-react";
import { mockFlights } from "@/data/mock";

export default function PublicFlightsPage() {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const filtered = mockFlights.filter(f => {
    if (f.status === 'cancelled') return false;
    if (from && !f.origin.toLowerCase().includes(from.toLowerCase())) return false;
    if (to && !f.destination.toLowerCase().includes(to.toLowerCase())) return false;
    return true;
  });

  return (
    <div>
      <section className="bg-gradient-to-br from-sidebar to-sidebar-accent py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-3xl md:text-4xl font-bold font-display text-sidebar-accent-foreground mb-2">Search Flights</h1>
          <p className="text-sidebar-muted mb-6">Find the best deals on flights worldwide</p>
          <div className="max-w-3xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-2">
            <Input placeholder="From (city)" className="bg-card" value={from} onChange={e => setFrom(e.target.value)} />
            <Input placeholder="To (city)" className="bg-card" value={to} onChange={e => setTo(e.target.value)} />
            <Button className="gradient-primary text-primary-foreground"><Search className="h-4 w-4 mr-2" /> Search Flights</Button>
          </div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <p className="text-sm text-muted-foreground mb-4">{filtered.length} flights found</p>
        <div className="space-y-4">
          {filtered.map(flight => (
            <Card key={flight.flightId} className="hover:shadow-elevated transition-all">
              <CardContent className="p-5">
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-lg bg-accent flex items-center justify-center shrink-0">
                      <Plane className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <p className="font-semibold text-foreground">{flight.airline}</p>
                      <p className="text-xs text-muted-foreground">{flight.flightNumber} · {flight.class}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-6 flex-1 justify-center">
                    <div className="text-center">
                      <p className="text-lg font-bold text-foreground">{flight.departureTime.split(' ')[1]}</p>
                      <p className="text-xs text-muted-foreground">{flight.origin}</p>
                    </div>
                    <div className="flex flex-col items-center">
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <div className="h-px w-12 bg-border" />
                        <Plane className="h-3.5 w-3.5 text-primary" />
                        <div className="h-px w-12 bg-border" />
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-1">Direct</p>
                    </div>
                    <div className="text-center">
                      <p className="text-lg font-bold text-foreground">{flight.arrivalTime.split(' ')[1]}</p>
                      <p className="text-xs text-muted-foreground">{flight.destination}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    {flight.status === 'delayed' && <Badge variant="destructive" className="text-xs">Delayed</Badge>}
                    <div className="text-right">
                      <p className="text-2xl font-bold text-primary">${flight.price}</p>
                      <p className="text-xs text-muted-foreground">{flight.seats} seats left</p>
                    </div>
                    <Button className="gradient-primary text-primary-foreground">Select</Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
