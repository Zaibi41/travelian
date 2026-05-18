import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plane, Clock, Luggage, ArrowLeftRight, Shield, Coffee, Wifi, ChevronRight, Check, X, Users, Calendar, MapPin, ArrowRight, Award, Briefcase, Star } from "lucide-react";
import { mockFlights } from "@/data/mock";

const fareOptions = [
  {
    tier: "Basic",
    tag: null,
    features: [
      { label: "1 carry-on bag (7 kg)", included: true },
      { label: "Checked baggage", included: false },
      { label: "Seat selection", included: false },
      { label: "Flight changes", included: false },
      { label: "Cancellation refund", included: false },
    ],
    extra: 0,
  },
  {
    tier: "Standard",
    tag: "Most Popular",
    features: [
      { label: "1 carry-on bag (7 kg)", included: true },
      { label: "1 checked bag (23 kg)", included: true },
      { label: "Seat selection", included: true },
      { label: "Flight changes (PKR 14,000 fee)", included: true },
      { label: "Partial refund (50%)", included: true },
    ],
    extra: 60,
  },
  {
    tier: "Flex",
    tag: "Best Value",
    features: [
      { label: "1 carry-on bag (7 kg)", included: true },
      { label: "2 checked bags (23 kg each)", included: true },
      { label: "Priority seat selection", included: true },
      { label: "Free unlimited changes", included: true },
      { label: "Full refund anytime", included: true },
      { label: "Priority boarding", included: true },
      { label: "Lounge access", included: true },
    ],
    extra: 130,
  },
];

