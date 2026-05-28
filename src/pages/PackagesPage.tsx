import { useState } from "react";
import { CalendarDays, Hotel, Package, Plus, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/EmptyState";
import { PricingBreakdownCard } from "@/components/PricingBreakdownCard";
import { useAdmin } from "@/contexts/AdminStore";
import { toast } from "sonner";

type FlightDateRow = {
  outboundDate: string;
  outboundRoute: string;
  returnDate: string;
  returnRoute: string;
};

type HotelOptionRow = {
  label: string;
  makkahHotel: string;
  makkahInfo: string;
  madinahHotel: string;
  madinahInfo: string;
  sharing: string;
  quad: string;
  triple: string;
  double: string;
};

const emptyFlightDate = (): FlightDateRow => ({ outboundDate: "", outboundRoute: "", returnDate: "", returnRoute: "" });
const emptyHotelOption = (): HotelOptionRow => ({
  label: "",
  makkahHotel: "",
  makkahInfo: "",
  madinahHotel: "",
  madinahInfo: "",
  sharing: "",
  quad: "",
  triple: "",
  double: "",
});

const toNumber = (value: string) => {
  const next = Number(value);
  return Number.isFinite(next) && next > 0 ? next : undefined;
};

export default function PackagesPage() {
  const { packages, addPackage } = useAdmin();
  const [form, setForm] = useState({
    title: "",
    type: "premium",
    makkahHotel: "",
    makkahHotelInfo: "",
    madinahHotel: "",
    madinahHotelInfo: "",
    roomSharing: "",
    duration: "",
    departureCity: "",
    status: "draft",
    seatsLabel: "",
    transportIncluded: "yes",
    visaIncluded: "yes",
    ticketIncluded: "yes",
    mealsIncluded: "no",
    image: "",
    terms: "",
    childPrice: "",
    infantPrice: "",
  });
  const [flightDates, setFlightDates] = useState<FlightDateRow[]>([emptyFlightDate()]);
  const [hotelOptions, setHotelOptions] = useState<HotelOptionRow[]>([emptyHotelOption()]);
  const [packageCost, setPackageCost] = useState(249000);
  const [margin, setMargin] = useState(0);
  const [serviceFee, setServiceFee] = useState(0);
  const [minimumMargin, setMinimumMargin] = useState(5000);
  const markupAmount = Math.max(minimumMargin, Math.round(packageCost * (margin / 100)) + serviceFee);
  const finalPrice = packageCost + markupAmount;

  const setField = (field: keyof typeof form, value: string) => setForm((current) => ({ ...current, [field]: value }));
  const updateFlightDate = (index: number, field: keyof FlightDateRow, value: string) => {
    setFlightDates((current) => current.map((row, rowIndex) => rowIndex === index ? { ...row, [field]: value } : row));
  };
  const updateHotelOption = (index: number, field: keyof HotelOptionRow, value: string) => {
    setHotelOptions((current) => current.map((row, rowIndex) => rowIndex === index ? { ...row, [field]: value } : row));
  };

  const handleSave = () => {
    if (!form.title.trim()) return toast.error("Package title is required");
    if (!form.duration.trim()) return toast.error("Duration is required");
    if (!form.makkahHotel.trim() && !hotelOptions.some((option) => option.makkahHotel.trim())) return toast.error("Makkah hotel is required");
    if (!form.madinahHotel.trim() && !hotelOptions.some((option) => option.madinahHotel.trim())) return toast.error("Madinah hotel is required");
    if (packageCost <= 0) return toast.error("Package cost must be greater than zero");

    const savedFlightDates = flightDates
      .filter((row) => row.outboundDate.trim() || row.outboundRoute.trim() || row.returnDate.trim() || row.returnRoute.trim())
      .map((row) => ({
        outboundDate: row.outboundDate.trim(),
        outboundRoute: row.outboundRoute.trim(),
        returnDate: row.returnDate.trim() || undefined,
        returnRoute: row.returnRoute.trim() || undefined,
      }));

    const savedHotelOptions = hotelOptions
      .filter((row) => row.label.trim() || row.makkahHotel.trim() || row.madinahHotel.trim())
      .map((row, index) => ({
        label: row.label.trim() || `Option ${index + 1}`,
        makkahHotel: row.makkahHotel.trim(),
        makkahInfo: row.makkahInfo.trim() || undefined,
        madinahHotel: row.madinahHotel.trim(),
        madinahInfo: row.madinahInfo.trim() || undefined,
        prices: {
          sharing: toNumber(row.sharing),
          quad: toNumber(row.quad),
          triple: toNumber(row.triple),
          double: toNumber(row.double),
        },
      }));

    addPackage({
      packageId: `umrah-${Date.now()}`,
      name: form.title.trim(),
      description: form.terms.trim() || `${form.type} Umrah package from ${form.departureCity || "Travelian"}`,
      basePrice: finalPrice,
      duration: form.duration.trim(),
      hotel: [form.makkahHotel, form.madinahHotel].filter(Boolean).join(" / "),
      city: form.departureCity.trim(),
      status: form.status === "available" ? "active" : "inactive",
      includes: [
        form.visaIncluded === "yes" ? "Visa included" : "",
        form.ticketIncluded === "yes" ? "Air ticket" : "",
        "Hotel accommodation",
        form.transportIncluded === "yes" ? "Transport" : "",
        form.mealsIncluded === "yes" ? "Meals" : "",
        "24/7 support",
      ].filter(Boolean),
      category: "umrah",
      image: form.image.trim() || undefined,
      packageType: form.type,
      makkahHotel: form.makkahHotel.trim(),
      makkahHotelInfo: form.makkahHotelInfo.trim() || undefined,
      madinahHotel: form.madinahHotel.trim(),
      madinahHotelInfo: form.madinahHotelInfo.trim() || undefined,
      roomSharing: form.roomSharing.trim(),
      departureCity: form.departureCity.trim(),
      transportIncluded: form.transportIncluded === "yes",
      visaIncluded: form.visaIncluded === "yes",
      ticketIncluded: form.ticketIncluded === "yes",
      mealsIncluded: form.mealsIncluded === "yes",
      terms: form.terms.trim() || undefined,
      seatsLabel: form.seatsLabel.trim() || undefined,
      childPrice: toNumber(form.childPrice),
      infantPrice: toNumber(form.infantPrice),
      flightDates: savedFlightDates,
      hotelOptions: savedHotelOptions,
    });
    toast.success("Umrah package saved");
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold font-display">Umrah Package Management</h1>
          <p className="text-sm text-muted-foreground">Create real Umrah inventory with flight dates, hotel options, room prices, inclusions and Travelian margin.</p>
        </div>
        <Button onClick={handleSave} className="gradient-primary text-primary-foreground gap-2"><Plus className="h-4 w-4" /> Save Umrah Package</Button>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1fr_420px]">
        <div className="space-y-5">
          <Card className="shadow-card">
            <CardHeader><CardTitle className="text-base font-display">Package details</CardTitle></CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2"><Label>Package title</Label><Input value={form.title} onChange={(event) => setField("title", event.target.value)} placeholder="21 Days Premium Umrah Package" /></div>
              <div className="space-y-2"><Label>Package type</Label><Select value={form.type} onValueChange={(value) => setField("type", value)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="economy">Economy</SelectItem><SelectItem value="star">Star</SelectItem><SelectItem value="premium">Premium</SelectItem><SelectItem value="custom">Custom</SelectItem></SelectContent></Select></div>
              <div className="space-y-2"><Label>Duration</Label><Input value={form.duration} onChange={(event) => setField("duration", event.target.value)} placeholder="21 days" /></div>
              <div className="space-y-2"><Label>Seats label</Label><Input value={form.seatsLabel} onChange={(event) => setField("seatsLabel", event.target.value)} placeholder="Limited seats available" /></div>
              <div className="space-y-2"><Label>Departure city</Label><Input value={form.departureCity} onChange={(event) => setField("departureCity", event.target.value)} placeholder="LHE" /></div>
              <div className="space-y-2"><Label>Availability status</Label><Select value={form.status} onValueChange={(value) => setField("status", value)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="draft">Draft</SelectItem><SelectItem value="available">Available / Published</SelectItem><SelectItem value="sold-out">Sold out</SelectItem><SelectItem value="hidden">Hidden</SelectItem></SelectContent></Select></div>
              <div className="space-y-2"><Label>Main Makkah hotel</Label><Input value={form.makkahHotel} onChange={(event) => setField("makkahHotel", event.target.value)} placeholder="Bait Al-Hajeej 2" /></div>
              <div className="space-y-2"><Label>Makkah hotel notes</Label><Input value={form.makkahHotelInfo} onChange={(event) => setField("makkahHotelInfo", event.target.value)} placeholder="Shuttle service, 800 m, Hijrah Road" /></div>
              <div className="space-y-2"><Label>Main Madinah hotel</Label><Input value={form.madinahHotel} onChange={(event) => setField("madinahHotel", event.target.value)} placeholder="Jood Al-Marjan 2" /></div>
              <div className="space-y-2"><Label>Madinah hotel notes</Label><Input value={form.madinahHotelInfo} onChange={(event) => setField("madinahHotelInfo", event.target.value)} placeholder="Shuttle service, Markazia, Masjid Bilal side" /></div>
              <div className="space-y-2"><Label>Room sharing summary</Label><Input value={form.roomSharing} onChange={(event) => setField("roomSharing", event.target.value)} placeholder="Sharing, quad, triple, double" /></div>
              <div className="space-y-2"><Label>Image or banner URL</Label><Input value={form.image} onChange={(event) => setField("image", event.target.value)} placeholder="Image URL or upload path" /></div>
              <div className="space-y-2"><Label>Child price</Label><Input type="number" value={form.childPrice} onChange={(event) => setField("childPrice", event.target.value)} placeholder="210000" /></div>
              <div className="space-y-2"><Label>Infant price</Label><Input type="number" value={form.infantPrice} onChange={(event) => setField("infantPrice", event.target.value)} placeholder="82500" /></div>
              <div className="space-y-2"><Label>Transport included</Label><Select value={form.transportIncluded} onValueChange={(value) => setField("transportIncluded", value)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="yes">Included</SelectItem><SelectItem value="no">Not included</SelectItem></SelectContent></Select></div>
              <div className="space-y-2"><Label>Visa included</Label><Select value={form.visaIncluded} onValueChange={(value) => setField("visaIncluded", value)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="yes">Included</SelectItem><SelectItem value="no">Not included</SelectItem></SelectContent></Select></div>
              <div className="space-y-2"><Label>Air ticket included</Label><Select value={form.ticketIncluded} onValueChange={(value) => setField("ticketIncluded", value)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="yes">Included</SelectItem><SelectItem value="no">Not included</SelectItem></SelectContent></Select></div>
              <div className="space-y-2"><Label>Meals included</Label><Select value={form.mealsIncluded} onValueChange={(value) => setField("mealsIncluded", value)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="yes">Included</SelectItem><SelectItem value="no">Not included</SelectItem></SelectContent></Select></div>
              <div className="md:col-span-2 space-y-2"><Label>Terms and conditions</Label><Textarea value={form.terms} onChange={(event) => setField("terms", event.target.value)} placeholder="Cancellation, payment, hotel change, visa and ticket terms" rows={4} /></div>
            </CardContent>
          </Card>

          <Card className="shadow-card">
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-base font-display"><CalendarDays className="h-4 w-4" /> Flight dates</CardTitle>
              <Button variant="outline" size="sm" onClick={() => setFlightDates((current) => [...current, emptyFlightDate()])}><Plus className="mr-2 h-4 w-4" /> Add date</Button>
            </CardHeader>
            <CardContent className="space-y-3">
              {flightDates.map((row, index) => (
                <div key={index} className="grid gap-3 rounded-xl border p-3 md:grid-cols-[1fr_1fr_1fr_1fr_auto]">
                  <Input value={row.outboundDate} onChange={(event) => updateFlightDate(index, "outboundDate", event.target.value)} placeholder="18 Jun" />
                  <Input value={row.outboundRoute} onChange={(event) => updateFlightDate(index, "outboundRoute", event.target.value)} placeholder="LHE-JED" />
                  <Input value={row.returnDate} onChange={(event) => updateFlightDate(index, "returnDate", event.target.value)} placeholder="08 Jul" />
                  <Input value={row.returnRoute} onChange={(event) => updateFlightDate(index, "returnRoute", event.target.value)} placeholder="JED-LHE" />
                  <Button variant="ghost" size="icon" onClick={() => setFlightDates((current) => current.filter((_, rowIndex) => rowIndex !== index))} disabled={flightDates.length === 1}><Trash2 className="h-4 w-4" /></Button>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="shadow-card">
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-base font-display"><Hotel className="h-4 w-4" /> Hotel options & room prices</CardTitle>
              <Button variant="outline" size="sm" onClick={() => setHotelOptions((current) => [...current, emptyHotelOption()])}><Plus className="mr-2 h-4 w-4" /> Add option</Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {hotelOptions.map((row, index) => (
                <div key={index} className="space-y-3 rounded-xl border p-4">
                  <div className="flex items-center justify-between gap-3">
                    <Badge variant="secondary">Option {index + 1}</Badge>
                    <Button variant="ghost" size="icon" onClick={() => setHotelOptions((current) => current.filter((_, rowIndex) => rowIndex !== index))} disabled={hotelOptions.length === 1}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                  <div className="grid gap-3 md:grid-cols-2">
                    <Input value={row.label} onChange={(event) => updateHotelOption(index, "label", event.target.value)} placeholder="Option label" />
                    <Input value={row.makkahHotel} onChange={(event) => updateHotelOption(index, "makkahHotel", event.target.value)} placeholder="Makkah hotel" />
                    <Input value={row.makkahInfo} onChange={(event) => updateHotelOption(index, "makkahInfo", event.target.value)} placeholder="Makkah notes" />
                    <Input value={row.madinahHotel} onChange={(event) => updateHotelOption(index, "madinahHotel", event.target.value)} placeholder="Madinah hotel" />
                    <Input value={row.madinahInfo} onChange={(event) => updateHotelOption(index, "madinahInfo", event.target.value)} placeholder="Madinah notes" />
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    <Input type="number" value={row.sharing} onChange={(event) => updateHotelOption(index, "sharing", event.target.value)} placeholder="Sharing PKR" />
                    <Input type="number" value={row.quad} onChange={(event) => updateHotelOption(index, "quad", event.target.value)} placeholder="Quad PKR" />
                    <Input type="number" value={row.triple} onChange={(event) => updateHotelOption(index, "triple", event.target.value)} placeholder="Triple PKR" />
                    <Input type="number" value={row.double} onChange={(event) => updateHotelOption(index, "double", event.target.value)} placeholder="Double PKR" />
                  </div>
                </div>
              ))}
              <Button onClick={handleSave} className="w-full gradient-primary text-primary-foreground">Save package</Button>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-5">
          <Card className="shadow-card">
            <CardHeader><CardTitle className="text-base font-display">Cost & margin</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2"><Label>Package cost</Label><Input type="number" value={packageCost} onChange={(event) => setPackageCost(Number(event.target.value))} /></div>
              <div className="space-y-2"><Label>Travelian margin %</Label><Input type="number" value={margin} onChange={(event) => setMargin(Number(event.target.value))} /></div>
              <div className="space-y-2"><Label>Fixed service fee</Label><Input type="number" value={serviceFee} onChange={(event) => setServiceFee(Number(event.target.value))} /></div>
              <div className="space-y-2"><Label>Minimum margin</Label><Input type="number" value={minimumMargin} onChange={(event) => setMinimumMargin(Number(event.target.value))} /></div>
            </CardContent>
          </Card>
          <PricingBreakdownCard rule={{ percentage: margin, fixedAmount: serviceFee, minimumMargin }} baseCost={packageCost} />
        </div>
      </div>

      {packages.length === 0 ? (
        <EmptyState icon={Package} title="No real Umrah packages configured" description="No mock Umrah packages are shown. Create real packages with hotels, flight dates, room prices, inclusions, terms and approved Travelian margin." actionLabel="Save package" onAction={handleSave} />
      ) : (
        <Card className="shadow-card">
          <CardHeader><CardTitle className="text-base font-display">Saved Umrah packages</CardTitle></CardHeader>
          <CardContent className="grid gap-3">
            {packages.map((item) => (
              <div key={item.packageId} className="flex flex-col gap-2 rounded-xl border p-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-semibold text-foreground">{item.name}</p>
                  <p className="text-sm text-muted-foreground">{item.duration} · {item.hotel || "Hotels not set"} · {item.city || "Departure city not set"}</p>
                </div>
                <p className="font-bold text-primary">PKR {item.basePrice.toLocaleString()}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
