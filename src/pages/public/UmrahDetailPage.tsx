import { useParams, Link, useNavigate } from "react-router-dom";
import { PageHeader } from "@/components/public/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Check, Clock, Hotel, Plane, FileCheck, Calendar, MessageCircle } from "lucide-react";
import { mockPackages } from "@/data/mock";

export default function UmrahDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const pkg = mockPackages.find(p => p.packageId === id) || mockPackages[0];

  const required = ["Valid Passport (6+ months)", "Passport-size photo", "Vaccination certificate", "CNIC copy"];

  return (
    <div>
      <PageHeader title={pkg.name} tagline="A complete spiritual journey designed for your peace of mind" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardContent className="p-6">
              <h2 className="text-lg font-bold text-foreground mb-3">Package Details</h2>
              <p className="text-sm text-muted-foreground">{pkg.description}</p>
              <div className="flex flex-wrap gap-3 mt-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-1"><Clock className="h-4 w-4 text-primary" /> {pkg.duration}</span>
                <span className="flex items-center gap-1"><Calendar className="h-4 w-4 text-primary" /> Departure: Flexible</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <h2 className="text-lg font-bold text-foreground mb-3 flex items-center gap-2"><Hotel className="h-5 w-5 text-primary" /> Hotel Details</h2>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><strong className="text-foreground">Makkah:</strong> 5★ hotel within 500m of Haram</li>
                <li><strong className="text-foreground">Madinah:</strong> 4★ hotel within 300m of Masjid an-Nabawi</li>
                <li>Daily breakfast & dinner included</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <h2 className="text-lg font-bold text-foreground mb-3 flex items-center gap-2"><Plane className="h-5 w-5 text-primary" /> Flight Details</h2>
              <p className="text-sm text-muted-foreground">Direct flights from major Pakistani cities to Jeddah, returning from Madinah. Carriers: PIA / Saudia / Qatar Airways.</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <h2 className="text-lg font-bold text-foreground mb-3">Inclusions</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {pkg.includes.map(i => (
                  <div key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Check className="h-4 w-4 text-success" /> {i}
                  </div>
                ))}
              </div>
              <h3 className="font-semibold text-foreground mt-5 mb-2">Exclusions</h3>
              <ul className="text-sm text-muted-foreground list-disc pl-5 space-y-1">
                <li>Personal expenses</li>
                <li>Optional Ziyarat tours</li>
                <li>Travel insurance (recommended)</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <h2 className="text-lg font-bold text-foreground mb-3 flex items-center gap-2"><FileCheck className="h-5 w-5 text-primary" /> Required Documents</h2>
              <ul className="space-y-2">
                {required.map(r => (
                  <li key={r} className="flex items-center gap-2 text-sm text-muted-foreground"><Check className="h-4 w-4 text-success" /> {r}</li>
                ))}
              </ul>
              <p className="text-xs text-muted-foreground mt-3">Visa processing time: 7–10 business days.</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <h2 className="text-lg font-bold text-foreground mb-3">Terms & Conditions</h2>
              <Accordion type="single" collapsible>
                <AccordionItem value="1"><AccordionTrigger>Cancellation Policy</AccordionTrigger><AccordionContent className="text-sm text-muted-foreground">Free cancellation up to 30 days before departure. 50% refund within 30–15 days. No refund within 14 days of departure.</AccordionContent></AccordionItem>
                <AccordionItem value="2"><AccordionTrigger>Payment Schedule</AccordionTrigger><AccordionContent className="text-sm text-muted-foreground">25% deposit on booking, balance due 30 days before departure.</AccordionContent></AccordionItem>
                <AccordionItem value="3"><AccordionTrigger>Visa Acceptance</AccordionTrigger><AccordionContent className="text-sm text-muted-foreground">Visa issuance is at the discretion of the Saudi authorities. Travelian is not liable for rejections.</AccordionContent></AccordionItem>
              </Accordion>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card className="sticky top-24">
            <CardContent className="p-5">
              <Badge className="bg-gold/15 text-gold border-0">Best Value</Badge>
              <p className="text-3xl font-extrabold text-primary mt-3">${pkg.basePrice}</p>
              <p className="text-xs text-muted-foreground">per person · {pkg.duration}</p>
              <Button className="w-full mt-4 gradient-primary text-primary-foreground" onClick={() => navigate(`/booking?type=umrah&id=${pkg.packageId}`)}>Book Now</Button>
              <Link to="/contact?type=umrah" className="block">
                <Button variant="outline" className="w-full mt-2 gap-2"><MessageCircle className="h-4 w-4" /> Send Inquiry</Button>
              </Link>
              <a href="https://wa.me/923244440014" target="_blank" rel="noreferrer" className="block">
                <Button variant="outline" className="w-full mt-2 gap-2"><MessageCircle className="h-4 w-4" /> WhatsApp Us</Button>
              </a>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