export default function FlightDetailPage() {
  const { id } = useParams();
  const flight = mockFlights.find(f => f.flightId === id) || mockFlights[0];
  const [selectedFare, setSelectedFare] = useState("Standard");

  const getDuration = (dep: string, arr: string) => {
    const ms = new Date(arr).getTime() - new Date(dep).getTime();
    return `${Math.floor(ms / 3600000)}h ${Math.round((ms % 3600000) / 60000)}m`;
  };

  const selectedFareData = fareOptions.find(f => f.tier === selectedFare)!;
  const totalPrice = flight.price + selectedFareData.extra;
  const formatMoney = (amount: number) => `PKR ${Math.round(amount).toLocaleString()}`;

  return (
    <div className="bg-muted/20 min-h-screen">
      {/* Breadcrumb */}
      <div className="bg-card border-b">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Link to="/" className="hover:text-primary">Home</Link>
            <span>/</span>
            <Link to="/flights-search" className="hover:text-primary">Flights</Link>
            <span>/</span>
            <span className="text-foreground">{flight.origin} → {flight.destination}</span>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Flight Summary */}
        <Card className="shadow-card border-0 mb-6 animate-fade-in">
          <CardContent className="p-6">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
              <div className="flex items-center gap-5 flex-1">
                <div className="h-16 w-16 rounded-2xl bg-accent flex items-center justify-center shrink-0">
                  <Plane className="h-8 w-8 text-primary" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h1 className="text-lg font-bold text-foreground">{flight.airline}</h1>
                    <Badge variant="secondary" className="rounded-md">{flight.flightNumber}</Badge>
                    <Badge variant="outline" className="capitalize rounded-md">{flight.class}</Badge>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-foreground">{flight.departureTime.split(' ')[1]}</p>
                      <p className="text-sm text-muted-foreground">{flight.origin}</p>
                      <p className="text-xs text-muted-foreground">{flight.departureTime.split(' ')[0]}</p>
                    </div>
                    <div className="flex-1 flex flex-col items-center px-4">
                      <span className="text-xs text-muted-foreground font-medium">{getDuration(flight.departureTime, flight.arrivalTime)}</span>
                      <div className="w-full h-px bg-border my-2 relative">
                        <div className="absolute left-0 top-1/2 -translate-y-1/2 h-3 w-3 rounded-full border-2 border-primary bg-card" />
                        <Plane className="absolute left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2 h-4 w-4 text-primary" />
                        <div className="absolute right-0 top-1/2 -translate-y-1/2 h-3 w-3 rounded-full bg-primary" />
                      </div>
                      <span className="text-xs text-success font-medium">Non-stop</span>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-foreground">{flight.arrivalTime.split(' ')[1]}</p>
                      <p className="text-sm text-muted-foreground">{flight.destination}</p>
                      <p className="text-xs text-muted-foreground">{flight.arrivalTime.split(' ')[0]}</p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="text-right lg:border-l lg:pl-6">
                <p className="text-3xl font-bold text-foreground">{formatMoney(totalPrice)}</p>
                <p className="text-xs text-muted-foreground">per person, all inclusive</p>
                <div className="flex items-center gap-2 mt-2 justify-end text-xs text-muted-foreground">
                  <Wifi className="h-3.5 w-3.5" /> WiFi
                  <Coffee className="h-3.5 w-3.5 ml-2" /> Meals
                  <Briefcase className="h-3.5 w-3.5 ml-2" /> Baggage
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Fare Options */}
          <div className="lg:col-span-2 space-y-6">
            <h2 className="text-lg font-bold text-foreground">Choose Your Fare</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {fareOptions.map(fare => (
                <Card
                  key={fare.tier}
                  className={`cursor-pointer transition-all duration-300 border-0 shadow-card hover:shadow-hover relative ${
                    selectedFare === fare.tier ? "ring-2 ring-primary shadow-hover" : ""
                  } ${fare.tag === "Most Popular" ? "shadow-premium" : ""}`}
                  onClick={() => setSelectedFare(fare.tier)}
                >
                  {fare.tag && (
                    <Badge className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-gold text-gold-foreground border-0 text-[10px] z-10 rounded-md">
                      {fare.tag}
                    </Badge>
                  )}
                  <CardContent className="p-5">
                    <h3 className="font-bold text-foreground">{fare.tier}</h3>
                    <p className="text-2xl font-bold text-foreground mt-1">{formatMoney(flight.price + fare.extra)}</p>
                    <p className="text-[10px] text-muted-foreground mb-4">per person</p>
                    <div className="space-y-2">
                      {fare.features.map(f => (
                        <div key={f.label} className="flex items-start gap-2">
                          {f.included ? (
                            <Check className="h-3.5 w-3.5 text-success shrink-0 mt-0.5" />
                          ) : (
                            <X className="h-3.5 w-3.5 text-muted-foreground/40 shrink-0 mt-0.5" />
                          )}
                          <span className={`text-xs ${f.included ? "text-foreground" : "text-muted-foreground/60 line-through"}`}>
                            {f.label}
                          </span>
                        </div>
                      ))}
                    </div>
                    <Button
                      className={`w-full mt-4 rounded-xl ${selectedFare === fare.tier ? "gradient-primary text-primary-foreground" : ""}`}
                      variant={selectedFare === fare.tier ? "default" : "outline"}
                      size="sm"
                    >
                      {selectedFare === fare.tier ? "Selected ✓" : "Select"}
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Flight Policies */}
            <Card className="shadow-card border-0">
              <CardContent className="p-6">
                <h2 className="text-lg font-bold text-foreground mb-4">Flight Policies</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <div>
                      <h4 className="text-sm font-semibold text-foreground mb-1 flex items-center gap-2">
                        <Luggage className="h-4 w-4 text-primary" /> Baggage
                      </h4>
                      <p className="text-sm text-muted-foreground">Carry-on: 7 kg included. Checked baggage varies by fare type.</p>
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-foreground mb-1 flex items-center gap-2">
                        <ArrowLeftRight className="h-4 w-4 text-primary" /> Changes
                      </h4>
                      <p className="text-sm text-muted-foreground">Basic: No changes. Standard: PKR 14,000 fee. Flex: Free unlimited changes.</p>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <h4 className="text-sm font-semibold text-foreground mb-1 flex items-center gap-2">
                        <Shield className="h-4 w-4 text-primary" /> Refund
                      </h4>
                      <p className="text-sm text-muted-foreground">Basic: Non-refundable. Standard: 50% refund. Flex: Full refund.</p>
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-foreground mb-1 flex items-center gap-2">
                        <Clock className="h-4 w-4 text-primary" /> Check-in
                      </h4>
                      <p className="text-sm text-muted-foreground">Online check-in opens 24 hours before departure.</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Booking Summary Sidebar */}
          <div>
            <Card className="sticky top-28 shadow-card border-0">
              <CardContent className="p-5">
                <h3 className="font-bold text-foreground mb-4">Booking Summary</h3>
                <div className="space-y-3 mb-4 pb-4 border-b">
                  <div className="flex items-center gap-2 text-sm">
                    <Plane className="h-4 w-4 text-primary" />
                    <span className="text-muted-foreground">{flight.airline} · {flight.flightNumber}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <MapPin className="h-4 w-4 text-primary" />
                    <span className="text-muted-foreground">{flight.origin} → {flight.destination}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="h-4 w-4 text-primary" />
                    <span className="text-muted-foreground">{flight.departureTime.split(' ')[0]}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Clock className="h-4 w-4 text-primary" />
                    <span className="text-muted-foreground">{getDuration(flight.departureTime, flight.arrivalTime)} · Non-stop</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Users className="h-4 w-4 text-primary" />
                    <span className="text-muted-foreground">1 Adult</span>
                  </div>
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Base fare ({selectedFare})</span>
                    <span className="font-medium">{formatMoney(totalPrice - 42)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Taxes & fees</span>
                    <span className="font-medium">{formatMoney(42)}</span>
                  </div>
                  <div className="flex justify-between font-bold border-t pt-2 text-base">
                    <span>Total</span>
                    <span className="text-primary">{formatMoney(totalPrice)}</span>
                  </div>
                </div>

                <Link to="/booking">
                  <Button className="w-full gradient-primary text-primary-foreground h-12 font-semibold mt-5 rounded-xl">
                    Book Now <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </Link>

                <div className="mt-4 space-y-2">
                  <div className="flex items-center gap-2 text-xs text-success">
                    <Shield className="h-3.5 w-3.5" /> Secure booking guaranteed
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gold">
                    <Award className="h-3.5 w-3.5" /> Best price guarantee
                  </div>
                  <div className="flex items-center gap-2 text-xs text-info">
                    <Star className="h-3.5 w-3.5" /> Trusted by 2M+ travelers
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
