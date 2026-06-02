import { useState } from "react";
import { Archive, Edit, FileCheck, ImageIcon, Plus, Trash2, Upload, X } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { EmptyState } from "@/components/EmptyState";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useAdmin } from "@/contexts/AdminStore";
import type { UmrahPackage } from "@/data/models";
import { getRandomPackageImage, uploadPackageImage } from "@/lib/package-image-api";

const defaultForm = { country: "", type: "visit", processingTime: "", validity: "", stayDuration: "", documents: "", terms: "", image: "", status: "active", embassyFee: "0", serviceFee: "0", finalPrice: "0" };
type VisaForm = typeof defaultForm;

function toForm(item?: UmrahPackage): VisaForm {
  if (!item) return defaultForm;
  return { country: item.city || item.name, type: item.packageType || "visit", processingTime: item.processingTime || "", validity: item.validity || "", stayDuration: item.stayDuration || "", documents: (item.requiredDocuments || []).join("\n"), terms: item.terms || "", image: item.image || "", status: item.status === "active" ? "active" : "draft", embassyFee: String(item.embassyFee || 0), serviceFee: String(item.serviceFee || 0), finalPrice: String(item.basePrice || 0) };
}

function buildVisa(form: VisaForm): Omit<UmrahPackage, "packageId"> {
  return { name: `${form.country.trim()} ${form.type} visa`, description: form.terms.trim(), basePrice: Number(form.finalPrice) || 0, duration: form.processingTime.trim(), hotel: "", city: form.country.trim(), status: form.status === "active" ? "active" : "inactive", includes: form.documents.split(/\r?\n/).map(item => item.trim()).filter(Boolean), category: "visa", image: form.image || undefined, packageType: form.type, processingTime: form.processingTime.trim(), validity: form.validity.trim(), stayDuration: form.stayDuration.trim(), requiredDocuments: form.documents.split(/\r?\n/).map(item => item.trim()).filter(Boolean), terms: form.terms.trim(), embassyFee: Number(form.embassyFee) || 0, serviceFee: Number(form.serviceFee) || 0 };
}

