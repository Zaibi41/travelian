import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Star, MapPin, Check, Shield, Lock, CreditCard, Wallet, Building2, ChevronRight, AlertCircle, Clock, Users, Calendar, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";

const steps = [
  { id: 1, label: "Guest Details" },
  { id: 2, label: "Add-ons" },
  { id: 3, label: "Payment" },
  { id: 4, label: "Confirmation" },
];

const addons = [
  { id: "insurance", name: "Travel Insurance", desc: "Full coverage for trip cancellation, medical, and baggage", price: 29, popular: true },
  { id: "breakfast", name: "Daily Breakfast", desc: "Buffet breakfast for 2 adults, all 3 nights", price: 45 },
  { id: "transfer", name: "Airport Transfer", desc: "Private car pickup from airport to hotel", price: 35 },
  { id: "earlyCheckin", name: "Early Check-in", desc: "Check in from 12:00 PM instead of 3:00 PM", price: 20 },
  { id: "lateCheckout", name: "Late Check-out", desc: "Check out until 3:00 PM instead of 12:00 PM", price: 20 },
];

export default function BookingPage() {
  const [step, setStep] = useState(1);
  const [selectedAddons, setSelectedAddons] = useState<string[]>([]);
  const [paymentMethod, setPaymentMethod] = useState("card");

  const toggleAddon = (id: string) => {
    setSelectedAddons(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const addonsTotal = addons.filter(a => selectedAddons.includes(a.id)).reduce((sum, a) => sum + a.price, 0);
  const roomTotal = 350 * 3;
  const taxes = 36;
  const grandTotal = roomTotal + addonsTotal + taxes;

  return (
    <div className="bg-muted/30 min-h-screen">
      {/* Progress */}
      <div className="bg-card border-b">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <Link to="/hotels-search" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
              <ArrowLeft className="h-4 w-4" /> Back to results
            </Link>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Lock className="h-3 w-3" /> Secure Checkout
            </div>
          </div>
          <div className="flex items-center gap-2 mt-4">
            {steps.map((s, i) => (
              <div key={s.id} className="flex items-center gap-2 flex-1">
                <div className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                  step >= s.id ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                }`}>
                  {step > s.id ? <Check className="h-4 w-4" /> : s.id}
                </div>
                <span className={`text-xs font-medium hidden sm:block ${step >= s.id ? 'text-foreground' : 'text-muted-foreground'}`}>
                  {s.label}
                </span>
                {i < steps.length - 1 && <div className={`h-0.5 flex-1 rounded ${step > s.id ? 'bg-primary' : 'bg-muted'}`} />}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main */}
          <div className="lg:col-span-2 space-y-6">
            {/* Step 1: Guest Details */}
            {step === 1 && (
              <Card>
                <CardContent className="p-6">
                  <h2 className="text-lg font-bold text-foreground mb-1">Guest Details</h2>
                  <p className="text-sm text-muted-foreground mb-6">Enter the details of the primary guest</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm">First Name *</Label>
                      <Input placeholder="Enter first name" className="mt-1" />
                    </div>
                    <div>
                      <Label className="text-sm">Last Name *</Label>
                      <Input placeholder="Enter last name" className="mt-1" />
                    </div>
                    <div>
                      <Label className="text-sm">Email *</Label>
                      <Input type="email" placeholder="your@email.com" className="mt-1" />
                    </div>
                    <div>
                      <Label className="text-sm">Phone *</Label>
                      <Input type="tel" placeholder="+1 234 567 890" className="mt-1" />
                    </div>
                    <div className="md:col-span-2">
                      <Label className="text-sm">Special Requests (optional)</Label>
                      <Input placeholder="e.g., High floor, extra pillows, quiet room..." className="mt-1" />
                    </div>
                  </div>
                  <div className="flex items-start gap-2 mt-4 p-3 bg-info/5 rounded-lg border border-info/20">
                    <AlertCircle className="h-4 w-4 text-info shrink-0 mt-0.5" />
                    <p className="text-xs text-muted-foreground">Guest name must match the ID/passport used at check-in.</p>
                  </div>
                  <div className="flex justify-end mt-6">
                    <Button onClick={() => setStep(2)} className="gradient-primary text-primary-foreground">
                      Continue to Add-ons <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Step 2: Add-ons */}
            {step === 2 && (
              <Card>
                <CardContent className="p-6">
                  <h2 className="text-lg font-bold text-foreground mb-1">Enhance Your Stay</h2>
                  <p className="text-sm text-muted-foreground mb-6">Add extras to make your trip even better</p>
                  <div className="space-y-3">
                    {addons.map(addon => (
                      <div
                        key={addon.id}
                        className={`border rounded-xl p-4 cursor-pointer transition-all ${
                          selectedAddons.includes(addon.id) ? 'border-primary bg-accent/30' : 'hover:border-primary/50'
                        }`}
                        onClick={() => toggleAddon(addon.id)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <Checkbox checked={selectedAddons.includes(addon.id)} />
                            <div>
                              <div className="flex items-center gap-2">
                                <h4 className="text-sm font-semibold text-foreground">{addon.name}</h4>
                                {addon.popular && <Badge className="bg-warning/10 text-warning border-0 text-[10px]">Popular</Badge>}
                              </div>
                              <p className="text-xs text-muted-foreground mt-0.5">{addon.desc}</p>
                            </div>
                          </div>
                          <p className="text-sm font-bold text-foreground shrink-0">+${addon.price}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-between mt-6">
                    <Button variant="outline" onClick={() => setStep(1)}>Back</Button>
                    <Button onClick={() => setStep(3)} className="gradient-primary text-primary-foreground">
                      Continue to Payment <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Step 3: Payment */}
            {step === 3 && (
              <Card>
                <CardContent className="p-6">
                  <h2 className="text-lg font-bold text-foreground mb-1">Payment Method</h2>
                  <p className="text-sm text-muted-foreground mb-6">Choose how you'd like to pay</p>
                  <div className="space-y-3 mb-6">
                    {[
                      { id: "card", label: "Credit/Debit Card", icon: CreditCard, desc: "Visa, Mastercard, AMEX" },
                      { id: "wallet", label: "Digital Wallet", icon: Wallet, desc: "PayPal, Apple Pay, Google Pay" },
                      { id: "bank", label: "Bank Transfer", icon: Building2, desc: "Direct bank transfer" },
                    ].map(method => (
                      <div
                        key={method.id}
                        className={`border rounded-xl p-4 cursor-pointer transition-all ${
                          paymentMethod === method.id ? 'border-primary bg-accent/30' : 'hover:border-primary/50'
                        }`}
                        onClick={() => setPaymentMethod(method.id)}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${
                            paymentMethod === method.id ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                          }`}>
                            <method.icon className="h-5 w-5" />
                          </div>
                          <div>
                            <h4 className="text-sm font-semibold text-foreground">{method.label}</h4>
                            <p className="text-xs text-muted-foreground">{method.desc}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {paymentMethod === "card" && (
                    <div className="space-y-4 border-t pt-4">
                      <div>
                        <Label className="text-sm">Card Number</Label>
                        <Input placeholder="1234 5678 9012 3456" className="mt-1" />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label className="text-sm">Expiry Date</Label>
                          <Input placeholder="MM/YY" className="mt-1" />
                        </div>
                        <div>
                          <Label className="text-sm">CVV</Label>
                          <Input placeholder="123" className="mt-1" />
                        </div>
                      </div>
                      <div>
                        <Label className="text-sm">Cardholder Name</Label>
                        <Input placeholder="Name on card" className="mt-1" />
                      </div>
                    </div>
                  )}

                  <div className="flex items-start gap-2 mt-4 p-3 bg-success/5 rounded-lg border border-success/20">
                    <Lock className="h-4 w-4 text-success shrink-0 mt-0.5" />
                    <p className="text-xs text-muted-foreground">Your payment is secured with 256-bit SSL encryption.</p>
                  </div>

                  <div className="flex justify-between mt-6">
                    <Button variant="outline" onClick={() => setStep(2)}>Back</Button>
                    <Button onClick={() => setStep(4)} className="gradient-primary text-primary-foreground">
                      Pay ${grandTotal} <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Step 4: Confirmation */}
            {step === 4 && (
              <Card>
                <CardContent className="p-8 text-center">
                  <div className="h-16 w-16 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-4">
                    <Check className="h-8 w-8 text-success" />
                  </div>
                  <h2 className="text-2xl font-bold text-foreground mb-2">Booking Confirmed!</h2>
                  <p className="text-muted-foreground mb-6">Your reservation has been successfully processed.</p>
                  <div className="bg-muted/50 rounded-xl p-5 text-left max-w-md mx-auto space-y-3">
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Booking ID</span>
                      <span className="text-sm font-bold text-foreground">TRV-2025-7842</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Hotel</span>
                      <span className="text-sm font-medium text-foreground">Swissotel Al Maqam</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Dates</span>
                      <span className="text-sm font-medium text-foreground">Apr 15 – Apr 18, 2025</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Room</span>
                      <span className="text-sm font-medium text-foreground">Deluxe Room</span>
                    </div>
                    <div className="flex justify-between border-t pt-2">
                      <span className="text-sm font-bold text-foreground">Total Paid</span>
                      <span className="text-sm font-bold text-primary">${grandTotal}</span>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-4">Confirmation email sent to your registered email address.</p>
                  <div className="flex gap-3 justify-center mt-6">
                    <Button variant="outline">Download Invoice</Button>
                    <Link to="/account">
                      <Button className="gradient-primary text-primary-foreground">View My Bookings</Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div>
            <Card className="sticky top-28">
              <CardContent className="p-5">
                <div className="flex gap-3 mb-4 pb-4 border-b">
                  <div className="h-16 w-16 rounded-lg bg-gradient-to-br from-warning/15 to-accent flex items-center justify-center text-2xl shrink-0">🏨</div>
                  <div>
                    <h3 className="font-semibold text-foreground text-sm">Swissotel Al Maqam</h3>
                    <div className="flex items-center gap-0.5 mt-0.5">
                      {[1, 2, 3, 4, 5].map(i => <Star key={i} className="h-3 w-3 fill-warning text-warning" />)}
                    </div>
                    <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                      <MapPin className="h-3 w-3" /> Makkah, Saudi Arabia
                    </p>
                  </div>
                </div>

                <div className="space-y-2 mb-4 pb-4 border-b">
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="h-4 w-4 text-primary" />
                    <span className="text-muted-foreground">Apr 15 – Apr 18 (3 nights)</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Users className="h-4 w-4 text-primary" />
                    <span className="text-muted-foreground">2 Adults, 1 Room</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Clock className="h-4 w-4 text-primary" />
                    <span className="text-muted-foreground">Deluxe Room</span>
                  </div>
                </div>

                {/* Price Breakdown */}
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Room ($350 × 3 nights)</span>
                    <span className="font-medium">${roomTotal}</span>
                  </div>
                  {selectedAddons.length > 0 && addons.filter(a => selectedAddons.includes(a.id)).map(a => (
                    <div key={a.id} className="flex justify-between">
                      <span className="text-muted-foreground">{a.name}</span>
                      <span className="font-medium">${a.price}</span>
                    </div>
                  ))}
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Taxes & fees</span>
                    <span className="font-medium">${taxes}</span>
                  </div>
                  <div className="flex justify-between font-bold border-t pt-2 text-base">
                    <span>Total</span>
                    <span className="text-primary">${grandTotal}</span>
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
