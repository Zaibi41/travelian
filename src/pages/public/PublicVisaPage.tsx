import { CheckCircle2, Clock, FileCheck } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/public/PageHeader";
import { WhatsAppIcon } from "@/components/public/WhatsAppIcon";
import { useAdmin } from "@/contexts/AdminStore";
import { isPublishedPackage } from "@/lib/package-availability";

const whatsappBase = "https://wa.me/923244440014";
const siteBase = "https://www.travelian.pk";

export default function PublicVisaPage() {
  const { visaPackages } = useAdmin();
  const visas = visaPackages.filter(item => isPublishedPackage(item, "visa"));

  return <div>
    <PageHeader title="Visa Services" tagline="Database-managed visa packages with transparent processing details" />
    <div className="mx-auto max-w-7xl space-y-10 px-4 py-10 sm:px-6 lg:px-8">
      {visas.length === 0 ? <div className="rounded-2xl border bg-card p-8 text-center shadow-card"><FileCheck className="mx-auto h-12 w-12 text-muted-foreground" /><h2 className="mt-4 text-xl font-bold">No visa packages are published right now</h2><p className="mx-auto mt-2 max-w-2xl text-sm text-muted-foreground">Travelian only shows active visa packages from the database. Contact our visa team for current availability.</p><a href={`${whatsappBase}?text=${encodeURIComponent("Hello Travelian, please share visa service details.")}`} target="_blank" rel="noreferrer"><Button className="mt-5 bg-[#25D366] text-white hover:bg-[#20bd5a]"><WhatsAppIcon className="mr-2 h-4 w-4" /> Ask Visa Team</Button></a></div> :
      <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">{visas.map(item => <Card key={item.packageId} className="overflow-hidden border-0 shadow-card">{item.image ? <img src={item.image} alt={item.name} className="h-48 w-full object-cover" /> : <div className="flex h-48 items-center justify-center bg-primary/10"><FileCheck className="h-12 w-12 text-primary" /></div>}<CardContent className="space-y-4 p-5"><div><Badge className="mb-2 capitalize">{item.packageType} visa</Badge><h2 className="text-lg font-bold">{item.name}</h2><p className="mt-1 text-sm text-muted-foreground">{item.processingTime || item.duration} | {item.validity || "Validity on request"}</p></div><p className="text-2xl font-black text-primary">PKR {item.basePrice.toLocaleString()}</p><div className="grid grid-cols-2 gap-2"><Button asChild className="gradient-primary text-primary-foreground"><Link to={`/visa/${item.packageId}`}>View Details</Link></Button><a href={`${whatsappBase}?text=${encodeURIComponent(`Hello Travelian,\n\nI want to inquire about this visa service:\n${item.name}\nProcessing: ${item.processingTime || item.duration}\nPrice: PKR ${item.basePrice.toLocaleString()}\nService URL: ${siteBase}/visa/${item.packageId}`)}`} target="_blank" rel="noreferrer"><Button variant="outline" className="w-full"><WhatsAppIcon className="mr-2 h-4 w-4" /> WhatsApp</Button></a></div></CardContent></Card>)}</section>}
      <section className="rounded-2xl border bg-card p-6 shadow-card"><div className="flex items-start gap-3"><Clock className="mt-1 h-5 w-5 text-primary" /><div><h2 className="font-bold">Processing times vary by country</h2><p className="mt-1 text-sm text-muted-foreground">Travelian confirms fees, validity, stay duration, requirements and terms before collecting payment.</p></div></div></section>
      <section className="rounded-2xl bg-muted/40 p-6"><h2 className="font-bold">General requirements</h2><p className="mt-3 flex gap-2 text-sm text-muted-foreground"><CheckCircle2 className="h-4 w-4 text-success" /> Passport validity and supporting documents depend on the selected service.</p></section>
    </div>
  </div>;
}
