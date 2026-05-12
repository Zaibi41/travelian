import { PageHeader } from "@/components/public/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MapPin, Briefcase } from "lucide-react";
import { toast } from "sonner";

const openings = [
  { title: "Senior Travel Consultant", location: "Lahore, PK", type: "Full-time" },
  { title: "Visa Specialist", location: "Karachi, PK", type: "Full-time" },
  { title: "Frontend Engineer", location: "Remote", type: "Full-time" },
  { title: "Customer Support Agent", location: "Lahore, PK", type: "Full-time" },
];

export default function CareersPage() {
  return (
    <div>
      <PageHeader title="Careers" tagline="Join the Travelian team and shape the future of travel" />
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h2 className="text-xl font-bold text-foreground mb-6">Open Positions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {openings.map(o => (
            <Card key={o.title} className="border-0 shadow-card">
              <CardContent className="p-5">
                <div className="flex items-center gap-2 text-xs text-muted-foreground"><Briefcase className="h-3.5 w-3.5" /> {o.type}</div>
                <h3 className="font-semibold text-foreground mt-1">{o.title}</h3>
                <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1"><MapPin className="h-3.5 w-3.5" /> {o.location}</p>
                <Button size="sm" className="mt-3 gradient-primary text-primary-foreground" onClick={() => toast.success("Application received! We'll be in touch.")}>Apply Now</Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
