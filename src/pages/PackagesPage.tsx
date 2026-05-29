import { useState } from "react";
import { Archive, Edit, Package, Plus, Trash2 } from "lucide-react";
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
import { UmrahPackage } from "@/data/mock";
import { toast } from "sonner";

const defaultForm = {
  title: "",
  type: "premium",
  duration: "",
  departureCity: "",
  status: "active",
  price: "0",
  seatsLabel: "",
  makkahHotel: "",
  makkahHotelInfo: "",
  madinahHotel: "",
  madinahHotelInfo: "",
  roomSharing: "",
  image: "",
  flightDates: "",
  hotelOptions: "",
  includes: "Visa included\nAir ticket\nHotel accommodation\nTransport\n24/7 support",
  terms: "",
  childPrice: "",
  infantPrice: "",
};

type UmrahForm = typeof defaultForm;

function toForm(item?: UmrahPackage): UmrahForm {
  if (!item) return defaultForm;
  return {
    title: item.name || "",
    type: item.packageType || "premium",
    duration: item.duration || "",
    departureCity: item.departureCity || item.city || "",
    status: item.status === "active" ? "active" : "draft",
    price: String(item.basePrice || 0),
    seatsLabel: item.seatsLabel || "",
    makkahHotel: item.makkahHotel || "",
    makkahHotelInfo: item.makkahHotelInfo || "",
    madinahHotel: item.madinahHotel || "",
    madinahHotelInfo: item.madinahHotelInfo || "",
    roomSharing: item.roomSharing || "",
    image: item.image || "",
    flightDates: (item.flightDates || []).map((row) => `${row.outboundDate} ${row.outboundRoute}${row.returnDate || row.returnRoute ? ` | ${row.returnDate || ""} ${row.returnRoute || ""}` : ""}`.trim()).join("\n"),
    hotelOptions: (item.hotelOptions || []).map((option) => `${option.label}: ${option.makkahHotel} / ${option.madinahHotel}`).join("\n"),
    includes: item.includes.join("\n"),
    terms: item.terms || "",
    childPrice: item.childPrice ? String(item.childPrice) : "",
    infantPrice: item.infantPrice ? String(item.infantPrice) : "",
  };
}

function buildPackage(form: UmrahForm): Omit<UmrahPackage, "packageId"> {
  const includes = form.includes.split(/\r?\n/).map((item) => item.trim()).filter(Boolean);
  const flightDates = form.flightDates.split(/\r?\n/).map((line) => line.trim()).filter(Boolean).map((line) => {
    const [outbound, inbound] = line.split("|").map((part) => part.trim());
    return { outboundDate: outbound, outboundRoute: "", returnDate: inbound || undefined, returnRoute: undefined };
  });
  const hotelOptions = form.hotelOptions.split(/\r?\n/).map((line, index) => line.trim()).filter(Boolean).map((line) => ({
    label: line.split(":")[0] || `Option ${index + 1}`,
    makkahHotel: line,
    madinahHotel: "",
    prices: {},
  }));
  return {
    name: form.title.trim(),
    description: form.terms.trim() || `${form.type} Umrah package from ${form.departureCity || "Travelian"}`,
    basePrice: Number(form.price) || 0,
    duration: form.duration.trim(),
    hotel: [form.makkahHotel, form.madinahHotel].filter(Boolean).join(" / "),
    city: form.departureCity.trim(),
    status: form.status === "active" ? "active" : "inactive",
    includes,
    category: "umrah",
    image: form.image.trim() || undefined,
    packageType: form.type,
    makkahHotel: form.makkahHotel.trim(),
    makkahHotelInfo: form.makkahHotelInfo.trim(),
    madinahHotel: form.madinahHotel.trim(),
    madinahHotelInfo: form.madinahHotelInfo.trim(),
    roomSharing: form.roomSharing.trim(),
    departureCity: form.departureCity.trim(),
    terms: form.terms.trim(),
    seatsLabel: form.seatsLabel.trim(),
    childPrice: Number(form.childPrice) || undefined,
    infantPrice: Number(form.infantPrice) || undefined,
    flightDates,
    hotelOptions,
    archivedAt: undefined,
    deletedAt: undefined,
  };
}

