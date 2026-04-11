import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileCheck, Clock, CheckCircle2 } from "lucide-react";
import { mockVisaPackages } from "@/data/mock";

export default function PublicVisaPage() {
  const visas = mockVisaPackages.filter(v => v.status === 'active');

  return (
    <div>
      <section className="bg-gradient-to-br from-sidebar to-sidebar-accent py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-3xl md:text-4xl font-bold font-display text-sidebar-accent-foreground mb-2">Visa Services</h1>
          <p className="text-sidebar-muted">Hassle-free visa processing for your travel needs</p>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {visas.map(visa => (
            <Card key={visa.packageId} className="overflow-hidden hover:shadow-elevated transition-all text-center group">
              <div className="h-40 bg-gradient-to-br from-success/10 to-accent flex items-center justify-center">
                <FileCheck className="h-14 w-14 text-success/30 group-hover:scale-110 transition-transform" />
              </div>
              <CardContent className="p-5">
                <h3 className="text-lg font-semibold text-foreground">{visa.name}</h3>
                <div className="flex items-center justify-center gap-1 mt-2 text-sm text-muted-foreground">
                  <Clock className="h-3.5 w-3.5" /> {visa.duration}
                </div>
                <p className="text-sm text-muted-foreground mt-3">{visa.description}</p>
                <div className="space-y-1 mt-3 text-left">
                  {visa.includes.map(i => (
                    <p key={i} className="flex items-center gap-2 text-xs text-muted-foreground">
                      <CheckCircle2 className="h-3.5 w-3.5 text-success shrink-0" /> {i}
                    </p>
                  ))}
                </div>
                <div className="mt-4 pt-4 border-t">
                  <p className="text-2xl font-bold text-primary">${visa.basePrice}</p>
                  <Button className="gradient-primary text-primary-foreground w-full mt-3">Apply Now</Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
