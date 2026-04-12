import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar, MapPin, Star, Heart, User, Settings, CreditCard, Gift, Clock, ChevronRight, Plane, Hotel, Download, Eye } from "lucide-react";
import { Link } from "react-router-dom";

const upcomingTrips = [
  { id: "b1", hotel: "Swissotel Al Maqam", city: "Makkah, SA", dates: "Apr 15 – Apr 18", room: "Deluxe Room", status: "confirmed", total: 1086, image: "🕋" },
  { id: "b2", hotel: "Grand Hyatt Istanbul", city: "Istanbul, TR", dates: "May 10 – May 15", room: "Premium Suite", status: "confirmed", total: 2100, image: "🕌" },
];

const pastBookings = [
  { id: "b3", hotel: "Pullman Zamzam", city: "Makkah, SA", dates: "Jan 5 – Jan 12", room: "Standard Room", status: "completed", total: 2800, image: "🏨", reviewed: true },
  { id: "b4", hotel: "Atlantis The Palm", city: "Dubai, UAE", dates: "Dec 20 – Dec 25", room: "Ocean View", status: "completed", total: 3500, image: "🏖️", reviewed: false },
];

const wishlist = [
  { name: "Hilton Suites Makkah", city: "Makkah", price: 220, rating: 8.5, stars: 4 },
  { name: "Movenpick Madinah", city: "Madinah", price: 180, rating: 8.2, stars: 4 },
  { name: "Shangri-La KL", city: "Kuala Lumpur", price: 195, rating: 9.0, stars: 5 },
];

