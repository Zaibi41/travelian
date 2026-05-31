import { useState } from "react";
import { Archive, Edit, Map, Plus, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { EmptyState } from "@/components/EmptyState";
import { useAdmin } from "@/contexts/AdminStore";
import { UmrahPackage } from "@/data/models";
import { toast } from "sonner";

const defaultForm = {
  title: "",
  type: "international",
  destination: "",
  duration: "",
  travelDates: "",
  hotelsText: "",
  includes: "",
  pricing: "",
  itinerary: "",
  childInfantNote: "",
  agentDiscount: "",
  urgencyText: "",
  contactNumbers: "",
  image: "",
  status: "active",
  basePrice: "0",
};

type TourForm = typeof defaultForm;

function toForm(tour?: UmrahPackage): TourForm {
  if (!tour) return defaultForm;
  return {
    title: tour.name || "",
    type: tour.packageType || "international",
    destination: tour.city || "",
    duration: tour.duration || "",
    travelDates: tour.travelDates || "",
    hotelsText: tour.hotelsText || tour.hotel || "",
    includes: tour.packageIncludesText || tour.includes.join("\n"),
    pricing: tour.pricingText || "",
    itinerary: tour.itineraryText || "",
    childInfantNote: tour.childInfantNote || "",
    agentDiscount: tour.agentDiscount || "",
    urgencyText: tour.urgencyText || "",
    contactNumbers: tour.contactNumbers || "",
    image: tour.image || "",
    status: tour.status === "active" ? "active" : "draft",
    basePrice: String(tour.basePrice || 0),
  };
}

function buildTour(form: TourForm): Omit<UmrahPackage, "packageId"> {
  const includes = form.includes.split(/\r?\n/).map((item) => item.trim()).filter(Boolean);
  return {
    name: form.title.trim(),
    description: `${form.destination.trim()} tour for ${form.travelDates.trim()}`,
    basePrice: Number(form.basePrice) || 0,
    duration: form.duration.trim(),
    hotel: form.hotelsText.trim(),
    city: form.destination.trim(),
    status: form.status === "active" ? "active" : "inactive",
    includes,
    category: "tour",
    image: form.image.trim() || undefined,
    packageType: form.type,
    travelDates: form.travelDates.trim(),
    hotelsText: form.hotelsText.trim(),
    packageIncludesText: form.includes.trim(),
    pricingText: form.pricing.trim(),
    itineraryText: form.itinerary.trim(),
    childInfantNote: form.childInfantNote.trim(),
    agentDiscount: form.agentDiscount.trim(),
    urgencyText: form.urgencyText.trim(),
    contactNumbers: form.contactNumbers.trim(),
    archivedAt: undefined,
    deletedAt: undefined,
  };
}

export default function TourPackagesPage() {
  const { tourPackages, addTourPackage, updateTourPackage, deleteTourPackage } = useAdmin();
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<TourForm>(defaultForm);
  const visibleTours = tourPackages.filter((tour) => !tour.deletedAt);

  const setField = (field: keyof TourForm, value: string) => setForm((current) => ({ ...current, [field]: value }));
  const openNew = () => {
    setEditingId(null);
    setForm(defaultForm);
    setOpen(true);
  };
  const openEdit = (tour: UmrahPackage) => {
    setEditingId(tour.packageId);
    setForm(toForm(tour));
    setOpen(true);
  };
  const handleSave = () => {
    if (!form.title.trim()) return toast.error("Tour title is required");
    if (!form.destination.trim()) return toast.error("Destination is required");
    if (!form.travelDates.trim()) return toast.error("Travel dates are required");
    const payload = buildTour(form);
    if (editingId) {
      updateTourPackage(editingId, payload);
      toast.success("Tour package updated");
    } else {
      addTourPackage({ ...payload, packageId: `tour-${Date.now()}` });
      toast.success("Tour package saved");
    }
    setOpen(false);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold font-display">Tour Package Management</h1>
          <p className="text-sm text-muted-foreground">Manage public tour offers with edit, archive and soft delete controls.</p>
        </div>
        <Button onClick={openNew} className="gradient-primary text-primary-foreground gap-2"><Plus className="h-4 w-4" /> Add New Tour</Button>
      </div>

      {visibleTours.length === 0 ? (
        <EmptyState icon={Map} title="No tour packages configured" description="Add a real tour package. Draft records stay in admin; only active records show on the public frontend." actionLabel="Add New Tour" onAction={openNew} />
      ) : (
        <Card className="shadow-card">
          <CardHeader><CardTitle className="text-base font-display">Tour packages</CardTitle></CardHeader>
          <CardContent className="grid gap-3">
            {visibleTours.map((tour) => (
              <div key={tour.packageId} className="flex flex-col gap-4 rounded-xl border p-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold">{tour.name}</p>
                    <Badge variant={tour.status === "active" && !tour.archivedAt ? "default" : "secondary"}>
                      {tour.archivedAt ? "Archived" : tour.status === "active" ? "Published" : "Draft"}
                    </Badge>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">{tour.travelDates || "Dates not set"} · {tour.duration || "Duration not set"} · {tour.city || "Destination not set"}</p>
                  <p className="mt-1 font-bold text-primary">PKR {tour.basePrice.toLocaleString()}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" size="sm" className="h-9 px-3" onClick={() => openEdit(tour)}><Edit className="mr-2 h-4 w-4" /> Edit</Button>
                  <Button variant="outline" size="sm" className="h-9 px-3" onClick={() => updateTourPackage(tour.packageId, { archivedAt: tour.archivedAt ? undefined : new Date().toISOString(), status: "inactive" })}><Archive className="mr-2 h-4 w-4" /> {tour.archivedAt ? "Unarchive" : "Archive"}</Button>
                  <Button variant="destructive" size="sm" className="h-9 px-3" onClick={() => deleteTourPackage(tour.packageId)}><Trash2 className="mr-2 h-4 w-4" /> Delete</Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[92vh] max-w-5xl overflow-y-auto">
          <DialogHeader><DialogTitle>{editingId ? "Edit Tour Package" : "Add New Tour Package"}</DialogTitle></DialogHeader>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2"><Label>Tour title</Label><Input value={form.title} onChange={(event) => setField("title", event.target.value)} placeholder="Sri Lanka + Malaysia + Thailand Tour" /></div>
            <div className="space-y-2"><Label>Tour type</Label><Select value={form.type} onValueChange={(value) => setField("type", value)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="domestic">Domestic</SelectItem><SelectItem value="international">International</SelectItem><SelectItem value="group">Group</SelectItem><SelectItem value="custom">Custom</SelectItem></SelectContent></Select></div>
            <div className="space-y-2"><Label>Destination</Label><Input value={form.destination} onChange={(event) => setField("destination", event.target.value)} placeholder="Sri Lanka, Malaysia, Thailand" /></div>
            <div className="space-y-2"><Label>Duration</Label><Input value={form.duration} onChange={(event) => setField("duration", event.target.value)} placeholder="9 days / 8 nights" /></div>
            <div className="space-y-2"><Label>Travel dates</Label><Input value={form.travelDates} onChange={(event) => setField("travelDates", event.target.value)} placeholder="08 JUN - 16 JUN" /></div>
            <div className="space-y-2"><Label>Status</Label><Select value={form.status} onValueChange={(value) => setField("status", value)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="active">Active / Published</SelectItem><SelectItem value="draft">Draft</SelectItem></SelectContent></Select></div>
            <div className="space-y-2"><Label>Starting price</Label><Input type="number" value={form.basePrice} onChange={(event) => setField("basePrice", event.target.value)} /></div>
            <div className="space-y-2"><Label>Image URL</Label><Input value={form.image} onChange={(event) => setField("image", event.target.value)} /></div>
            <div className="space-y-2"><Label>Agent discount</Label><Input value={form.agentDiscount} onChange={(event) => setField("agentDiscount", event.target.value)} /></div>
            <div className="space-y-2"><Label>Booking contact numbers</Label><Input value={form.contactNumbers} onChange={(event) => setField("contactNumbers", event.target.value)} /></div>
            <div className="space-y-2 md:col-span-2"><Label>Hotels</Label><Textarea rows={4} value={form.hotelsText} onChange={(event) => setField("hotelsText", event.target.value)} /></div>
            <div className="space-y-2 md:col-span-2"><Label>Package includes</Label><Textarea rows={6} value={form.includes} onChange={(event) => setField("includes", event.target.value)} /></div>
            <div className="space-y-2 md:col-span-2"><Label>Package pricing</Label><Textarea rows={5} value={form.pricing} onChange={(event) => setField("pricing", event.target.value)} /></div>
            <div className="space-y-2 md:col-span-2"><Label>Child & infant note</Label><Input value={form.childInfantNote} onChange={(event) => setField("childInfantNote", event.target.value)} /></div>
            <div className="space-y-2 md:col-span-2"><Label>Tour plan</Label><Textarea rows={7} value={form.itinerary} onChange={(event) => setField("itinerary", event.target.value)} /></div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} className="gradient-primary text-primary-foreground">Save Tour</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