export default function VisaPackagesPage() {
  const { visaPackages, addVisaPackage, updateVisaPackage, deleteVisaPackage } = useAdmin();
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<VisaForm>(defaultForm);
  const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const setField = (field: keyof VisaForm, value: string) => setForm(current => ({ ...current, [field]: value }));
  const visible = visaPackages.filter(item => !item.deletedAt);
  const openNew = () => { setEditingId(null); setSelectedImageFile(null); setForm(defaultForm); setOpen(true); };
  const openEdit = (item: UmrahPackage) => { setEditingId(item.packageId); setSelectedImageFile(null); setForm(toForm(item)); setOpen(true); };
  const handleImage = (file?: File) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) return toast.error("Select an image file");
    if (file.size > 5 * 1024 * 1024) return toast.error("Image must be 5 MB or smaller");
    setSelectedImageFile(file);
    setField("image", URL.createObjectURL(file));
  };
  const save = async () => {
    if (!form.country.trim() || !form.processingTime.trim()) return toast.error("Country and processing time are required");
    setSaving(true);
    try {
      const image = selectedImageFile ? await uploadPackageImage("visa", selectedImageFile) : form.image && !form.image.startsWith("blob:") ? form.image : await getRandomPackageImage("visa").catch(() => undefined);
      const payload = buildVisa({ ...form, image: image || "" });
      if (editingId) updateVisaPackage(editingId, payload);
      else addVisaPackage({ ...payload, packageId: crypto.randomUUID() });
      toast.success(editingId ? "Visa package updated" : "Visa package saved");
      setOpen(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to save visa package");
    } finally {
      setSaving(false);
    }
  };

  return <div className="space-y-6 animate-fade-in">
    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between"><div><h1 className="text-2xl font-bold font-display">Visa Package Management</h1><p className="text-sm text-muted-foreground">Publish database-backed visa services with image, requirements and transparent pricing.</p></div><Button onClick={openNew} className="gradient-primary gap-2 text-primary-foreground"><Plus className="h-4 w-4" /> Add Visa Package</Button></div>
    {visible.length === 0 ? <EmptyState icon={FileCheck} title="No visa packages configured" description="Add a real visa service. Only active database records show publicly." actionLabel="Add Visa Package" onAction={openNew} /> : <Card className="shadow-card"><CardHeader><CardTitle>Visa packages</CardTitle></CardHeader><CardContent className="grid gap-3">{visible.map(item => <div key={item.packageId} className="flex flex-col justify-between gap-4 rounded-xl border p-4 lg:flex-row lg:items-center"><div><div className="flex gap-2"><strong>{item.name}</strong><Badge variant={item.status === "active" && !item.archivedAt ? "default" : "secondary"}>{item.archivedAt ? "Archived" : item.status === "active" ? "Published" : "Draft"}</Badge></div><p className="mt-1 text-sm text-muted-foreground">{item.processingTime} | {item.validity || "Validity on request"}</p><p className="mt-1 font-bold text-primary">PKR {item.basePrice.toLocaleString()}</p></div><div className="flex gap-2"><Button size="sm" variant="outline" onClick={() => openEdit(item)}><Edit className="mr-2 h-4 w-4" /> Edit</Button><Button size="sm" variant="outline" onClick={() => updateVisaPackage(item.packageId, { archivedAt: item.archivedAt ? undefined : new Date().toISOString(), status: "inactive" })}><Archive className="mr-2 h-4 w-4" /> {item.archivedAt ? "Unarchive" : "Archive"}</Button><Button size="sm" variant="destructive" onClick={() => deleteVisaPackage(item.packageId)}><Trash2 className="mr-2 h-4 w-4" /> Delete</Button></div></div>)}</CardContent></Card>}
    <Dialog open={open} onOpenChange={setOpen}><DialogContent className="max-h-[92vh] max-w-4xl overflow-y-auto"><DialogHeader><DialogTitle>{editingId ? "Edit Visa Package" : "Add Visa Package"}</DialogTitle></DialogHeader><div className="grid gap-4 md:grid-cols-2">
      <div className="space-y-2"><Label>Country</Label><Input value={form.country} onChange={e => setField("country", e.target.value)} /></div><div className="space-y-2"><Label>Visa type</Label><Select value={form.type} onValueChange={value => setField("type", value)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{["country","visit","study","business","umrah"].map(value => <SelectItem key={value} value={value}>{value}</SelectItem>)}</SelectContent></Select></div>
      <div className="space-y-2"><Label>Processing time</Label><Input value={form.processingTime} onChange={e => setField("processingTime", e.target.value)} placeholder="7 working days" /></div><div className="space-y-2"><Label>Validity</Label><Input value={form.validity} onChange={e => setField("validity", e.target.value)} /></div><div className="space-y-2"><Label>Stay duration</Label><Input value={form.stayDuration} onChange={e => setField("stayDuration", e.target.value)} /></div><div className="space-y-2"><Label>Status</Label><Select value={form.status} onValueChange={value => setField("status", value)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="active">Active / Published</SelectItem><SelectItem value="draft">Draft</SelectItem></SelectContent></Select></div>
      <div className="space-y-2"><Label>Embassy fee</Label><Input inputMode="decimal" value={form.embassyFee} onChange={e => setField("embassyFee", e.target.value)} /></div><div className="space-y-2"><Label>Service fee</Label><Input inputMode="decimal" value={form.serviceFee} onChange={e => setField("serviceFee", e.target.value)} /></div><div className="space-y-2"><Label>Final selling price</Label><Input inputMode="decimal" value={form.finalPrice} onChange={e => setField("finalPrice", e.target.value)} /></div>
      <div className="space-y-2 md:col-span-2"><Label>Service image</Label><div className="flex gap-2"><Input value={form.image} onChange={e => setField("image", e.target.value)} placeholder="Upload an image or enter a URL" /><Button asChild variant="outline"><label className="cursor-pointer"><Upload className="mr-2 h-4 w-4" /> Upload<input className="hidden" type="file" accept="image/*" onChange={e => handleImage(e.target.files?.[0])} /></label></Button></div>{form.image ? <div className="flex items-center gap-3"><img src={form.image} alt="Visa preview" className="h-16 w-24 rounded-lg object-cover" /><Button variant="ghost" size="sm" onClick={() => { setSelectedImageFile(null); setField("image", ""); }}><X className="mr-1 h-4 w-4" /> Remove</Button></div> : <p className="flex gap-2 text-xs text-muted-foreground"><ImageIcon className="h-4 w-4" /> A related S3 fallback is selected when available.</p>}</div>
      <div className="space-y-2 md:col-span-2"><Label>Required documents</Label><Textarea rows={4} value={form.documents} onChange={e => setField("documents", e.target.value)} /></div><div className="space-y-2 md:col-span-2"><Label>Terms</Label><Textarea rows={4} value={form.terms} onChange={e => setField("terms", e.target.value)} /></div>
    </div><div className="sticky bottom-0 flex justify-end gap-2 border-t bg-background pt-4"><Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button disabled={saving} onClick={save} className="gradient-primary text-primary-foreground">{saving ? "Saving..." : editingId ? "Update Visa Service" : "Create Visa Service"}</Button></div></DialogContent></Dialog>
  </div>;
}
