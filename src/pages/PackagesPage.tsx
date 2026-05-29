import { useState } from "react";
import { Archive, Edit, ImageIcon, Package, Plus, Search, Trash2, Upload } from "lucide-react";
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
import { getRandomPackageImage, uploadPackageImage } from "@/lib/package-image-api";
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

function createPackageId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  const bytes = new Uint8Array(16);
  if (typeof crypto !== "undefined" && "getRandomValues" in crypto) {
    crypto.getRandomValues(bytes);
  } else {
    for (let index = 0; index < bytes.length; index += 1) bytes[index] = Math.floor(Math.random() * 256);
  }
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export default function PackagesPage() {
  const { packages, addPackage, updatePackage, deletePackage } = useAdmin();
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<UmrahForm>(defaultForm);
  const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null);
  const [imageUploading, setImageUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const visiblePackages = packages.filter((item) => !item.deletedAt);
  const normalizedSearch = searchQuery.toLowerCase().trim();
  const filteredPackages = normalizedSearch
    ? visiblePackages.filter((item) => [
        item.packageId,
        item.name,
        item.duration,
        item.makkahHotel,
        item.madinahHotel,
        item.departureCity,
        item.city,
      ].filter(Boolean).join(" ").toLowerCase().includes(normalizedSearch))
    : visiblePackages;

  const setField = (field: keyof UmrahForm, value: string) => setForm((current) => ({ ...current, [field]: value }));
  const openNew = () => {
    setEditingId(null);
    setForm({ ...defaultForm });
    setSelectedImageFile(null);
    setOpen(true);
  };
  const openEdit = (item: UmrahPackage) => {
    setEditingId(item.packageId);
    setForm(toForm(item));
    setSelectedImageFile(null);
    setOpen(true);
  };

  const handleImageUpload = async () => {
    if (!selectedImageFile) return toast.error("Please choose an image first");
    setImageUploading(true);
    try {
      const publicUrl = await uploadPackageImage("umrah", selectedImageFile);
      setField("image", publicUrl);
      setSelectedImageFile(null);
      toast.success("Image uploaded to Umrah package folder");
    } catch (error) {
      console.error(error);
      toast.error("Image upload failed. Please try again.");
    } finally {
      setImageUploading(false);
    }
  };

  const resolveImageUrl = async () => {
    if (form.image.trim()) return form.image.trim();
    if (selectedImageFile) return uploadPackageImage("umrah", selectedImageFile);
    try {
      return await getRandomPackageImage("umrah");
    } catch (error) {
      console.error("Unable to select default Umrah image", error);
      return undefined;
    }
  };

  const handleSave = async () => {
    if (!form.title.trim()) return toast.error("Package title is required");
    if (!form.duration.trim()) return toast.error("Duration is required");
    if (!form.makkahHotel.trim()) return toast.error("Makkah hotel is required");
    if (!form.madinahHotel.trim()) return toast.error("Madinah hotel is required");
    setSaving(true);
    try {
      const imageUrl = await resolveImageUrl();
      const payload = buildPackage({ ...form, image: imageUrl || "" });
      if (editingId) {
        updatePackage(editingId, payload);
        toast.success("Umrah package updated");
      } else {
        addPackage({ ...payload, packageId: createPackageId() });
        toast.success(imageUrl ? "Umrah package saved with image" : "Umrah package saved");
      }
      setSelectedImageFile(null);
      setOpen(false);
    } catch (error) {
      console.error(error);
      toast.error("Package could not be saved. Please try again.");
    } finally {
      setSaving(false);
    }
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
          <CardHeader className="gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <CardTitle className="text-base font-display">Umrah packages</CardTitle>
              <p className="mt-1 text-xs text-muted-foreground">Search by package name, hotel, city or package ID from the WhatsApp URL.</p>
            </div>
            <div className="relative w-full lg:max-w-md">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                className="pl-9"
                placeholder="Search name or ID, e.g. 550e8400-e29b..."
              />
            </div>
          </CardHeader>
          <CardContent className="grid gap-3">
            {filteredPackages.length === 0 ? (
              <div className="rounded-xl border border-dashed p-8 text-center">
                <Search className="mx-auto h-8 w-8 text-muted-foreground" />
                <h2 className="mt-3 font-semibold">No package found</h2>
                <p className="mt-1 text-sm text-muted-foreground">Try searching by exact package ID from the public Umrah URL or by package name.</p>
              </div>
            ) : filteredPackages.map((item) => (
              <div key={item.packageId} className="flex flex-col gap-4 rounded-xl border p-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold">{item.name}</p>
                    <Badge variant={item.status === "active" && !item.archivedAt ? "default" : "secondary"}>
                      {item.archivedAt ? "Archived" : item.status === "active" ? "Published" : "Draft"}
                    </Badge>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">{item.duration || "Duration not set"} · {item.hotel || "Hotels not set"} · {item.city || "Departure city not set"}</p>
                  <p className="mt-1 max-w-full break-all text-xs text-muted-foreground">ID: <span className="font-mono">{item.packageId}</span></p>
                  <p className="mt-1 font-bold text-primary">PKR {item.basePrice.toLocaleString()}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" size="sm" className="h-9 px-3" onClick={() => openEdit(item)}><Edit className="mr-2 h-4 w-4" /> Edit</Button>
                  <Button variant="outline" size="sm" className="h-9 px-3" onClick={() => updatePackage(item.packageId, { archivedAt: item.archivedAt ? undefined : new Date().toISOString(), status: "inactive" })}><Archive className="mr-2 h-4 w-4" /> {item.archivedAt ? "Unarchive" : "Archive"}</Button>
                  <Button variant="destructive" size="sm" className="h-9 px-3" onClick={() => deletePackage(item.packageId)}><Trash2 className="mr-2 h-4 w-4" /> Delete</Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Dialog open={open} onOpenChange={(next) => {
        setOpen(next);
        if (!next) setSelectedImageFile(null);
      }}>
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
            <div className="space-y-3 md:col-span-2">
              <Label>Image or banner</Label>
              <div className="grid gap-3 lg:grid-cols-[1fr_auto]">
                <Input value={form.image} onChange={(event) => setField("image", event.target.value)} placeholder="Image URL, uploaded path, or leave blank for random Umrah image" />
                <Button type="button" variant="outline" className="gap-2" onClick={handleImageUpload} disabled={!selectedImageFile || imageUploading}>
                  <Upload className="h-4 w-4" /> {imageUploading ? "Uploading..." : "Upload"}
                </Button>
              </div>
              <div className="grid gap-3 lg:grid-cols-[1fr_auto] lg:items-center">
                <Input type="file" accept="image/*" onChange={(event) => setSelectedImageFile(event.target.files?.[0] || null)} />
                <p className="text-xs text-muted-foreground">
                  Blank image fields auto-select from the S3 folder <span className="font-medium">package-images/umrah</span>.
                </p>
              </div>
              {form.image ? (
                <div className="flex items-center gap-3 rounded-xl border bg-muted/30 p-3">
                  <img src={form.image} alt="Umrah package preview" className="h-16 w-24 rounded-lg object-cover" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium">Current package image</p>
                    <p className="truncate text-xs text-muted-foreground">{form.image}</p>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2 rounded-xl border border-dashed p-3 text-sm text-muted-foreground">
                  <ImageIcon className="h-4 w-4" /> No image selected. Travelian will choose a random Umrah image during save if the S3 folder has images.
                </div>
              )}
            </div>
            <div className="space-y-2 md:col-span-2"><Label>Flight dates</Label><Textarea rows={4} value={form.flightDates} onChange={(event) => setField("flightDates", event.target.value)} placeholder="18 JUN LHE-JED | 08 JUL JED-LHE" /></div>
            <div className="space-y-2 md:col-span-2"><Label>Hotel options</Label><Textarea rows={4} value={form.hotelOptions} onChange={(event) => setField("hotelOptions", event.target.value)} placeholder="Option 1: Bait Al-Hajeej 2 / Jood Al-Marjan" /></div>
            <div className="space-y-2 md:col-span-2"><Label>Package includes</Label><Textarea rows={5} value={form.includes} onChange={(event) => setField("includes", event.target.value)} /></div>
            <div className="space-y-2 md:col-span-2"><Label>Terms and conditions</Label><Textarea rows={4} value={form.terms} onChange={(event) => setField("terms", event.target.value)} /></div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving || imageUploading} className="gradient-primary text-primary-foreground">{saving ? "Saving..." : "Save Package"}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
