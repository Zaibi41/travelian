import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Loader2, MessageCircle, PackageCheck } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PackageImage } from "@/components/public/PackageImage";
import type { BookingRequestType, UmrahPackage } from "@/data/models";
import { createBookingRequest } from "@/lib/booking-request-api";
import { getPackage } from "@/lib/package-api";

const supportedCategories = new Set(["umrah"]);

export default function BookingRequestPage() {
  const [searchParams] = useSearchParams();
  const category = searchParams.get("type") || searchParams.get("category") || "package";
  const packageId = searchParams.get("id") || "";
  const [item, setItem] = useState<UmrahPackage | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({ customerName: "", phone: "", email: "", selectedOption: "" });

  useEffect(() => {
    let cancelled = false;
    if (!packageId || !supportedCategories.has(category)) {
      setLoading(false);
      return;
    }
    getPackage(category as UmrahPackage["category"], packageId)
      .then(packageItem => {
        if (!cancelled) setItem(packageItem);
      })
      .catch(() => {
        if (!cancelled) setItem(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [category, packageId]);

  const options = useMemo(() => item?.hotelOptions?.map(option => option.label).filter(Boolean) || [], [item]);
  const detailPath = `/umrah/${item?.packageId}`;

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!item) return;
    if (!form.customerName.trim() || !form.phone.trim()) {
      toast.error("Name and phone number are required");
      return;
    }
    setSubmitting(true);
    try {
      await createBookingRequest({
        type: category as BookingRequestType,
        packageId: item.packageId,
        packageName: item.name,
        customerName: form.customerName.trim(),
        phone: form.phone.trim(),
        email: form.email.trim(),
        selectedOption: form.selectedOption,
      });
      setSubmitted(true);
    } catch (error) {
      console.error(error);
      toast.error("Your request could not be submitted. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="flex min-h-[55vh] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  if (!item) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-14">
        <Card className="shadow-card"><CardContent className="p-8 text-center">
          <PackageCheck className="mx-auto h-12 w-12 text-muted-foreground" />
          <h1 className="mt-4 text-2xl font-bold">Package is not available</h1>
          <p className="mt-2 text-sm text-muted-foreground">This package request cannot be opened because the selected database record is not published.</p>
          <Button asChild className="mt-5"><Link to="/">Return to Travelian</Link></Button>
        </CardContent></Card>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-14">
        <Card className="shadow-card"><CardContent className="p-8 text-center">
          <CheckCircle2 className="mx-auto h-14 w-14 text-success" />
          <h1 className="mt-4 text-2xl font-bold">Booking request received</h1>
          <p className="mt-2 text-sm text-muted-foreground">Travelian has saved your request for <strong>{item.name}</strong>. Our team will contact you using the phone number you provided.</p>
          <Button asChild className="mt-5"><Link to={detailPath}>Return to package</Link></Button>
        </CardContent></Card>
      </div>
    );
  }

  return (
    <div className="bg-muted/30 py-10">
      <div className="mx-auto grid max-w-5xl gap-6 px-4 sm:px-6 lg:grid-cols-[1fr_420px] lg:px-8">
        <Card className="overflow-hidden border-0 shadow-card">
          <PackageImage src={item.image} alt={item.name} className="h-64 w-full" />
          <CardContent className="space-y-3 p-6">
            <p className="text-xs font-semibold uppercase text-primary">{category.replace(/_/g, " ")} request</p>
            <h1 className="text-2xl font-black">{item.name}</h1>
            <p className="text-sm text-muted-foreground">{item.description}</p>
            <div className="grid gap-2 text-sm sm:grid-cols-2">
              <p className="rounded-lg bg-muted/50 p-3">Duration: <strong>{item.duration || "On request"}</strong></p>
              <p className="rounded-lg bg-muted/50 p-3">Starting from: <strong>PKR {item.basePrice.toLocaleString()}</strong></p>
            </div>
          </CardContent>
        </Card>

        <Card className="h-fit shadow-card">
          <CardHeader><CardTitle>Request booking</CardTitle></CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={submit}>
              <div className="space-y-2"><Label htmlFor="request-name">Name *</Label><Input id="request-name" value={form.customerName} onChange={event => setForm(current => ({ ...current, customerName: event.target.value }))} autoComplete="name" /></div>
              <div className="space-y-2"><Label htmlFor="request-phone">Phone number *</Label><Input id="request-phone" value={form.phone} onChange={event => setForm(current => ({ ...current, phone: event.target.value }))} autoComplete="tel" placeholder="+92 300 1234567" /></div>
              <div className="space-y-2"><Label htmlFor="request-email">Email (optional)</Label><Input id="request-email" type="email" value={form.email} onChange={event => setForm(current => ({ ...current, email: event.target.value }))} autoComplete="email" /></div>
              {options.length > 0 && <div className="space-y-2"><Label>Package option (optional)</Label><Select value={form.selectedOption} onValueChange={value => setForm(current => ({ ...current, selectedOption: value }))}><SelectTrigger><SelectValue placeholder="Select an option" /></SelectTrigger><SelectContent>{options.map(option => <SelectItem key={option} value={option}>{option}</SelectItem>)}</SelectContent></Select></div>}
              <Button type="submit" disabled={submitting} className="w-full gradient-primary text-primary-foreground">{submitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Submitting...</> : "Submit Booking Request"}</Button>
              <p className="flex gap-2 text-xs text-muted-foreground"><MessageCircle className="h-4 w-4 shrink-0 text-primary" /> Travelian will confirm availability, documents, and payment steps after receiving your request.</p>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
