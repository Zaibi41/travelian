import { Check, Clock, FileCheck } from "lucide-react";
import { useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { WhatsAppIcon } from "@/components/public/WhatsAppIcon";
import { useAdmin } from "@/contexts/AdminStore";
import { isPublishedPackage } from "@/lib/package-availability";
import { whatsappUrl } from "@/lib/site-config";

const siteBase = "https://www.travelian.pk";

export default function VisaDetailPage() {
  const { id } = useParams();
  const { visaPackages } = useAdmin();
  const item = visaPackages.find(entry => entry.packageId === id && isPublishedPackage(entry, "visa"));
  if (!item) return <div className="mx-auto max-w-4xl px-4 py-14"><div className="rounded-2xl border bg-card p-8 text-center shadow-card"><FileCheck className="mx-auto h-12 w-12 text-muted-foreground" /><h1 className="mt-4 text-2xl font-bold">Visa service details are not published</h1><p className="mx-auto mt-2 max-w-2xl text-sm text-muted-foreground">This visa service is not available from the Travelian database right now.</p></div></div>;
  const heroDescription = item.description && item.description !== item.terms && !/^terms\b/i.test(item.description.trim()) ? item.description : `${item.city || item.name} visa guidance with Travelian support.`;
  const message = `Hello Travelian,\n\nI want to inquire about this visa service:\n${item.name}\nProcessing: ${item.processingTime || item.duration}\nValidity: ${item.validity || "Please confirm"}\nStay: ${item.stayDuration || "Please confirm"}\nPrice: PKR ${item.basePrice.toLocaleString()}\nService URL: ${siteBase}/visa/${item.packageId}`;
  return <div className="bg-muted/30"><section className="gradient-hero"><div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[1fr_380px] lg:px-8"><div className="text-primary-foreground"><Badge className="mb-4 bg-white/15 capitalize text-primary-foreground">{item.packageType} visa</Badge><h1 className="text-3xl font-black md:text-5xl">{item.name}</h1><p className="mt-3 max-w-3xl text-primary-foreground/80">{heroDescription}</p></div><Card><CardContent className="p-6"><p className="text-sm text-muted-foreground">Final price</p><p className="mt-1 text-4xl font-black text-primary">PKR {item.basePrice.toLocaleString()}</p><a href={whatsappUrl(message)} target="_blank" rel="noreferrer"><Button className="mt-5 w-full bg-whatsapp text-whatsapp-foreground hover:bg-whatsapp-hover"><WhatsAppIcon className="mr-2 h-4 w-4" /> WhatsApp Inquiry</Button></a></CardContent></Card></div></section><div className="mx-auto grid max-w-7xl gap-6 px-4 py-8 sm:px-6 lg:grid-cols-[1fr_360px] lg:px-8"><div className="space-y-6">{item.image && <img src={item.image} alt={item.name} className="max-h-[460px] w-full rounded-2xl object-cover shadow-card" />}<Card><CardHeader><CardTitle>Required documents</CardTitle></CardHeader><CardContent className="space-y-2">{(item.requiredDocuments || item.includes).map(document => <p key={document} className="flex gap-2 text-sm"><Check className="h-4 w-4 text-success" /> {document}</p>)}</CardContent></Card>{item.terms && <Card><CardHeader><CardTitle>Terms & Conditions</CardTitle></CardHeader><CardContent className="whitespace-pre-line text-sm leading-relaxed text-muted-foreground">{item.terms}</CardContent></Card>}</div><aside className="space-y-4"><Card><CardHeader><CardTitle>Overview</CardTitle></CardHeader><CardContent className="space-y-3 p-5 pt-0 text-sm"><p><Clock className="mr-2 inline h-4 w-4 text-primary" /> Processing: <strong>{item.processingTime}</strong></p><p>Validity: <strong>{item.validity || "On request"}</strong></p><p>Stay: <strong>{item.stayDuration || "On request"}</strong></p></CardContent></Card></aside></div></div>;
}

