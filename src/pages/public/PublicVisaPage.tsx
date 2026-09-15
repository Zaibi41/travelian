import { CheckCircle2, Clock, FileCheck, Shield, Users, MessageCircle, CheckCheck, Plane, FileText, CreditCard, Send, HelpCircle, AlertCircle, Banknote, XCircle, MapPin } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/public/PageHeader";
import { PackageImage } from "@/components/public/PackageImage";
import { WhatsAppIcon } from "@/components/public/WhatsAppIcon";
import { useAdmin } from "@/contexts/AdminStore";
import { isPublishedPackage } from "@/lib/package-availability";
import { whatsappUrl } from "@/lib/site-config";
import { useState } from "react";

const siteBase = "https://www.travelian.pk";

export default function PublicVisaPage() {
  const { visaPackages } = useAdmin();
  const visas = visaPackages.filter(item => isPublishedPackage(item, "visa"));
  const [openFaq, setOpenFaq] = useState<string | null>(null);

  const faqs = [
    {
      id: "processing-time",
      icon: Clock,
      question: "How long does visa processing take?",
      answer: "Processing times vary by country and visa type, typically ranging from 3-15 business days. Express processing is available for select destinations. We'll confirm exact timelines when you inquire.",
      color: "text-blue-500"
    },
    {
      id: "documents",
      icon: FileText,
      question: "What documents do I need?",
      answer: "Common requirements include a valid passport (6+ months validity), photos, bank statements, travel itinerary, and proof of accommodation. Specific requirements vary by destination - we provide a customized checklist for each application.",
      color: "text-purple-500"
    },
    {
      id: "fees",
      icon: Banknote,
      question: "What are the visa fees?",
      answer: "Visa fees include government charges (paid to embassy/consulate) and our service fee. Total costs are confirmed upfront before you proceed. Fees vary by country, visa type, and processing speed.",
      color: "text-emerald-500"
    },
    {
      id: "rejection",
      icon: XCircle,
      question: "What if my visa gets rejected?",
      answer: "We review all applications before submission to minimize rejection risk. Government visa fees are non-refundable if rejected. Our service fee may be partially refundable depending on the stage - full terms are shared before payment.",
      color: "text-red-500"
    },
    {
      id: "tracking",
      icon: MapPin,
      question: "Can I track my visa application status?",
      answer: "Yes! After submission, you can track your application status through the embassy portal (where available) and we provide regular updates via WhatsApp and email until your passport is returned.",
      color: "text-orange-500"
    },
    {
      id: "assistance",
      icon: Users,
      question: "Do you help with appointment booking?",
      answer: "Yes, where required, we assist with visa appointment scheduling at VFS/embassy centers. For select countries, our field representative can accompany you during biometric submission.",
      color: "text-teal-500"
    }
  ];

  const processSteps = [
    {
      number: "01",
      icon: MessageCircle,
      title: "Consult & Select",
      description: "Choose your destination and share travel dates. Our visa team confirms requirements and fees."
    },
    {
      number: "02",
      icon: FileText,
      title: "Submit Documents",
      description: "Upload required documents based on our checklist. We review and guide you through any gaps."
    },
    {
      number: "03",
      icon: Send,
      title: "Application Filing",
      description: "We complete and submit your visa application to the embassy/consulate on your behalf."
    },
    {
      number: "04",
      icon: CheckCheck,
      title: "Track & Receive",
      description: "Track status updates and receive your visa-stamped passport with delivery support."
    }
  ];

  const trustBadges = [
    { icon: Shield, title: "Document Review", description: "Expert review before submission" },
    { icon: Users, title: "Dedicated Consultant", description: "Personal guidance throughout" },
    { icon: Clock, title: "Timely Processing", description: "We track and follow up actively" },
    { icon: CheckCircle2, title: "High Success Rate", description: "Thorough preparation process" }
  ];

  const commonRequirements = [
    "Valid passport with minimum 6 months validity",
    "Recent passport-size photographs (as per embassy specs)",
    "Completed visa application form",
    "Travel itinerary (flight booking confirmation)",
    "Hotel reservation or accommodation proof",
    "Bank statements (last 6 months)",
    "Cover letter stating purpose of travel",
    "Travel insurance (for select countries)"
  ];

  return (
    <div className="bg-gradient-to-b from-background to-muted/20">
      {/* Hero Section */}
      <section className="gradient-hero text-primary-foreground relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
          <div className="absolute left-10 top-10 h-96 w-96 rounded-full bg-primary/20 blur-3xl" />
          <div className="absolute bottom-0 right-0 h-96 w-96 rounded-full bg-gold/15 blur-3xl" />
        </div>
        
        <div className="relative mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8 lg:py-24">
          <div className="text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-gold/40 bg-gold/10 px-4 py-1.5 text-xs sm:text-sm font-semibold uppercase tracking-wider text-gold mb-6">
              <Plane className="h-4 w-4" />
              Visa Services
            </div>
            <h1 className="font-display text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight">
              Hassle-Free Visa Processing
            </h1>
            <p className="mt-4 sm:mt-6 mx-auto max-w-3xl text-base sm:text-lg md:text-xl text-primary-foreground/80 leading-relaxed">
              Expert visa assistance for tourism, business, and study abroad. We handle documentation, application filing, and embassy coordination for a smooth approval process.
            </p>
            <div className="mt-8 sm:mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
              <a href={whatsappUrl("Hello Travelian, I need visa assistance.")} target="_blank" rel="noreferrer">
                <Button size="lg" className="h-12 sm:h-14 w-full sm:w-auto px-6 sm:px-8 gradient-gold text-slate-900 font-bold text-base hover:shadow-premium">
                  <WhatsAppIcon className="mr-2 h-5 w-5" />
                  Consult Visa Team
                </Button>
              </a>
              <Button size="lg" variant="outline" className="h-12 sm:h-14 w-full sm:w-auto px-6 sm:px-8 border-2 border-primary-foreground/30 bg-transparent text-primary-foreground hover:bg-primary-foreground/10 font-semibold text-base">
                Check Visa Requirements
              </Button>
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-7xl space-y-12 sm:space-y-16 lg:space-y-20 px-4 py-10 sm:py-12 lg:py-16 sm:px-6 lg:px-8">
        
        {/* How It Works */}
        <section>
          <div className="text-center mb-8 sm:mb-10 lg:mb-12">
            <h2 className="font-display text-2xl sm:text-3xl lg:text-4xl font-bold">How Our Visa Process Works</h2>
            <p className="mt-3 sm:mt-4 text-sm sm:text-base text-muted-foreground max-w-2xl mx-auto">
              Four simple steps from consultation to visa approval
            </p>
          </div>
          
          <div className="grid gap-4 sm:gap-6 md:grid-cols-2 lg:grid-cols-4">
            {processSteps.map((step) => (
              <Card key={step.number} className="border-0 shadow-card hover:shadow-hover transition-shadow">
                <CardContent className="p-5 sm:p-6">
                  <div className="flex items-start gap-4">
                    <div className="flex h-12 w-12 sm:h-14 sm:w-14 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary ring-1 ring-primary/20">
                      <step.icon className="h-6 w-6 sm:h-7 sm:w-7" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs sm:text-sm font-bold text-primary mb-1">{step.number}</div>
                      <h3 className="text-base sm:text-lg font-bold mb-2">{step.title}</h3>
                      <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">{step.description}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Visa Packages */}
        {visas.length > 0 && (
          <section>
            <div className="text-center mb-8 sm:mb-10 lg:mb-12">
              <h2 className="font-display text-2xl sm:text-3xl lg:text-4xl font-bold">Popular Visa Services</h2>
              <p className="mt-3 sm:mt-4 text-sm sm:text-base text-muted-foreground">
                Select destinations with transparent pricing and processing details
              </p>
            </div>
            
            <div className="grid gap-5 sm:gap-6 md:grid-cols-2 xl:grid-cols-3">
              {visas.map(item => (
                <Card key={item.packageId} className="overflow-hidden border-0 shadow-card hover:shadow-hover transition-shadow group">
                  <PackageImage src={item.image} alt={item.name} className="h-48 sm:h-56 w-full object-cover group-hover:scale-105 transition-transform duration-300" />
                  <CardContent className="space-y-4 p-5 sm:p-6">
                    <div>
                      <Badge className="mb-2 capitalize text-xs">{item.packageType} visa</Badge>
                      <h3 className="text-lg sm:text-xl font-bold">{item.name}</h3>
                      <p className="mt-2 text-xs sm:text-sm text-muted-foreground flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        {item.processingTime || item.duration} | {item.validity || "Validity on request"}
                      </p>
                    </div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-xs text-muted-foreground">Starting from</span>
                      <span className="text-2xl sm:text-3xl font-black text-primary">PKR {item.basePrice.toLocaleString()}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <Button asChild className="gradient-primary text-primary-foreground font-semibold">
                        <Link to={`/visa/${item.packageId}`}>View Details</Link>
                      </Button>
                      <a href={whatsappUrl(`Hello Travelian,\n\nI want to inquire about:\n${item.name}\nProcessing: ${item.processingTime || item.duration}\nPrice: PKR ${item.basePrice.toLocaleString()}\n\n${siteBase}/visa/${item.packageId}`)} target="_blank" rel="noreferrer">
                        <Button variant="outline" className="w-full font-semibold">
                          <WhatsAppIcon className="mr-2 h-4 w-4" />
                          Inquire
                        </Button>
                      </a>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        )}

        {/* Empty State */}
        {visas.length === 0 && (
          <section>
            <Card className="border-0 shadow-card">
              <CardContent className="p-8 sm:p-10 lg:p-12 text-center">
                <div className="mx-auto w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-primary/10 flex items-center justify-center mb-6">
                  <FileCheck className="h-8 w-8 sm:h-10 sm:w-10 text-primary" />
                </div>
                <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold mb-4">Visa Services Available on Request</h2>
                <p className="text-sm sm:text-base text-muted-foreground max-w-2xl mx-auto mb-8">
                  We process visas for multiple destinations. Contact our visa team to discuss your travel plans, required documents, processing timeline, and fees.
                </p>
                <a href={whatsappUrl("Hello Travelian, I need visa assistance for my upcoming travel.")} target="_blank" rel="noreferrer">
                  <Button size="lg" className="h-12 sm:h-14 gradient-primary text-primary-foreground font-bold">
                    <WhatsAppIcon className="mr-2 h-5 w-5" />
                    Contact Visa Team
                  </Button>
                </a>
              </CardContent>
            </Card>
          </section>
        )}

        {/* Why Choose Travelian */}
        <section className="rounded-3xl gradient-primary p-8 sm:p-10 lg:p-12 text-primary-foreground relative overflow-hidden">
          <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
            <div className="absolute right-0 top-0 h-64 w-64 rounded-full bg-white/5 blur-3xl" />
            <div className="absolute left-0 bottom-0 h-64 w-64 rounded-full bg-white/5 blur-3xl" />
          </div>
          
          <div className="relative">
            <div className="text-center mb-8 sm:mb-10 lg:mb-12">
              <h2 className="font-display text-2xl sm:text-3xl lg:text-4xl font-bold">Why Choose Travelian for Visas?</h2>
              <p className="mt-3 sm:mt-4 text-sm sm:text-base text-primary-foreground/80 max-w-2xl mx-auto">
                Professional visa processing with transparent fees and dedicated support
              </p>
            </div>
            
            <div className="grid gap-4 sm:gap-6 md:grid-cols-2 lg:grid-cols-4">
              {trustBadges.map((badge) => (
                <div key={badge.title} className="rounded-2xl border border-primary-foreground/10 bg-primary-foreground/5 p-5 sm:p-6 backdrop-blur-sm hover:bg-primary-foreground/10 transition-colors">
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-gold/20 text-gold">
                    <badge.icon className="h-6 w-6" />
                  </div>
                  <h3 className="text-base sm:text-lg font-bold mb-2">{badge.title}</h3>
                  <p className="text-xs sm:text-sm text-primary-foreground/70">{badge.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Common Requirements */}
        <section>
          <div className="text-center mb-8 sm:mb-10">
            <h2 className="font-display text-2xl sm:text-3xl lg:text-4xl font-bold">General Visa Requirements</h2>
            <p className="mt-3 sm:mt-4 text-sm sm:text-base text-muted-foreground max-w-2xl mx-auto">
              Common documents needed for most visa applications (specific requirements vary by country)
            </p>
          </div>
          
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {commonRequirements.map((requirement, index) => (
              <div key={index} className="flex items-start gap-3 rounded-xl border bg-card p-4 sm:p-5 shadow-card">
                <CheckCircle2 className="h-5 w-5 shrink-0 text-success mt-0.5" />
                <p className="text-sm sm:text-base text-foreground leading-relaxed">{requirement}</p>
              </div>
            ))}
          </div>
          
          <Card className="mt-6 sm:mt-8 border-0 bg-muted/40">
            <CardContent className="p-5 sm:p-6 flex items-start gap-3 sm:gap-4">
              <Clock className="h-5 w-5 sm:h-6 sm:w-6 shrink-0 text-primary mt-1" />
              <div>
                <p className="text-sm sm:text-base font-semibold mb-1">Processing times vary by country and visa type</p>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  We confirm exact requirements, fees, validity, stay duration, and processing timeline before collecting payment. Document specifications are shared after consultation.
                </p>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* FAQ */}
        <section>
          <div className="text-center mb-8 sm:mb-10 lg:mb-12">
            <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2 mb-4">
              <HelpCircle className="h-4 w-4 text-primary" />
              <span className="text-xs sm:text-sm font-semibold text-primary uppercase tracking-wider">FAQ</span>
            </div>
            <h2 className="font-display text-2xl sm:text-3xl lg:text-4xl font-bold">Frequently Asked Questions</h2>
            <p className="mt-3 sm:mt-4 text-sm sm:text-base text-muted-foreground max-w-2xl mx-auto">
              Get answers to common questions about visa processing, documents, fees, and our services
            </p>
          </div>
          
          <div className="mx-auto max-w-4xl grid gap-4 sm:gap-5 md:grid-cols-2">
            {faqs.map((faq, index) => (
              <Card 
                key={faq.id} 
                className={`border-0 shadow-card overflow-hidden transition-all duration-300 hover:shadow-hover ${
                  openFaq === faq.id ? 'ring-2 ring-primary/20' : ''
                }`}
              >
                <button
                  onClick={() => setOpenFaq(openFaq === faq.id ? null : faq.id)}
                  className="w-full text-left p-5 sm:p-6 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-start gap-3 sm:gap-4">
                    <div className={`flex h-10 w-10 sm:h-12 sm:w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 ${faq.color}`}>
                      <faq.icon className="h-5 w-5 sm:h-6 sm:w-6" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-3">
                        <h3 className="text-sm sm:text-base font-bold text-foreground leading-snug pr-2">{faq.question}</h3>
                        <div className={`shrink-0 transition-transform duration-300 ${openFaq === faq.id ? 'rotate-180' : ''}`}>
                          <svg className="h-5 w-5 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </div>
                      </div>
                      {openFaq === faq.id && (
                        <div className="mt-3 sm:mt-4 animate-in fade-in slide-in-from-top-2 duration-300">
                          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">{faq.answer}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </button>
              </Card>
            ))}
          </div>
          
          <div className="mt-8 sm:mt-10 text-center">
            <Card className="inline-block border-0 bg-gradient-to-br from-primary/5 to-muted/40 shadow-card">
              <CardContent className="p-5 sm:p-6 flex flex-col sm:flex-row items-center gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/10">
                  <MessageCircle className="h-6 w-6 text-primary" />
                </div>
                <div className="text-center sm:text-left flex-1">
                  <p className="text-sm sm:text-base font-semibold mb-1">Still have questions?</p>
                  <p className="text-xs sm:text-sm text-muted-foreground">Our visa team is here to help you every step of the way</p>
                </div>
                <a href={whatsappUrl("Hello Travelian, I have questions about visa services.")} target="_blank" rel="noreferrer">
                  <Button className="h-10 sm:h-11 gradient-primary text-primary-foreground font-semibold">
                    <WhatsAppIcon className="mr-2 h-4 w-4" />
                    Ask Us
                  </Button>
                </a>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* CTA Section */}
        <section className="rounded-3xl border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-muted/40 p-8 sm:p-10 lg:p-12 text-center">
          <h2 className="font-display text-2xl sm:text-3xl lg:text-4xl font-bold mb-4">Ready to Apply for Your Visa?</h2>
          <p className="text-sm sm:text-base text-muted-foreground max-w-2xl mx-auto mb-8">
            Contact our visa experts for personalized guidance on requirements, processing timeline, and fees for your destination.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <a href={whatsappUrl("Hello Travelian, I need help with visa application.")} target="_blank" rel="noreferrer">
              <Button size="lg" className="h-12 sm:h-14 w-full sm:w-auto px-6 sm:px-8 gradient-primary text-primary-foreground font-bold text-base">
                <WhatsAppIcon className="mr-2 h-5 w-5" />
                Chat on WhatsApp
              </Button>
            </a>
            <Button asChild size="lg" variant="outline" className="h-12 sm:h-14 w-full sm:w-auto px-6 sm:px-8 font-semibold text-base">
              <Link to="/contact">Call Our Office</Link>
            </Button>
          </div>
        </section>
      </div>
    </div>
  );
}

