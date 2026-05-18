import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Star, MapPin, Wifi, UtensilsCrossed, Dumbbell, Heart, Share2, ChevronLeft, ChevronRight, Check, X, Users, Calendar, Waves, Car, Coffee, Shield, Clock, Zap, ThumbsUp } from "lucide-react";
import { mockHotels } from "@/data/mock";

const rooms = [
  { id: "r1", name: "Standard Room", size: "25 mÂ²", beds: "1 King Bed", guests: 2, price: 0, breakfast: false, cancellation: true, left: 5 },
  { id: "r2", name: "Deluxe Room", size: "35 mÂ²", beds: "1 King Bed or 2 Twin", guests: 2, price: 50, breakfast: true, cancellation: true, left: 3 },
  { id: "r3", name: "Premium Suite", size: "55 mÂ²", beds: "1 King Bed + Sofa", guests: 3, price: 120, breakfast: true, cancellation: true, left: 2 },
  { id: "r4", name: "Family Suite", size: "70 mÂ²", beds: "2 King Beds", guests: 4, price: 180, breakfast: true, cancellation: false, left: 1 },
];

const reviews = [
  { name: "Ahmed K.", country: "ðŸ‡µðŸ‡°", rating: 9.4, title: "Amazing stay!", text: "Perfect location, amazing service. Highly recommend!", date: "March 2025", type: "Couple" },
  { name: "Sarah M.", country: "ðŸ‡¬ðŸ‡§", rating: 8.8, title: "Very comfortable", text: "Clean rooms, great breakfast. A bit noisy at night.", date: "February 2025", type: "Family" },
  { name: "Omar F.", country: "ðŸ‡¸ðŸ‡¦", rating: 9.6, title: "Best hotel in Makkah", text: "Walking distance to Haram. Staff is exceptionally friendly.", date: "January 2025", type: "Solo" },
];

const ratingBreakdown = [
  { label: "Cleanliness", score: 9.2 },
  { label: "Comfort", score: 9.0 },
  { label: "Location", score: 9.8 },
  { label: "Facilities", score: 8.7 },
  { label: "Staff", score: 9.4 },
  { label: "Value", score: 8.5 },
];