export default function PackagesPage() {
  const { packages, addPackage, updatePackage, deletePackage } = useAdmin();
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<UmrahForm>(defaultForm);
  const visiblePackages = packages.filter((item) => !item.deletedAt);

  const setField = (field: keyof UmrahForm, value: string) => setForm((current) => ({ ...current, [field]: value }));
  const openNew = () => {
    setEditingId(null);
    setForm(defaultForm);
    setOpen(true);
  };
  const openEdit = (item: UmrahPackage) => {
    setEditingId(item.packageId);
    setForm(toForm(item));
    setOpen(true);
  };
  const handleSave = () => {
    if (!form.title.trim()) return toast.error("Package title is required");
    if (!form.duration.trim()) return toast.error("Duration is required");
    if (!form.makkahHotel.trim()) return toast.error("Makkah hotel is required");
    if (!form.madinahHotel.trim()) return toast.error("Madinah hotel is required");
    const payload = buildPackage(form);
    if (editingId) {
      updatePackage(editingId, payload);
      toast.success("Umrah package updated");
    } else {
      addPackage({ ...payload, packageId: `umrah-${Date.now()}` });
      toast.success("Umrah package saved");
    }
    setOpen(false);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold font-display">Umrah Package Management</h1>
          <p className="text-sm text-muted-foreground">Manage Umrah packages with edit, archive and soft delete controls.</p>
        </div>
        <Button onClick={openNew} className="gradient-primary text-primary-foreground gap-2"><Plus className="h-4 w-4" /> Add New Umrah Package</Button>
      </div>

      {visiblePackages.length === 0 ? (
        <EmptyState icon={Package} title="No Umrah packages configured" description="Add a real package. Draft records stay in admin; only active records show on the public frontend." actionLabel="Add New Package" onAction={openNew} />
      ) : (
        <Card className="shadow-card">
          <CardHeader><CardTitle className="text-base font-display">Umrah packages</CardTitle></CardHeader>
          <CardContent className="grid gap-3">
            {visiblePackages.map((item) => (
              <div key={item.packageId} className="flex flex-col gap-4 rounded-xl border p-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold">{item.name}</p>
                    <Badge variant={item.status === "active" && !item.archivedAt ? "default" : "secondary"}>
                      {item.archivedAt ? "Archived" : item.status === "active" ? "Published" : "Draft"}
                    </Badge>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">{item.duration || "Duration not set"} · {item.hotel || "Hotels not set"} · {item.city || "Departure city not set"}</p>
                  <p className="mt-1 font-bold text-primary">PKR {item.basePrice.toLocaleString()}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" size="sm" onClick={() => openEdit(item)}><Edit className="mr-2 h-4 w-4" /> Edit</Button>
                  <Button variant="outline" size="sm" onClick={() => updatePackage(item.packageId, { archivedAt: item.archivedAt ? undefined : new Date().toISOString(), status: "inactive" })}><Archive className="mr-2 h-4 w-4" /> {item.archivedAt ? "Unarchive" : "Archive"}</Button>
                  <Button variant="destructive" size="sm" onClick={() => deletePackage(item.packageId)}><Trash2 className="mr-2 h-4 w-4" /> Delete</Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[92vh] max-w-5xl overflow-y-auto">
          <DialogHeader><DialogTitle>{editingId ? "Edit Umrah Package" : "Add New Umrah Package"}</DialogTitle></DialogHeader>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2"><Label>Package title</Label><Input value={form.title} onChange={(event) => setField("title", event.target.value)} placeholder="21 Days Premium Umrah Package" /></div>
            <div className="space-y-2"><Label>Package type</Label><Select value={form.type} onValueChange={(value) => setField("type", value)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="economy">Economy</SelectItem><SelectItem value="star">Star</SelectItem><SelectItem value="premium">Premium</SelectItem><SelectItem value="custom">Custom</SelectItem></SelectContent></Select></div>
            <div className="space-y-2"><Label>Duration</Label><Input value={form.duration} onChange={(event) => setField("duration", event.target.value)} placeholder="21 days" /></div>
            <div className="space-y-2"><Label>Status</Label><Select value={form.status} onValueChange={(value) => setField("status", value)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="active">Active / Published</SelectItem><SelectItem value="draft">Draft</SelectItem></SelectContent></Select></div>
            <div className="space-y-2"><Label>Starting price</Label><Input type="number" value={form.price} onChange={(event) => setField("price", event.target.value)} /></div>
            <div className="space-y-2"><Label>Departure city</Label><Input value={form.departureCity} onChange={(event) => setField("departureCity", event.target.value)} placeholder="LHE" /></div>
            <div className="space-y-2"><Label>Makkah hotel</Label><Input value={form.makkahHotel} onChange={(event) => setField("makkahHotel", event.target.value)} /></div>
            <div className="space-y-2"><Label>Makkah notes</Label><Input value={form.makkahHotelInfo} onChange={(event) => setField("makkahHotelInfo", event.target.value)} /></div>
            <div className="space-y-2"><Label>Madinah hotel</Label><Input value={form.madinahHotel} onChange={(event) => setField("madinahHotel", event.target.value)} /></div>
            <div className="space-y-2"><Label>Madinah notes</Label><Input value={form.madinahHotelInfo} onChange={(event) => setField("madinahHotelInfo", event.target.value)} /></div>
            <div className="space-y-2"><Label>Room sharing</Label><Input value={form.roomSharing} onChange={(event) => setField("roomSharing", event.target.value)} /></div>
            <div className="space-y-2"><Label>Seats label</Label><Input value={form.seatsLabel} onChange={(event) => setField("seatsLabel", event.target.value)} /></div>
            <div className="space-y-2"><Label>Child price</Label><Input type="number" value={form.childPrice} onChange={(event) => setField("childPrice", event.target.value)} /></div>
            <div className="space-y-2"><Label>Infant price</Label><Input type="number" value={form.infantPrice} onChange={(event) => setField("infantPrice", event.target.value)} /></div>
            <div className="space-y-2 md:col-span-2"><Label>Image or banner URL</Label><Input value={form.image} onChange={(event) => setField("image", event.target.value)} /></div>
            <div className="space-y-2 md:col-span-2"><Label>Flight dates</Label><Textarea rows={4} value={form.flightDates} onChange={(event) => setField("flightDates", event.target.value)} placeholder="18 JUN LHE-JED | 08 JUL JED-LHE" /></div>
            <div className="space-y-2 md:col-span-2"><Label>Hotel options</Label><Textarea rows={4} value={form.hotelOptions} onChange={(event) => setField("hotelOptions", event.target.value)} placeholder="Option 1: Bait Al-Hajeej 2 / Jood Al-Marjan" /></div>
            <div className="space-y-2 md:col-span-2"><Label>Package includes</Label><Textarea rows={5} value={form.includes} onChange={(event) => setField("includes", event.target.value)} /></div>
            <div className="space-y-2 md:col-span-2"><Label>Terms and conditions</Label><Textarea rows={4} value={form.terms} onChange={(event) => setField("terms", event.target.value)} /></div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} className="gradient-primary text-primary-foreground">Save Package</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