export default function AccountPage() {
  return (
    <div className="bg-muted/30 min-h-screen">
      {/* Header */}
      <div className="gradient-hero py-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 rounded-full bg-primary/20 flex items-center justify-center text-2xl font-bold text-primary-foreground">
              AK
            </div>
            <div>
              <h1 className="text-xl font-bold text-primary-foreground">Ahmed Khan</h1>
              <p className="text-sm text-primary-foreground/60">Member since 2024 · Gold Member</p>
            </div>
            <div className="ml-auto hidden md:flex items-center gap-2">
              <Badge className="bg-warning/20 text-warning border-warning/30"><Gift className="h-3 w-3 mr-1" /> 2,450 Points</Badge>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <Tabs defaultValue="trips" className="space-y-6">
          <TabsList className="bg-card border shadow-sm h-auto p-1 flex-wrap">
            <TabsTrigger value="trips" className="gap-2 text-xs sm:text-sm"><Calendar className="h-4 w-4" /> My Trips</TabsTrigger>
            <TabsTrigger value="wishlist" className="gap-2 text-xs sm:text-sm"><Heart className="h-4 w-4" /> Wishlist</TabsTrigger>
            <TabsTrigger value="rewards" className="gap-2 text-xs sm:text-sm"><Gift className="h-4 w-4" /> Rewards</TabsTrigger>
            <TabsTrigger value="profile" className="gap-2 text-xs sm:text-sm"><User className="h-4 w-4" /> Profile</TabsTrigger>
          </TabsList>

          {/* My Trips */}
          <TabsContent value="trips" className="space-y-6">
            <div>
              <h2 className="text-lg font-bold text-foreground mb-4">Upcoming Trips</h2>
              <div className="space-y-4">
                {upcomingTrips.map(trip => (
                  <Card key={trip.id} className="overflow-hidden hover:shadow-elevated transition-all">
                    <div className="flex flex-col md:flex-row">
                      <div className="w-full md:w-40 h-32 md:h-auto bg-gradient-to-br from-primary/10 to-accent flex items-center justify-center text-5xl shrink-0">
                        {trip.image}
                      </div>
                      <CardContent className="p-5 flex-1">
                        <div className="flex items-start justify-between">
                          <div>
                            <h3 className="font-semibold text-foreground">{trip.hotel}</h3>
                            <p className="text-sm text-muted-foreground flex items-center gap-1 mt-0.5">
                              <MapPin className="h-3 w-3" /> {trip.city}
                            </p>
                            <div className="flex items-center gap-3 mt-2 text-sm text-muted-foreground">
                              <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" /> {trip.dates}</span>
                              <span>·</span>
                              <span>{trip.room}</span>
                            </div>
                          </div>
                          <div className="text-right">
                            <Badge className="bg-success/10 text-success border-0 capitalize">{trip.status}</Badge>
                            <p className="text-lg font-bold text-foreground mt-1">${trip.total}</p>
                          </div>
                        </div>
                        <div className="flex gap-2 mt-4">
                          <Button size="sm" variant="outline" className="text-xs gap-1"><Eye className="h-3 w-3" /> View Details</Button>
                          <Button size="sm" variant="outline" className="text-xs gap-1"><Download className="h-3 w-3" /> Invoice</Button>
                          <Button size="sm" variant="outline" className="text-xs text-destructive border-destructive/30 hover:bg-destructive/5">Cancel</Button>
                        </div>
                      </CardContent>
                    </div>
                  </Card>
                ))}
              </div>
            </div>

            <div>
              <h2 className="text-lg font-bold text-foreground mb-4">Past Bookings</h2>
              <div className="space-y-4">
                {pastBookings.map(trip => (
                  <Card key={trip.id} className="overflow-hidden">
                    <div className="flex flex-col md:flex-row">
                      <div className="w-full md:w-40 h-32 md:h-auto bg-gradient-to-br from-muted to-accent/50 flex items-center justify-center text-5xl shrink-0 opacity-75">
                        {trip.image}
                      </div>
                      <CardContent className="p-5 flex-1">
                        <div className="flex items-start justify-between">
                          <div>
                            <h3 className="font-semibold text-foreground">{trip.hotel}</h3>
                            <p className="text-sm text-muted-foreground flex items-center gap-1 mt-0.5">
                              <MapPin className="h-3 w-3" /> {trip.city}
                            </p>
                            <p className="text-sm text-muted-foreground mt-1">{trip.dates} · {trip.room}</p>
                          </div>
                          <div className="text-right">
                            <Badge variant="secondary" className="capitalize">{trip.status}</Badge>
                            <p className="text-lg font-bold text-foreground mt-1">${trip.total}</p>
                          </div>
                        </div>
                        <div className="flex gap-2 mt-4">
                          <Button size="sm" variant="outline" className="text-xs gap-1"><Download className="h-3 w-3" /> Invoice</Button>
                          {!trip.reviewed && (
                            <Button size="sm" className="text-xs gradient-primary text-primary-foreground">Write Review</Button>
                          )}
                          {trip.reviewed && (
                            <Badge variant="secondary" className="text-xs"><Star className="h-3 w-3 mr-1 fill-warning text-warning" /> Reviewed</Badge>
                          )}
                          <Button size="sm" variant="outline" className="text-xs">Book Again</Button>
                        </div>
                      </CardContent>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          </TabsContent>

          {/* Wishlist */}
          <TabsContent value="wishlist">
            <h2 className="text-lg font-bold text-foreground mb-4">Saved Properties ({wishlist.length})</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {wishlist.map((item, i) => (
                <Card key={i} className="overflow-hidden hover:shadow-elevated transition-all cursor-pointer group">
                  <div className="h-40 bg-gradient-to-br from-warning/10 to-accent flex items-center justify-center relative">
                    <span className="text-5xl group-hover:scale-110 transition-transform">🏨</span>
                    <button className="absolute top-3 right-3 h-8 w-8 rounded-full bg-destructive/10 flex items-center justify-center text-destructive">
                      <Heart className="h-4 w-4 fill-current" />
                    </button>
                    <div className="absolute top-3 left-3 flex gap-0.5">
                      {Array.from({ length: item.stars }).map((_, i) => <Star key={i} className="h-3 w-3 fill-warning text-warning" />)}
                    </div>
                  </div>
                  <CardContent className="p-4">
                    <h3 className="font-semibold text-foreground text-sm">{item.name}</h3>
                    <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5"><MapPin className="h-3 w-3" /> {item.city}</p>
                    <div className="flex items-end justify-between mt-3">
                      <p className="text-lg font-bold text-foreground">${item.price}<span className="text-xs font-normal text-muted-foreground">/night</span></p>
                      <Badge className="bg-primary text-primary-foreground text-xs">{item.rating}</Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Rewards */}
          <TabsContent value="rewards">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <Card className="gradient-primary text-primary-foreground">
                <CardContent className="p-5">
                  <Gift className="h-6 w-6 mb-2 opacity-80" />
                  <p className="text-3xl font-bold">2,450</p>
                  <p className="text-sm opacity-80">Total Points</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-5">
                  <Star className="h-6 w-6 text-warning mb-2" />
                  <p className="text-3xl font-bold text-foreground">Gold</p>
                  <p className="text-sm text-muted-foreground">Membership Tier</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-5">
                  <CreditCard className="h-6 w-6 text-primary mb-2" />
                  <p className="text-3xl font-bold text-foreground">$24.50</p>
                  <p className="text-sm text-muted-foreground">Credit Value</p>
                </CardContent>
              </Card>
            </div>
            <Card>
              <CardContent className="p-6">
                <h3 className="font-bold text-foreground mb-4">How to Earn Points</h3>
                <div className="space-y-3">
                  {[
                    { action: "Complete a hotel booking", points: "100 pts per $100 spent" },
                    { action: "Write a review", points: "50 pts per review" },
                    { action: "Refer a friend", points: "500 pts per referral" },
                    { action: "Book via app", points: "2x points multiplier" },
                  ].map((item, i) => (
                    <div key={i} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <span className="text-sm text-foreground">{item.action}</span>
                      <Badge variant="secondary" className="text-xs">{item.points}</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Profile */}
          <TabsContent value="profile">
            <Card>
              <CardContent className="p-6">
                <h2 className="text-lg font-bold text-foreground mb-6">Profile Settings</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm">First Name</Label>
                    <Input defaultValue="Ahmed" className="mt-1" />
                  </div>
                  <div>
                    <Label className="text-sm">Last Name</Label>
                    <Input defaultValue="Khan" className="mt-1" />
                  </div>
                  <div>
                    <Label className="text-sm">Email</Label>
                    <Input defaultValue="ahmed@email.com" className="mt-1" />
                  </div>
                  <div>
                    <Label className="text-sm">Phone</Label>
                    <Input defaultValue="+92-300-1234567" className="mt-1" />
                  </div>
                  <div>
                    <Label className="text-sm">Date of Birth</Label>
                    <Input type="date" className="mt-1" />
                  </div>
                  <div>
                    <Label className="text-sm">Nationality</Label>
                    <Input defaultValue="Pakistani" className="mt-1" />
                  </div>
                  <div>
                    <Label className="text-sm">Preferred Currency</Label>
                    <Input defaultValue="USD" className="mt-1" />
                  </div>
                  <div>
                    <Label className="text-sm">Language</Label>
                    <Input defaultValue="English" className="mt-1" />
                  </div>
                </div>
                <div className="flex justify-end mt-6">
                  <Button className="gradient-primary text-primary-foreground">Save Changes</Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
