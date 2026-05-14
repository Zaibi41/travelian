import { useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AdvancedDatePicker } from "@/components/ui/advanced-date-picker";
import { CountryCodePicker } from "@/components/ui/country-code-picker";
import { CountryPicker } from "@/components/ui/country-picker";
import { Check, Shield, Lock, CreditCard, Wallet, Building2, ChevronRight, AlertCircle, ArrowLeft, Plane, Download, Globe, MapPin, Armchair } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import { SeatMap } from "@/components/booking/SeatMap";
import { saveBooking, type BookingRecord } from "@/lib/booking-store";
import { downloadETicket } from "@/lib/eticket-pdf";
import { toast } from "@/hooks/use-toast";

const steps = [
  { id: 1, label: "Traveler Details" },
  { id: 2, label: "Seats & Add-ons" },
  { id: 3, label: "Payment" },
  { id: 4, label: "Confirmation" },
];

const addons = [
  { id: "insurance", name: "Travel Insurance", desc: "Full coverage for trip cancellation, medical, and baggage", price: 29, popular: true },
  { id: "breakfast", name: "Daily Breakfast", desc: "Buffet breakfast for 2 adults, all 3 nights", price: 45 },
  { id: "transfer", name: "Airport Transfer", desc: "Private car pickup from airport to hotel", price: 35 },
  { id: "seat", name: "Preferred Seat", desc: "Choose your preferred seat on the flight", price: 15 },
  { id: "lounge", name: "Lounge Access", desc: "Airport lounge access before departure", price: 40 },
];

const currentYear = new Date().getFullYear();

