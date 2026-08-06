import { useState } from "react";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Mail, Phone, MapPin, Clock, CheckCircle2, Headphones } from "lucide-react";
import { toast } from "sonner";
import { SEO } from "@/components/SEO";
import { PageHeader } from "@/components/public/PageHeader";
import { WhatsAppIcon } from "@/components/public/WhatsAppIcon";
import { SUPPORT_EMAIL, SUPPORT_PHONE_DISPLAY, SUPPORT_PHONE_TEL, whatsappUrl } from "@/lib/site-config";

const schema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(100),
  email: z.string().trim().email("Enter a valid email").max(255),
  subject: z.string().trim().min(3, "Subject is too short").max(150),
  message: z.string().trim().min(10, "Message must be at least 10 characters").max(1000),
});

export default function ContactPage() {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const parsed = schema.safeParse({
      name: fd.get("name"),
      email: fd.get("email"),
      subject: fd.get("subject"),
      message: fd.get("message"),
    });
    if (!parsed.success) {
      const errs: Record<string, string> = {};
      parsed.error.issues.forEach((i) => { errs[String(i.path[0])] = i.message; });
      setErrors(errs);
      return;
    }
    setErrors({});
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setSuccess(true);
      toast.success("Message sent! We'll reply within 24 hours.");
      (e.target as HTMLFormElement).reset();
    }, 600);
  };

  return (
    <div>
      <SEO
        title="Contact Travelian | Flights, Umrah, Visa & Hotel Support"
        description="Talk to the Travelian team about flights, Umrah packages, visas, hotels and tours. Call, WhatsApp or send us a message and we reply within 24 hours."
      />
      <PageHeader
        eyebrow="We're here to help"
        title="Contact Travelian"
        tagline="Speak to a real travel consultant about fares, Umrah packages, visa documents or a booking you have already made."
        icon={<Headphones className="h-6 w-6" />}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="mb-8 grid gap-3 sm:grid-cols-3">
          <a
            href={whatsappUrl("Hi Travelian, I need help with my travel plans.")}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-3 rounded-2xl border bg-card p-4 shadow-card transition-all hover:-translate-y-0.5 hover:shadow-hover"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-whatsapp text-whatsapp-foreground">
              <WhatsAppIcon className="h-5 w-5" />
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-semibold text-foreground">Chat on WhatsApp</span>
              <span className="block text-xs text-muted-foreground">Fastest reply during working hours</span>
            </span>
          </a>
          <a
            href={`tel:${SUPPORT_PHONE_TEL}`}
            className="flex items-center gap-3 rounded-2xl border bg-card p-4 shadow-card transition-all hover:-translate-y-0.5 hover:shadow-hover"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent text-primary">
              <Phone className="h-5 w-5" />
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-semibold text-foreground">{SUPPORT_PHONE_DISPLAY}</span>
              <span className="block text-xs text-muted-foreground">Call our travel desk</span>
            </span>
          </a>
          <a
            href={`mailto:${SUPPORT_EMAIL}`}
            className="flex items-center gap-3 rounded-2xl border bg-card p-4 shadow-card transition-all hover:-translate-y-0.5 hover:shadow-hover"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gold-light text-gold-foreground">
              <Mail className="h-5 w-5" />
            </span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-semibold text-foreground">{SUPPORT_EMAIL}</span>
              <span className="block text-xs text-muted-foreground">Email our support team</span>
            </span>
          </a>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <Card>
              <CardHeader><CardTitle>Send us a Message</CardTitle></CardHeader>
              <CardContent>
                {success ? (
                  <div className="text-center py-10">
                    <CheckCircle2 className="h-12 w-12 text-success mx-auto mb-3" />
                    <h2 className="text-lg font-semibold">Thanks, we've got your message</h2>
                    <p className="text-sm text-muted-foreground mt-1">Our team will respond within 24 hours.</p>
                    <Button variant="outline" className="mt-5" onClick={() => setSuccess(false)}>Send another message</Button>
                  </div>
                ) : (
                  <form onSubmit={onSubmit} className="space-y-4" noValidate>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="name">Full Name *</Label>
                        <Input id="name" name="name" placeholder="Your name" maxLength={100} />
                        {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="email">Email *</Label>
                        <Input id="email" name="email" type="email" placeholder="your@email.com" maxLength={255} />
                        {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="subject">Subject *</Label>
                      <Input id="subject" name="subject" placeholder="How can we help?" maxLength={150} />
                      {errors.subject && <p className="text-xs text-destructive">{errors.subject}</p>}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="message">Message *</Label>
                      <Textarea id="message" name="message" placeholder="Tell us more..." rows={5} maxLength={1000} />
                      {errors.message && <p className="text-xs text-destructive">{errors.message}</p>}
                    </div>
                    <Button type="submit" disabled={loading} className="gradient-primary text-primary-foreground">
                      {loading ? "Sending..." : "Send Message"}
                    </Button>
                  </form>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="space-y-4">
            {[
              { icon: MapPin, title: "Address", detail: "589-J2, Johar Town Lahore" },
              { icon: Phone, title: "Phone", detail: "+92 324 4440014" },
              { icon: Mail, title: "Email", detail: "travelian.pk@gmail.com" },
              { icon: Clock, title: "Working Hours", detail: "Mon-Sat: 9AM - 6PM" },
            ].map((item) => (
              <Card key={item.title}>
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-accent flex items-center justify-center shrink-0">
                    <item.icon className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">{item.title}</p>
                    <p className="text-sm text-muted-foreground whitespace-pre-line">{item.detail}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
