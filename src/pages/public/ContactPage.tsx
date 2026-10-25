import { useState } from "react";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Mail, Phone, MapPin, Clock, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { SEO } from "@/components/SEO";
import { SearchPageHero, PageSection } from "@/components/public/SearchPageShell";
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
      (e.currentTarget.elements.namedItem(Object.keys(errs)[0]) as HTMLInputElement | HTMLTextAreaElement)?.focus();
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
      <SEO title="Contact Travelian | Flights, Umrah & Hotel Support" description="Talk to the Travelian team about flights, Umrah packages and hotels. Call, WhatsApp or send us a message and we reply within 24 hours." />
      <SearchPageHero title="Contact Travelian" description="We're here to help with flights, hotels, Umrah and booking support." />
      <PageSection>
        <div className="grid items-start gap-6 lg:grid-cols-[0.85fr_1.15fr]">
          <div className="space-y-5">
            <div>
              <h2 className="font-display text-xl font-semibold text-foreground md:text-2xl">Talk to Travelian</h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">Contact our team for travel enquiries and help with an existing booking.</p>
            </div>
            <Card className="rounded-xl border-border/70 shadow-card">
              <CardContent className="divide-y divide-border/60 p-5">
                <a href={whatsappUrl("Hi Travelian, I need help with my travel plans.")} target="_blank" rel="noreferrer" className="flex min-h-16 items-center gap-3 rounded-lg py-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                  <WhatsAppIcon className="h-5 w-5 shrink-0 text-primary" aria-hidden="true" /><span><span className="block text-sm font-semibold text-primary">Chat on WhatsApp</span><span className="block text-xs text-muted-foreground">Fastest reply during working hours</span></span>
                </a>
                <a href={`tel:${SUPPORT_PHONE_TEL}`} className="flex min-h-16 items-center gap-3 rounded-lg py-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                  <Phone className="h-5 w-5 shrink-0 text-primary" aria-hidden="true" /><span><span className="block text-sm font-semibold text-primary">{SUPPORT_PHONE_DISPLAY}</span><span className="block text-xs text-muted-foreground">Call our travel desk</span></span>
                </a>
                <a href={`mailto:${SUPPORT_EMAIL}`} className="flex min-h-16 items-center gap-3 rounded-lg py-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                  <Mail className="h-5 w-5 shrink-0 text-primary" aria-hidden="true" /><span className="min-w-0"><span className="block truncate text-sm font-semibold text-primary">{SUPPORT_EMAIL}</span><span className="block text-xs text-muted-foreground">Email our support team</span></span>
                </a>
              </CardContent>
            </Card>
            <Card className="rounded-xl border-border/70 shadow-card">
              <CardContent className="space-y-4 p-5">
                <div className="flex items-start gap-3"><MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" /><div><h3 className="text-sm font-semibold">Office</h3><p className="mt-1 text-sm text-muted-foreground">589-J2, Johar Town Lahore</p></div></div>
                <div className="flex items-start gap-3"><Clock className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" /><div><h3 className="text-sm font-semibold">Working Hours</h3><p className="mt-1 text-sm text-muted-foreground">Mon-Sat: 9AM - 6PM (PKT)</p></div></div>
              </CardContent>
            </Card>
          </div>
          <Card className="rounded-xl border-border/70 shadow-card">
            <CardHeader className="p-5 pb-3"><CardTitle className="font-display text-xl font-semibold md:text-2xl">Send us a message</CardTitle></CardHeader>
            <CardContent className="p-5 pt-0">
              {success ? (
                <div role="status" className="py-10 text-center">
                  <CheckCircle2 className="mx-auto mb-3 h-8 w-8 text-primary" aria-hidden="true" />
                  <h2 className="text-lg font-semibold">Thanks, we've got your message</h2>
                  <p className="mt-1 text-sm text-muted-foreground">Our team will respond within 24 hours.</p>
                  <Button variant="outline" className="mt-5 h-12 rounded-xl" onClick={() => setSuccess(false)}>Send another message</Button>
                </div>
              ) : (
                <form onSubmit={onSubmit} className="space-y-3" noValidate aria-busy={loading}>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-1.5"><Label htmlFor="name">Full Name *</Label><Input id="name" name="name" autoComplete="name" placeholder="Your name" maxLength={100} aria-invalid={!!errors.name} aria-describedby="contact-name-error" className="h-12 rounded-xl" /><p id="contact-name-error" aria-live="polite" className="min-h-5 text-xs text-destructive">{errors.name}</p></div>
                    <div className="space-y-1.5"><Label htmlFor="email">Email *</Label><Input id="email" name="email" type="email" autoComplete="email" placeholder="your@email.com" maxLength={255} aria-invalid={!!errors.email} aria-describedby="contact-email-error" className="h-12 rounded-xl" /><p id="contact-email-error" aria-live="polite" className="min-h-5 text-xs text-destructive">{errors.email}</p></div>
                  </div>
                  <div className="space-y-1.5"><Label htmlFor="subject">Subject *</Label><Input id="subject" name="subject" placeholder="How can we help?" maxLength={150} aria-invalid={!!errors.subject} aria-describedby="contact-subject-error" className="h-12 rounded-xl" /><p id="contact-subject-error" aria-live="polite" className="min-h-5 text-xs text-destructive">{errors.subject}</p></div>
                  <div className="space-y-1.5"><Label htmlFor="message">Message *</Label><Textarea id="message" name="message" placeholder="Tell us more..." rows={5} maxLength={1000} aria-invalid={!!errors.message} aria-describedby="contact-message-error" className="rounded-xl" /><p id="contact-message-error" aria-live="polite" className="min-h-5 text-xs text-destructive">{errors.message}</p></div>
                  <Button type="submit" disabled={loading} className="h-12 w-full rounded-xl bg-primary font-semibold text-primary-foreground hover:bg-primary/90">{loading ? "Sending..." : "Send Message"}</Button>
                </form>
              )}
            </CardContent>
          </Card>
        </div>
      </PageSection>
    </div>
  );
}