export default function BookingPage() {
  const [params] = useSearchParams();
  const ctxFrom = params.get("from") || "Lahore";
  const ctxTo = params.get("to") || "Jeddah";
  const ctxFromCode = params.get("fromCode") || "LHE";
  const ctxToCode = params.get("toCode") || "JED";
  const ctxDate = params.get("date") || "Apr 15, 2025";
  const ctxAirline = params.get("airline") || "Saudi Airlines";
  const ctxFlightNo = params.get("flightNo") || "SV-702";
  const ctxCabin = params.get("cabin") || "Economy";

  const [step, setStep] = useState(1);
  const [selectedAddons, setSelectedAddons] = useState<string[]>([]);
  const [selectedSeat, setSelectedSeat] = useState<string>("");
  const [paymentMethod, setPaymentMethod] = useState("card");
  const [cardNumber, setCardNumber] = useState("");
  const [cardExpiry, setCardExpiry] = useState("");
  const [cardCvv, setCardCvv] = useState("");
  const [cardName, setCardName] = useState("");
  const [paymentTouched, setPaymentTouched] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [savedBooking, setSavedBooking] = useState<BookingRecord | null>(null);

  // Flight type — drives whether passport is required (international) or CNIC is allowed (domestic)
  const [flightType, setFlightType] = useState<"international" | "domestic">("international");
  const [docType, setDocType] = useState<"passport" | "cnic">("passport");

  // Traveler info — Pakistan-market defaults
  const [title, setTitle] = useState("mr");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [gender, setGender] = useState("");

  // Identity document
  const [dob, setDob] = useState<Date>();
  const [docNumber, setDocNumber] = useState("");
  const [nationality, setNationality] = useState("Pakistan");
  const [issuanceCountry, setIssuanceCountry] = useState("Pakistan");
  const [expiryDate, setExpiryDate] = useState<Date>();

  // Contact
  const [email, setEmail] = useState("");
  const [phoneCode, setPhoneCode] = useState("+92");
  const [phone, setPhone] = useState("");
  const [altPhoneCode, setAltPhoneCode] = useState("+92");
  const [altPhone, setAltPhone] = useState("");

  // Validation touch tracking
  const [touched, setTouched] = useState(false);

  const requiresPassport = flightType === "international" || docType === "passport";

  const toggleAddon = (id: string) => {
    setSelectedAddons(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const addonsTotal = addons.filter(a => selectedAddons.includes(a.id)).reduce((sum, a) => sum + a.price, 0);
  const baseTotal = 510;
  const taxes = 42;
  const grandTotal = baseTotal + addonsTotal + taxes;
  const bookingRef = `TRV-${Date.now().toString(36).toUpperCase().slice(-6)}`;

  // Validation
  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const phoneValid = /^\d{6,15}$/.test(phone);
  const altPhoneValid = altPhone === "" || /^\d{6,15}$/.test(altPhone);
  const docValid = requiresPassport
    ? /^[A-Z0-9]{6,12}$/i.test(docNumber)
    : /^\d{13}$/.test(docNumber.replace(/-/g, "")); // CNIC: 13 digits

  const errors = useMemo(() => {
    const e: Record<string, string> = {};
    if (!firstName.trim()) e.firstName = "First name is required";
    if (!lastName.trim()) e.lastName = "Last name is required";
    if (!dob) e.dob = "Date of birth is required";
    if (!docNumber.trim()) e.docNumber = `${requiresPassport ? "Passport" : "CNIC"} number is required`;
    else if (!docValid) e.docNumber = requiresPassport
      ? "Enter a valid passport number (6-12 letters/digits)"
      : "Enter a valid 13-digit CNIC";
    if (requiresPassport && !expiryDate) e.expiryDate = "Expiry date is required";
    if (!email.trim()) e.email = "Email is required";
    else if (!emailValid) e.email = "Enter a valid email address";
    if (!phone.trim()) e.phone = "Mobile number is required";
    else if (!phoneValid) e.phone = "Enter a valid numeric phone (6-15 digits)";
    if (!altPhoneValid) e.altPhone = "Enter a valid numeric phone (6-15 digits)";
    return e;
  }, [firstName, lastName, dob, docNumber, docValid, requiresPassport, expiryDate, email, emailValid, phone, phoneValid, altPhoneValid]);

  const isStep1Valid = Object.keys(errors).length === 0;

  const handleContinue = () => {
    setTouched(true);
    if (isStep1Valid) setStep(2);
  };

  // Numeric-only phone handler
  const onPhoneChange = (setter: (v: string) => void) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setter(e.target.value.replace(/[^\d]/g, ""));
  };

  return (
    <div className="bg-muted/20 min-h-screen">
      {/* Progress Header */}
      <div className="bg-card border-b sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <Link to="/flights-search" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="h-4 w-4" /> Back to results
            </Link>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Lock className="h-3 w-3 text-success" /> Secure Checkout
            </div>
          </div>
          <div className="flex items-center gap-2 mt-4">
            {steps.map((s, i) => (
              <div key={s.id} className="flex items-center gap-2 flex-1">
                <div className={`h-9 w-9 rounded-full flex items-center justify-center text-xs font-bold shrink-0 transition-all duration-300 ${
                  step >= s.id ? 'gradient-primary text-primary-foreground shadow-sm' : 'bg-muted text-muted-foreground'
                }`}>
                  {step > s.id ? <Check className="h-4 w-4" /> : s.id}
                </div>
                <span className={`text-xs font-medium hidden sm:block transition-colors ${step >= s.id ? 'text-foreground' : 'text-muted-foreground'}`}>
                  {s.label}
                </span>
                {i < steps.length - 1 && <div className={`h-0.5 flex-1 rounded transition-all ${step > s.id ? 'bg-primary' : 'bg-muted'}`} />}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main */}
          <div className="lg:col-span-2 space-y-6">
            {step === 1 && (
              <div className="space-y-6 animate-fade-in">
                {/* Flight type toggle (drives document logic) */}
                <Card className="shadow-card border-0">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between flex-wrap gap-3">
                      <div className="flex items-center gap-2">
                        <Globe className="h-4 w-4 text-primary" />
                        <span className="text-sm font-medium text-foreground">Flight type</span>
                      </div>
                      <div className="flex items-center bg-muted rounded-lg p-0.5">
                        {[
                          { id: "international", label: "International", icon: Globe },
                          { id: "domestic", label: "Domestic", icon: MapPin },
                        ].map(t => (
                          <button
                            key={t.id}
                            type="button"
                            onClick={() => {
                              setFlightType(t.id as any);
                              if (t.id === "international") setDocType("passport");
                            }}
                            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                              flightType === t.id ? "bg-card text-primary shadow-sm" : "text-muted-foreground hover:text-foreground"
                            }`}
                          >
                            <t.icon className="h-3.5 w-3.5" />
                            {t.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Traveler Information */}
                <Card className="shadow-card border-0">
                  <CardContent className="p-6">
                    <h2 className="text-lg font-bold text-foreground mb-1">Traveler Information</h2>
                    <p className="text-sm text-muted-foreground mb-6">Enter details exactly as shown on your identity document</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label className="text-sm font-medium">Title *</Label>
                        <Select value={title} onValueChange={setTitle}>
                          <SelectTrigger className="mt-1.5 h-11 rounded-xl">
                            <SelectValue placeholder="Select title" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="mr">Mr</SelectItem>
                            <SelectItem value="ms">Ms</SelectItem>
                            <SelectItem value="mrs">Mrs</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-sm font-medium">Gender (Optional)</Label>
                        <Select value={gender} onValueChange={setGender}>
                          <SelectTrigger className="mt-1.5 h-11 rounded-xl">
                            <SelectValue placeholder="Select gender" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="male">Male</SelectItem>
                            <SelectItem value="female">Female</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-sm font-medium">First Name *</Label>
                        <Input
                          placeholder="Given Name"
                          className="mt-1.5 h-11 rounded-xl"
                          value={firstName}
                          onChange={e => setFirstName(e.target.value)}
                        />
                        {touched && errors.firstName && <p className="text-xs text-destructive mt-1">{errors.firstName}</p>}
                      </div>
                      <div>
                        <Label className="text-sm font-medium">Last Name *</Label>
                        <Input
                          placeholder="Surnames"
                          className="mt-1.5 h-11 rounded-xl"
                          value={lastName}
                          onChange={e => setLastName(e.target.value)}
                        />
                        {touched && errors.lastName && <p className="text-xs text-destructive mt-1">{errors.lastName}</p>}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Identity Document Information */}
                <Card className="shadow-card border-0">
                  <CardContent className="p-6">
                    <h2 className="text-lg font-bold text-foreground mb-1">Identity Document Information</h2>
                    <p className="text-sm text-muted-foreground mb-6">
                      {flightType === "international"
                        ? "Passport is required for international travel"
                        : "Choose the document you'll use to travel domestically"}
                    </p>

                    {/* Doc type for domestic */}
                    {flightType === "domestic" && (
                      <div className="mb-5">
                        <Label className="text-sm font-medium">Document Type *</Label>
                        <div className="flex items-center bg-muted rounded-lg p-0.5 mt-1.5 w-fit">
                          {[
                            { id: "cnic", label: "CNIC" },
                            { id: "passport", label: "Passport" },
                          ].map(t => (
                            <button
                              key={t.id}
                              type="button"
                              onClick={() => { setDocType(t.id as any); setDocNumber(""); }}
                              className={`px-4 py-1.5 text-xs font-medium rounded-md transition-all ${
                                docType === t.id ? "bg-card text-primary shadow-sm" : "text-muted-foreground hover:text-foreground"
                              }`}
                            >
                              {t.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label className="text-sm font-medium">Date of Birth *</Label>
                        <div className="mt-1.5">
                          <AdvancedDatePicker
                            date={dob}
                            onSelect={setDob}
                            placeholder="Select date of birth"
                            fromYear={1925}
                            toYear={currentYear}
                            disabled={(d) => d > new Date()}
                          />
                        </div>
                        {touched && errors.dob && <p className="text-xs text-destructive mt-1">{errors.dob}</p>}
                      </div>
                      <div>
                        <Label className="text-sm font-medium">
                          {requiresPassport ? "Passport Number *" : "CNIC Number *"}
                        </Label>
                        <Input
                          placeholder={requiresPassport ? "e.g. AB1234567" : "e.g. 3520112345671"}
                          className="mt-1.5 h-11 rounded-xl"
                          value={docNumber}
                          onChange={e => setDocNumber(requiresPassport ? e.target.value.toUpperCase() : e.target.value.replace(/[^\d]/g, ""))}
                          maxLength={requiresPassport ? 12 : 13}
                        />
                        {touched && errors.docNumber && <p className="text-xs text-destructive mt-1">{errors.docNumber}</p>}
                      </div>
                      <div>
                        <Label className="text-sm font-medium">Nationality *</Label>
                        <div className="mt-1.5">
                          <CountryPicker value={nationality} onChange={setNationality} />
                        </div>
                      </div>
                      {requiresPassport && (
                        <>
                          <div>
                            <Label className="text-sm font-medium">Country of Issuance *</Label>
                            <div className="mt-1.5">
                              <CountryPicker value={issuanceCountry} onChange={setIssuanceCountry} />
                            </div>
                          </div>
                          <div className="md:col-span-2">
                            <Label className="text-sm font-medium">Date of Expiry *</Label>
                            <div className="mt-1.5">
                              <AdvancedDatePicker
                                date={expiryDate}
                                onSelect={setExpiryDate}
                                placeholder="Select expiry date"
                                fromYear={currentYear}
                                toYear={currentYear + 25}
                                disabled={(d) => d < new Date()}
                              />
                            </div>
                            {touched && errors.expiryDate && <p className="text-xs text-destructive mt-1">{errors.expiryDate}</p>}
                          </div>
                        </>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Contact Information */}
                <Card className="shadow-card border-0">
                  <CardContent className="p-6">
                    <h2 className="text-lg font-bold text-foreground mb-1">Contact Information</h2>
                    <p className="text-sm text-muted-foreground mb-6">We'll send your booking confirmation here</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="md:col-span-2">
                        <Label className="text-sm font-medium">Email *</Label>
                        <Input
                          type="email"
                          placeholder="your@email.com"
                          className="mt-1.5 h-11 rounded-xl"
                          value={email}
                          onChange={e => setEmail(e.target.value)}
                        />
                        {touched && errors.email && <p className="text-xs text-destructive mt-1">{errors.email}</p>}
                      </div>
                      <div className="md:col-span-2">
                        <Label className="text-sm font-medium">Mobile Number *</Label>
                        <div className="flex gap-2 mt-1.5">
                          <CountryCodePicker value={phoneCode} onChange={setPhoneCode} />
                          <Input
                            inputMode="numeric"
                            placeholder="3001234567"
                            className="h-11 rounded-xl flex-1"
                            value={phone}
                            onChange={onPhoneChange(setPhone)}
                          />
                        </div>
                        {touched && errors.phone && <p className="text-xs text-destructive mt-1">{errors.phone}</p>}
                      </div>
                      <div className="md:col-span-2">
                        <Label className="text-sm font-medium">Alternate Mobile Number</Label>
                        <div className="flex gap-2 mt-1.5">
                          <CountryCodePicker value={altPhoneCode} onChange={setAltPhoneCode} />
                          <Input
                            inputMode="numeric"
                            placeholder="3001234567"
                            className="h-11 rounded-xl flex-1"
                            value={altPhone}
                            onChange={onPhoneChange(setAltPhone)}
                          />
                        </div>
                        {touched && errors.altPhone && <p className="text-xs text-destructive mt-1">{errors.altPhone}</p>}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <div className="flex items-start gap-2 p-3 bg-accent/50 rounded-xl border border-primary/10">
                  <AlertCircle className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                  <p className="text-xs text-muted-foreground">Name must match exactly as shown on your {requiresPassport ? "passport" : "CNIC"}.</p>
                </div>
                <div className="flex justify-end">
                  <Button onClick={handleContinue} className="gradient-primary text-primary-foreground rounded-xl h-11 px-6">
                    Continue to Add-ons <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </div>
            )}

            {step === 2 && (
              <Card className="shadow-card border-0 animate-fade-in">
                <CardContent className="p-6">
                  <h2 className="text-lg font-bold text-foreground mb-1">Enhance Your Trip</h2>
                  <p className="text-sm text-muted-foreground mb-6">Add extras to make your journey even better</p>
                  <div className="space-y-3">
                    {addons.map(addon => (
                      <div
                        key={addon.id}
                        className={`border rounded-xl p-4 cursor-pointer transition-all duration-200 ${
                          selectedAddons.includes(addon.id) ? 'border-primary bg-accent/30 shadow-sm' : 'hover:border-primary/30'
                        }`}
                        onClick={() => toggleAddon(addon.id)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <Checkbox checked={selectedAddons.includes(addon.id)} />
                            <div>
                              <div className="flex items-center gap-2">
                                <h4 className="text-sm font-semibold text-foreground">{addon.name}</h4>
                                {addon.popular && <Badge className="bg-gold/10 text-gold border-0 text-[10px] rounded-md">Recommended</Badge>}
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
                    <Button variant="outline" onClick={() => setStep(1)} className="rounded-xl">Back</Button>
                    <Button onClick={() => setStep(3)} className="gradient-primary text-primary-foreground rounded-xl h-11 px-6">
                      Continue to Payment <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {step === 3 && (
              <Card className="shadow-card border-0 animate-fade-in">
                <CardContent className="p-6">
                  <h2 className="text-lg font-bold text-foreground mb-1">Payment Method</h2>
                  <p className="text-sm text-muted-foreground mb-6">Choose how you'd like to pay</p>
                  <div className="space-y-3 mb-6">
                    {[
                      { id: "card", label: "Credit/Debit Card", icon: CreditCard, desc: "Visa, Mastercard, AMEX", badges: ["💳 Visa", "💳 MC"] },
                      { id: "wallet", label: "Digital Wallet", icon: Wallet, desc: "PayPal, Apple Pay, Google Pay" },
                      { id: "bank", label: "Bank Transfer", icon: Building2, desc: "Direct bank transfer" },
                    ].map(method => (
                      <div
                        key={method.id}
                        className={`border rounded-xl p-4 cursor-pointer transition-all duration-200 ${
                          paymentMethod === method.id ? 'border-primary bg-accent/30 shadow-sm' : 'hover:border-primary/30'
                        }`}
                        onClick={() => setPaymentMethod(method.id)}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`h-11 w-11 rounded-xl flex items-center justify-center transition-all ${
                            paymentMethod === method.id ? 'gradient-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                          }`}>
                            <method.icon className="h-5 w-5" />
                          </div>
                          <div className="flex-1">
                            <h4 className="text-sm font-semibold text-foreground">{method.label}</h4>
                            <p className="text-xs text-muted-foreground">{method.desc}</p>
                          </div>
                          {method.badges && (
                            <div className="flex gap-1">
                              {method.badges.map(b => (
                                <span key={b} className="text-xs bg-muted px-2 py-0.5 rounded-md">{b}</span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  {paymentMethod === "card" && (
                    <div className="space-y-4 border-t pt-5">
                      <div>
                        <Label className="text-sm font-medium">Card Number</Label>
                        <Input placeholder="1234 5678 9012 3456" className="mt-1.5 h-11 rounded-xl" />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label className="text-sm font-medium">Expiry Date</Label>
                          <Input placeholder="MM/YY" className="mt-1.5 h-11 rounded-xl" />
                        </div>
                        <div>
                          <Label className="text-sm font-medium">CVV</Label>
                          <Input placeholder="123" className="mt-1.5 h-11 rounded-xl" />
                        </div>
                      </div>
                      <div>
                        <Label className="text-sm font-medium">Cardholder Name</Label>
                        <Input placeholder="Name on card" className="mt-1.5 h-11 rounded-xl" />
                      </div>
                    </div>
                  )}

                  <div className="flex items-start gap-2 mt-5 p-3 bg-success/5 rounded-xl border border-success/20">
                    <Lock className="h-4 w-4 text-success shrink-0 mt-0.5" />
                    <p className="text-xs text-muted-foreground">Your payment is secured with 256-bit SSL encryption. We never store your card details.</p>
                  </div>

                  <div className="flex justify-between mt-6">
                    <Button variant="outline" onClick={() => setStep(2)} className="rounded-xl">Back</Button>
                    <Button onClick={() => setStep(4)} className="gradient-primary text-primary-foreground rounded-xl h-11 px-6">
                      Pay ${grandTotal} <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {step === 4 && (
              <Card className="shadow-card border-0 animate-fade-in-up">
                <CardContent className="p-8 text-center">
                  <div className="h-20 w-20 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-5 animate-scale-in">
                    <Check className="h-10 w-10 text-success" />
                  </div>
                  <h2 className="text-2xl font-bold text-foreground mb-2">Booking Confirmed!</h2>
                  <p className="text-muted-foreground mb-6">Your reservation has been successfully processed and your E-ticket has been issued.</p>

                  <div className="bg-gradient-to-br from-primary/5 to-accent border rounded-2xl p-6 text-left max-w-lg mx-auto">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-lg gradient-primary flex items-center justify-center">
                          <Plane className="h-4 w-4 text-primary-foreground" />
                        </div>
                        <span className="font-bold text-sm">Travelian E-Ticket</span>
                      </div>
                      <Badge className="bg-success/10 text-success border-0 text-xs rounded-md">Confirmed</Badge>
                    </div>
                    <div className="space-y-3">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Booking ID</span>
                        <span className="font-bold font-mono text-foreground">{bookingRef}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Flight</span>
                        <span className="font-medium text-foreground">Saudi Airlines · SV-702</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Route</span>
                        <span className="font-medium text-foreground">Lahore → Jeddah</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Date</span>
                        <span className="font-medium text-foreground">Apr 15, 2025</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Passenger</span>
                        <span className="font-medium text-foreground">{firstName || "1"} {lastName}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Seat</span>
                        <span className="font-medium text-foreground">24A (Window)</span>
                      </div>
                      <div className="flex justify-between font-bold border-t pt-3 text-base">
                        <span>Total Paid</span>
                        <span className="text-primary">${grandTotal}</span>
                      </div>
                    </div>
                  </div>

                  <p className="text-xs text-muted-foreground mt-4">Confirmation email and E-ticket sent to your registered email address.</p>
                  <div className="flex gap-3 justify-center mt-6">
                    <Button variant="outline" className="rounded-xl gap-2">
                      <Download className="h-4 w-4" /> Download E-Ticket
                    </Button>
                    <Link to="/account">
                      <Button className="gradient-primary text-primary-foreground rounded-xl">View My Bookings</Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div>
            <Card className="sticky top-32 shadow-card border-0">
              <CardContent className="p-5">
                <div className="flex gap-3 mb-4 pb-4 border-b">
                  <div className="h-14 w-14 rounded-xl bg-accent flex items-center justify-center text-2xl shrink-0">✈️</div>
                  <div>
                    <h3 className="font-semibold text-foreground text-sm">Saudi Airlines · SV-702</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">Lahore → Jeddah</p>
                    <p className="text-xs text-muted-foreground">Apr 15, 2025 · 4h 30m</p>
                  </div>
                </div>
                <div className="space-y-2.5 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Base fare</span>
                    <span className="text-foreground font-medium">${baseTotal}</span>
                  </div>
                  {selectedAddons.length > 0 && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Add-ons ({selectedAddons.length})</span>
                      <span className="text-foreground font-medium">${addonsTotal}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Taxes & fees</span>
                    <span className="text-foreground font-medium">${taxes}</span>
                  </div>
                  <div className="flex justify-between font-bold text-base pt-2 border-t">
                    <span>Total</span>
                    <span className="text-primary">${grandTotal}</span>
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t space-y-2">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Shield className="h-3.5 w-3.5 text-success" /> Best Price Guarantee
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Lock className="h-3.5 w-3.5 text-success" /> Secure Payment
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