export default function HotelDetailPage() {
  const { id } = useParams();
  const hotel = mockHotels.find(h => h.hotelId === id) || mockHotels[0];
  const [selectedRoom, setSelectedRoom] = useState<string | null>(null);
  const [imageIndex, setImageIndex] = useState(0);

  const images = ["ðŸ¨", "ðŸ›ï¸", "ðŸŠ", "ðŸ½ï¸", "ðŸŒƒ"];

  return (
    <div>
      {/* Breadcrumb */}
      <div className="bg-muted/50 border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Link to="/" className="hover:text-primary">Home</Link>
            <span>/</span>
            <Link to="/hotels-search" className="hover:text-primary">Hotels</Link>
            <span>/</span>
            <span className="text-foreground">{hotel.name}</span>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-1 mb-1">
              {Array.from({ length: hotel.starRating }).map((_, i) => (
                <Star key={i} className="h-4 w-4 fill-warning text-warning" />
              ))}
              <Badge className="ml-2 bg-accent text-accent-foreground text-xs">Hotel</Badge>
            </div>
            <h1 className="text-2xl md:text-3xl font-bold font-display text-foreground">{hotel.name}</h1>
            <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
              <MapPin className="h-4 w-4" /> {hotel.city}, {hotel.country} Â· <a href="#map" className="text-primary hover:underline">Show on map</a>
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" className="gap-2"><Share2 className="h-4 w-4" /> Share</Button>
            <Button variant="outline" size="sm" className="gap-2"><Heart className="h-4 w-4" /> Save</Button>
            <div className="text-right">
              <div className="bg-primary text-primary-foreground text-lg font-bold px-3 py-1.5 rounded-lg">
                9.{hotel.starRating}
              </div>
              <p className="text-xs text-muted-foreground mt-1">1,234 reviews</p>
            </div>
          </div>
        </div>

        {/* Image Gallery */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-2 mb-8 rounded-2xl overflow-hidden">
          <div className="md:col-span-2 md:row-span-2 h-64 md:h-full bg-gradient-to-br from-warning/15 to-accent flex items-center justify-center relative cursor-pointer group">
            <span className="text-8xl group-hover:scale-110 transition-transform">{images[imageIndex]}</span>
            <button onClick={() => setImageIndex(i => i > 0 ? i - 1 : images.length - 1)} className="absolute left-3 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full bg-card/80 flex items-center justify-center hover:bg-card shadow">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button onClick={() => setImageIndex(i => (i + 1) % images.length)} className="absolute right-3 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full bg-card/80 flex items-center justify-center hover:bg-card shadow">
              <ChevronRight className="h-4 w-4" />
            </button>
            <Badge className="absolute bottom-3 right-3 bg-foreground/60 text-primary-foreground border-0">
              {imageIndex + 1} / {images.length}
            </Badge>
          </div>
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-32 md:h-auto bg-gradient-to-br from-accent to-muted flex items-center justify-center cursor-pointer hover:opacity-80 transition-opacity">
              <span className="text-4xl">{images[i % images.length]}</span>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Overview */}
            <Card>
              <CardContent className="p-6">
                <h2 className="text-lg font-bold text-foreground mb-3">Property Overview</h2>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {hotel.name} is a premium {hotel.starRating}-star property located in the heart of {hotel.city}, {hotel.country}. 
                  With {hotel.rooms} well-appointed rooms, world-class amenities, and exceptional service, 
                  it offers the perfect stay for both business and leisure travelers. The hotel features stunning views, 
                  multiple dining options, and is conveniently situated near major attractions.
                </p>
                <div className="flex flex-wrap gap-3 mt-4">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Users className="h-4 w-4 text-primary" /> {hotel.rooms} Rooms
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4 text-primary" /> Check-in: 3:00 PM
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="h-4 w-4 text-primary" /> Check-out: 12:00 PM
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Amenities */}
            <Card>
              <CardContent className="p-6">
                <h2 className="text-lg font-bold text-foreground mb-4">Amenities</h2>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {hotel.amenities.map(a => (
                    <div key={a} className="flex items-center gap-2 text-sm text-foreground p-2 bg-muted/50 rounded-lg">
                      <Check className="h-4 w-4 text-success shrink-0" /> {a}
                    </div>
                  ))}
                  {["Air Conditioning", "Safe", "TV", "Mini Bar", "Balcony", "City View"].map(a => (
                    <div key={a} className="flex items-center gap-2 text-sm text-foreground p-2 bg-muted/50 rounded-lg">
                      <Check className="h-4 w-4 text-success shrink-0" /> {a}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Room Selection */}
            <Card id="rooms">
              <CardContent className="p-6">
                <h2 className="text-lg font-bold text-foreground mb-4">Available Rooms</h2>
                <div className="space-y-4">
                  {rooms.map(room => (
                    <div
                      key={room.id}
                      className={`border rounded-xl p-4 transition-all cursor-pointer ${
                        selectedRoom === room.id ? 'border-primary bg-accent/30 shadow-sm' : 'hover:border-primary/50'
                      }`}
                      onClick={() => setSelectedRoom(room.id)}
                    >
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold text-foreground">{room.name}</h3>
                            {room.left <= 2 && (
                              <Badge className="bg-destructive/10 text-destructive border-0 text-[10px]">
                                <Zap className="h-3 w-3 mr-0.5" /> Only {room.left} left!
                              </Badge>
                            )}
                          </div>
                          <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground mt-1">
                            <span>{room.size}</span>
                            <span>Â·</span>
                            <span>{room.beds}</span>
                            <span>Â·</span>
                            <span className="flex items-center gap-1"><Users className="h-3 w-3" /> {room.guests} guests</span>
                          </div>
                          <div className="flex gap-2 mt-2">
                            {room.breakfast && (
                              <Badge className="bg-success/10 text-success border-0 text-[10px]">
                                <Coffee className="h-3 w-3 mr-0.5" /> Breakfast included
                              </Badge>
                            )}
                            {room.cancellation && (
                              <Badge className="bg-info/10 text-info border-0 text-[10px]">
                                Free cancellation
                              </Badge>
                            )}
                          </div>
                        </div>
                        <div className="text-right md:min-w-[140px]">
                          {room.price > 0 && (
                            <span className="text-xs text-muted-foreground line-through">
                              ${hotel.pricePerNight + room.price + 30}
                            </span>
                          )}
                          <p className="text-xl font-bold text-foreground">
                            ${hotel.pricePerNight + room.price}
                            <span className="text-xs font-normal text-muted-foreground">/night</span>
                          </p>
                          <p className="text-[10px] text-muted-foreground">+taxes & fees</p>
                          <Button
                            size="sm"
                            className={`mt-2 w-full ${selectedRoom === room.id ? 'gradient-primary text-primary-foreground' : ''}`}
                            variant={selectedRoom === room.id ? "default" : "outline"}
                          >
                            {selectedRoom === room.id ? "Selected âœ“" : "Select"}
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Reviews */}
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-lg font-bold text-foreground">Guest Reviews</h2>
                  <div className="flex items-center gap-2">
                    <div className="bg-primary text-primary-foreground text-lg font-bold px-3 py-1 rounded-lg">9.{hotel.starRating}</div>
                    <div>
                      <p className="text-sm font-semibold text-foreground">Excellent</p>
                      <p className="text-xs text-muted-foreground">1,234 reviews</p>
                    </div>
                  </div>
                </div>

                {/* Rating Breakdown */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
                  {ratingBreakdown.map(r => (
                    <div key={r.label} className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">{r.label}</span>
                      <div className="flex items-center gap-2">
                        <div className="w-20 h-1.5 bg-muted rounded-full overflow-hidden">
                          <div className="h-full bg-primary rounded-full" style={{ width: `${(r.score / 10) * 100}%` }} />
                        </div>
                        <span className="text-xs font-semibold text-foreground w-6">{r.score}</span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Individual Reviews */}
                <div className="space-y-4">
                  {reviews.map((review, i) => (
                    <div key={i} className="border-t pt-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-sm font-semibold text-primary">
                            {review.name.charAt(0)}
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-foreground">{review.name} {review.country}</p>
                            <p className="text-xs text-muted-foreground">{review.type} Â· {review.date}</p>
                          </div>
                        </div>
                        <Badge className="bg-primary text-primary-foreground text-xs">{review.rating}</Badge>
                      </div>
                      <h4 className="text-sm font-semibold text-foreground mt-3">{review.title}</h4>
                      <p className="text-sm text-muted-foreground mt-1">{review.text}</p>
                      <button className="flex items-center gap-1 text-xs text-muted-foreground mt-2 hover:text-primary">
                        <ThumbsUp className="h-3 w-3" /> Helpful
                      </button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Policies */}
            <Card>
              <CardContent className="p-6">
                <h2 className="text-lg font-bold text-foreground mb-4">Hotel Policies</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <div>
                      <h4 className="text-sm font-semibold text-foreground mb-1">Check-in</h4>
                      <p className="text-sm text-muted-foreground">From 3:00 PM</p>
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-foreground mb-1">Check-out</h4>
                      <p className="text-sm text-muted-foreground">Until 12:00 PM</p>
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-foreground mb-1">Children & Extra Beds</h4>
                      <p className="text-sm text-muted-foreground">Children of all ages are welcome. Extra beds available on request (PKR 35/night).</p>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <h4 className="text-sm font-semibold text-foreground mb-1">Cancellation Policy</h4>
                      <p className="text-sm text-muted-foreground">Free cancellation up to 48 hours before check-in. Late cancellation is charged 1 night.</p>
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-foreground mb-1">Pets</h4>
                      <p className="text-sm text-muted-foreground">Pets are not allowed.</p>
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-foreground mb-1">Payment</h4>
                      <p className="text-sm text-muted-foreground">Visa, Mastercard, AMEX, PayPal accepted. Pay at property option available.</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar - Price Summary */}
          <div className="space-y-4">
            <Card className="sticky top-28">
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <span className="text-xs text-muted-foreground line-through">PKR {Math.round(hotel.pricePerNight * 1.3)}</span>
                    <p className="text-2xl font-bold text-foreground">PKR {hotel.pricePerNight}</p>
                    <p className="text-xs text-muted-foreground">per night</p>
                  </div>
                  <Badge className="bg-destructive/10 text-destructive border-0">Save 30%</Badge>
                </div>

                <div className="space-y-3 mb-4">
                  <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
                    <Calendar className="h-4 w-4 text-primary" />
                    <div className="text-sm">
                      <p className="font-medium text-foreground">Apr 15 - Apr 18</p>
                      <p className="text-xs text-muted-foreground">3 nights</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
                    <Users className="h-4 w-4 text-primary" />
                    <div className="text-sm">
                      <p className="font-medium text-foreground">2 Adults</p>
                      <p className="text-xs text-muted-foreground">1 room</p>
                    </div>
                  </div>
                </div>

                {selectedRoom && (
                  <div className="border-t pt-3 mb-4 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">{rooms.find(r => r.id === selectedRoom)?.name}</span>
                      <span className="font-medium">PKR {hotel.pricePerNight + (rooms.find(r => r.id === selectedRoom)?.price || 0)} Ã— 3</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Taxes & fees</span>
                      <span className="font-medium">PKR 36</span>
                    </div>
                    <div className="flex justify-between text-sm font-bold border-t pt-2">
                      <span>Total</span>
                      <span className="text-primary">PKR {(hotel.pricePerNight + (rooms.find(r => r.id === selectedRoom)?.price || 0)) * 3 + 36}</span>
                    </div>
                  </div>
                )}

                <Link to={`/booking?type=hotel&id=${hotel.hotelId}${selectedRoom ? `&room=${selectedRoom}` : ''}`}>
                  <Button className="w-full gradient-primary text-primary-foreground h-11 font-semibold" disabled={!selectedRoom}>
                    {selectedRoom ? "Reserve Now" : "Select a Room"}
                  </Button>
                </Link>
                <p className="text-xs text-center text-muted-foreground mt-2">No payment needed today. Pay at the property</p>

                <div className="mt-4 space-y-2">
                  <div className="flex items-center gap-2 text-xs text-success">
                    <Shield className="h-3.5 w-3.5" /> Best price guarantee
                  </div>
                  <div className="flex items-center gap-2 text-xs text-success">
                    <Check className="h-3.5 w-3.5" /> Free cancellation available
                  </div>
                  <div className="flex items-center gap-2 text-xs text-info">
                    <Zap className="h-3.5 w-3.5" /> Booked 12 times today
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


