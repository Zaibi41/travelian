import { Link, useParams } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, FileCheck, Check, Clock } from "lucide-react";
import { mockVisaPackages } from "@/data/mock";
import { SEO } from "@/components/SEO";

const requirements = [
  "Valid passport (6+ months)",
  "Recent passport-size photographs",
  "Bank statements (last 6 months)",
  "Travel itinerary & hotel bookings",
  "Cover letter & invitation (if applicable)",
];

export default function VisaDetailPage() {
  const { id } = useParams();
  const visa = mockVisaPackages.find(v => v.packageId === id);

  if (!visa) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-20 text-center">
        <h1 className="text-2xl font-bold">Visa service not found</h1>
        <Link to="/visa-services"><Button className="mt-6">Browse visa services</Button></Link>
      </div>
    );
  }

  return (
    <div>
      <SEO title={`${visa.name} | Travelian Visa`} description={visa.description} />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <Link to="/visa-services" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4 mr-1" /> Back to visa services
        </Link>
      </div>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid lg:grid-cols-3 gap-8 pb-12">
        <div className="lg:col-span-2 space-y-6">
          <div>
            <div className="h-11 w-11 rounded-xl bg-gold-light flex items-center justify-center mb-3"><FileCheck className="h-5 w-5 text-gold" /></div>
            <h1 className="text-3xl font-bold font-display">{visa.name}</h1>
            <p className="text-sm text-muted-foreground flex items-center gap-1 mt-2"><Clock className="h-4 w-4" /> Validity: {visa.duration}</p>
            <p className="mt-4 text-muted-foreground leading-relaxed">{visa.description}</p>
          </div>
          <Card>
            <CardContent className="p-6">
              <h2 className="font-semibold mb-3">Service includes</h2>
              <ul className="grid sm:grid-cols-2 gap-2">
                {visa.includes.map(i => <li key={i} className="flex items-center gap-2 text-sm"><Check className="h-4 w-4 text-success" /> {i}</li>)}
              </ul>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <h2 className="font-semibold mb-3">Required documents</h2>
              <ul className="space-y-2">
                {requirements.map(r => <li key={r} className="flex items-center gap-2 text-sm text-muted-foreground"><Check className="h-4 w-4 text-success" /> {r}</li>)}
              </ul>
            </CardContent>
          </Card>
        </div>
        <aside>
          <Card className="sticky top-24">
            <CardContent className="p-6">
              <span className="text-xs text-muted-foreground">Service fee from</span>
              <p className="text-3xl font-bold text-primary">PKR {visa.basePrice}</p>
              <p className="text-xs text-muted-foreground mb-4">Government fees billed separately</p>
              <Link to={`/booking?type=visa&id=${visa.packageId}`}>
                <Button className="w-full gradient-primary text-primary-foreground">Apply now</Button>
              </Link>
              <Link to={`/contact?type=visa&id=${visa.packageId}`}>
                <Button variant="outline" className="w-full mt-2">Ask a question</Button>
              </Link>
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  );
}


