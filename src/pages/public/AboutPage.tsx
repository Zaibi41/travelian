import { Card, CardContent } from "@/components/ui/card";
import { Shield, Users, Globe, Award } from "lucide-react";

const stats = [
  { label: "Happy Travelers", value: "10,000+", icon: Users },
  { label: "Destinations", value: "50+", icon: Globe },
  { label: "Years Experience", value: "15+", icon: Award },
  { label: "Partner Agencies", value: "100+", icon: Shield },
];

export default function AboutPage() {
  return (
    <div>
      <section className="bg-gradient-to-br from-sidebar to-sidebar-accent py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-3xl md:text-4xl font-bold font-display text-sidebar-accent-foreground mb-4">About Travelian</h1>
          <p className="text-sidebar-muted max-w-2xl mx-auto text-lg">
            We are a leading travel management company dedicated to making your journey seamless, affordable, and memorable.
          </p>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
          {stats.map(s => (
            <Card key={s.label} className="text-center">
              <CardContent className="p-6">
                <div className="mx-auto h-12 w-12 rounded-xl bg-accent flex items-center justify-center mb-3">
                  <s.icon className="h-6 w-6 text-primary" />
                </div>
                <p className="text-2xl font-bold text-foreground">{s.value}</p>
                <p className="text-sm text-muted-foreground">{s.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div>
            <h2 className="text-2xl font-bold font-display text-foreground mb-4">Our Mission</h2>
            <p className="text-muted-foreground leading-relaxed">
              At Travelian, we believe that every journey should be a transformative experience. Our mission is to provide comprehensive travel solutions — from Umrah pilgrimages to leisure tours — with the highest standards of service and affordability.
            </p>
            <p className="text-muted-foreground leading-relaxed mt-4">
              We partner with trusted agencies, airlines, and hotels worldwide to bring you the best deals and a seamless booking experience. Whether you're planning a spiritual journey or a family vacation, we've got you covered.
            </p>
          </div>
          <div>
            <h2 className="text-2xl font-bold font-display text-foreground mb-4">Why Choose Us</h2>
            <ul className="space-y-3">
              {[
                "Verified and trusted travel packages",
                "Competitive pricing with best price guarantee",
                "24/7 customer support for all travelers",
                "Secure payment options including wallet system",
                "Dedicated agency partner program",
                "Expert travel consultants and guides",
              ].map(item => (
                <li key={item} className="flex items-center gap-3 text-muted-foreground">
                  <div className="h-2 w-2 rounded-full bg-primary shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
