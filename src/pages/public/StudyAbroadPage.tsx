import { BookOpen, CheckCircle2, FileText, GraduationCap, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/public/PageHeader";
import { WhatsAppIcon } from "@/components/public/WhatsAppIcon";

const whatsappBase = "https://wa.me/923244440014";

const countries = [
  { name: "United Kingdom", tag: "UK", focus: "Universities, CAS guidance, visa file preparation" },
  { name: "Sweden", tag: "SE", focus: "Program shortlisting, documentation and residence permit guidance" },
  { name: "Finland", tag: "FI", focus: "Admissions support, interview preparation and visa guidance" },
  { name: "Hungary", tag: "HU", focus: "University options, document checklist and application support" },
];

const documents = [
  "Passport and CNIC",
  "Academic transcripts and certificates",
  "English language proof where required",
  "Bank statement and financial documents",
  "Statement of purpose and supporting documents",
];

export default function StudyAbroadPage() {
  const message = [
    "Hello Travelian,",
    "",
    "I want study abroad consultancy details.",
    "Countries: UK, Sweden, Finland, Hungary",
    "Please guide me with eligibility, documents and next steps.",
  ].join("\n");

  return (
    <div>
      <PageHeader title="Study Abroad" tagline="Study consultancy support for UK, Sweden, Finland and Hungary" />
      <div className="mx-auto max-w-7xl space-y-10 px-4 py-10 sm:px-6 lg:px-8">
        <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          {countries.map((country) => (
            <Card key={country.name} className="border-0 shadow-card">
              <CardContent className="p-5">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <GraduationCap className="h-6 w-6" />
                </div>
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-primary">{country.tag}</p>
                <h2 className="mt-1 text-lg font-black text-foreground">{country.name}</h2>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{country.focus}</p>
              </CardContent>
            </Card>
          ))}
        </section>

        <section className="grid gap-6 lg:grid-cols-[1fr_360px]">
          <Card className="border-0 shadow-card">
            <CardContent className="p-6">
              <div className="flex items-start gap-3">
                <BookOpen className="mt-1 h-5 w-5 text-primary" />
                <div>
                  <h2 className="text-xl font-black text-foreground">Travelian study consultancy</h2>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    Travelian coordinates study visa consultancy support through its education partners, including Eduseferz, so applicants can understand country options, admission requirements, documentation and next steps before filing.
                  </p>
                </div>
              </div>
              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                {["Country and university guidance", "Document checklist review", "Application pathway support", "Visa file preparation guidance"].map((item) => (
                  <p key={item} className="flex items-center gap-2 text-sm text-muted-foreground">
                    <CheckCircle2 className="h-4 w-4 text-success" /> {item}
                  </p>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-card">
            <CardContent className="p-6">
              <div className="mb-4 flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                <h2 className="font-black text-foreground">Common documents</h2>
              </div>
              <div className="space-y-2">
                {documents.map((document) => (
                  <p key={document} className="flex gap-2 text-sm text-muted-foreground">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" /> {document}
                  </p>
                ))}
              </div>
            </CardContent>
          </Card>
        </section>

        <section className="rounded-2xl bg-sidebar p-6 text-sidebar-foreground shadow-card md:p-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="flex items-center gap-2 text-sm text-sidebar-muted"><MapPin className="h-4 w-4" /> Pakistan-based consultancy coordination</p>
              <h2 className="mt-2 text-2xl font-black text-sidebar-accent-foreground">Ready to discuss your study plan?</h2>
            </div>
            <a href={`${whatsappBase}?text=${encodeURIComponent(message)}`} target="_blank" rel="noreferrer">
              <Button className="rounded-xl bg-[#25D366] px-5 font-bold text-white hover:bg-[#20bd5a]">
                <WhatsAppIcon className="mr-2 h-4 w-4" /> WhatsApp Inquiry
              </Button>
            </a>
          </div>
        </section>
      </div>
    </div>
  );
}
