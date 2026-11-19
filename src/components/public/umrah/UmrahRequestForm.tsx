import { useState } from "react";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { WhatsAppIcon } from "@/components/public/WhatsAppIcon";
import { SectionHeading } from "@/components/public/SectionHeading";
import { whatsappUrl } from "@/lib/site-config";
import { UMRAH_DEPARTURE_CITIES, UMRAH_DURATIONS } from "@/data/services/umrah";
import { DatePickerField } from "@/components/ui/date-picker-field";
import { todayIso } from "@/lib/date-iso";

const initial = {
  name: "",
  whatsapp: "",
  city: "",
  travelDate: "",
  departureCity: "Lahore",
  adults: "2",
  children: "0",
  infants: "0",
  duration: "15",
  hotelCategory: "4 Star",
  roomSharing: "Quad",
  transport: "Shared",
  budget: "",
  notes: "",
};

export function UmrahRequestForm() {
  const [form, setForm] = useState(initial);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const set = (key: keyof typeof initial) => (value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: "" }));
  };

  const validate = () => {
    const next: Record<string, string> = {};
    if (form.name.trim().length < 3) next.name = "Please enter your full name";
    if (form.whatsapp.replace(/\D/g, "").length < 10) next.whatsapp = "Enter a valid WhatsApp number";
    if (!form.city.trim()) next.city = "Please enter your city";
    if (!form.travelDate) next.travelDate = "Select your expected travel date";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const submit = () => {
    if (!validate()) return;
    const message = [
      "Assalam o Alaikum Travelian,",
      "",
      "I want a custom Umrah package:",
      `Name: ${form.name.trim()}`,
      `WhatsApp: ${form.whatsapp.trim()}`,
      `City: ${form.city.trim()}`,
      `Expected travel date: ${form.travelDate}`,
      `Departure city: ${form.departureCity}`,
      `Passengers: ${form.adults} adults, ${form.children} children, ${form.infants} infants`,
      `Package duration: ${form.duration} days`,
      `Hotel category: ${form.hotelCategory}`,
      `Room sharing: ${form.roomSharing}`,
      `Transport: ${form.transport}`,
      `Budget per person: ${form.budget.trim() || "Please advise"}`,
      `Special requirements: ${form.notes.trim() || "None"}`,
      "",
      "Please share the best available options and final price.",
    ].join("\n");
    window.open(whatsappUrl(message), "_blank", "noopener,noreferrer");
  };

  return (
    <section id="custom-umrah" className="scroll-mt-24">
      <SectionHeading
        eyebrow="Custom request"
        title="Request a Custom Umrah Package"
        description="Share your travel plan and our Umrah desk will send a tailored quote on WhatsApp with hotel, transport and visa options."
      />
      <Card className="mt-6 rounded-xl border-border/70 shadow-card">
        <CardContent className="grid gap-4 p-5 md:grid-cols-2 md:p-6">
          <Field label="Full name" error={errors.name}>
            <Input className="h-11 rounded-xl border-muted bg-muted/30" maxLength={80} value={form.name} onChange={(e) => set("name")(e.target.value)} placeholder="Your name" />
          </Field>
          <Field label="WhatsApp number" error={errors.whatsapp}>
            <Input className="h-11 rounded-xl border-muted bg-muted/30" maxLength={20} value={form.whatsapp} onChange={(e) => set("whatsapp")(e.target.value)} placeholder="+92 3XX XXXXXXX" />
          </Field>
          <Field label="Your city" error={errors.city}>
            <Input className="h-11 rounded-xl border-muted bg-muted/30" maxLength={60} value={form.city} onChange={(e) => set("city")(e.target.value)} placeholder="e.g. Faisalabad" />
          </Field>
          <Field label="Expected travel date" error={errors.travelDate}>
            <DatePickerField ariaLabel="Expected travel date" className="border-muted bg-muted/30" value={form.travelDate} min={todayIso()} placeholder="Select travel date" onChange={(value) => set("travelDate")(value ?? "")} />
          </Field>
          <Field label="Departure city">
            <Picker value={form.departureCity} onChange={set("departureCity")} options={UMRAH_DEPARTURE_CITIES} />
          </Field>
          <Field label="Package duration">
            <Picker value={form.duration} onChange={set("duration")} options={UMRAH_DURATIONS.map(String)} suffix=" days" />
          </Field>
          <div className="grid grid-cols-3 gap-3 md:col-span-2">
            <Field label="Adults"><Picker value={form.adults} onChange={set("adults")} options={["1", "2", "3", "4", "5", "6", "7", "8", "9", "10+"]} /></Field>
            <Field label="Children"><Picker value={form.children} onChange={set("children")} options={["0", "1", "2", "3", "4", "5+"]} /></Field>
            <Field label="Infants"><Picker value={form.infants} onChange={set("infants")} options={["0", "1", "2", "3+"]} /></Field>
          </div>
          <Field label="Hotel category">
            <Picker value={form.hotelCategory} onChange={set("hotelCategory")} options={["3 Star", "4 Star", "5 Star", "Haram facing"]} />
          </Field>
          <Field label="Room sharing">
            <Picker value={form.roomSharing} onChange={set("roomSharing")} options={["Double", "Triple", "Quad", "Quint"]} />
          </Field>
          <Field label="Transport type">
            <Picker value={form.transport} onChange={set("transport")} options={["Shared", "Private"]} />
          </Field>
          <Field label="Budget per person (PKR)">
            <Input className="h-11 rounded-xl border-muted bg-muted/30" maxLength={20} value={form.budget} onChange={(e) => set("budget")(e.target.value)} placeholder="e.g. 350,000" />
          </Field>
          <Field label="Special requirements" className="md:col-span-2">
            <Textarea className="min-h-24 rounded-xl border-muted bg-muted/30" maxLength={600} value={form.notes} onChange={(e) => set("notes")(e.target.value)} placeholder="Wheelchair support, meals, ziarat, specific hotel, group details..." />
          </Field>
          <div className="md:col-span-2">
            <Button onClick={submit} className="h-12 w-full rounded-xl bg-whatsapp text-base font-bold text-whatsapp-foreground hover:bg-whatsapp-hover sm:w-auto sm:px-8">
              <WhatsAppIcon className="mr-2 h-5 w-5" /> Send Request on WhatsApp <Send className="ml-2 h-4 w-4" />
            </Button>
            <p className="mt-3 text-xs text-muted-foreground">Your details are only used to prepare your quote. Nothing is charged until you confirm.</p>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}

function Field({ label, children, error, className }: { label: string; children: React.ReactNode; error?: string; className?: string }) {
  return (
    <div className={className}>
      <Label className="text-xs font-semibold text-muted-foreground">{label}</Label>
      <div className="mt-1.5">{children}</div>
      {error && <p className="mt-1 text-xs font-semibold text-destructive">{error}</p>}
    </div>
  );
}

function Picker({ value, onChange, options, suffix = "" }: { value: string; onChange: (v: string) => void; options: string[]; suffix?: string }) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="h-11 rounded-xl border-muted bg-muted/30"><SelectValue /></SelectTrigger>
      <SelectContent>
        {options.map((o) => <SelectItem key={o} value={o}>{o}{suffix}</SelectItem>)}
      </SelectContent>
    </Select>
  );
}
