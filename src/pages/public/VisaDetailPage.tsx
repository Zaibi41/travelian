import { Check, Clock, FileCheck, Calendar, Plane, Shield, Info, DollarSign, FileText, AlertCircle } from "lucide-react";
import { Link, useParams } from "react-router-dom";
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
  
  if (!item) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
        <div className="mx-auto max-w-4xl px-4 py-16 sm:py-20 lg:py-24">
          <Card className="border-0 shadow-card">
            <CardContent className="p-8 sm:p-12 text-center">
              <div className="mx-auto w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-muted/50 flex items-center justify-center mb-6">
                <FileCheck className="h-8 w-8 sm:h-10 sm:w-10 text-muted-foreground" />
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold mb-4">Visa Service Not Available</h1>
              <p className="text-sm sm:text-base text-muted-foreground max-w-2xl mx-auto mb-8">
                This visa service is not currently published or does not exist in our database. Please browse our available visa services or contact our team for assistance.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center">
                <Button asChild size="lg" className="gradient-primary text-primary-foreground">
                  <Link to="/visa-services">Browse Visa Services</Link>
                </Button>
                <a href={whatsappUrl("Hello Travelian, I need help with visa services.")} target="_blank" rel="noreferrer">
                  <Button size="lg" variant="outline">
                    <WhatsAppIcon className="mr-2 h-4 w-4" />
                    Contact Visa Team
                  </Button>
                </a>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const heroDescription = item.description && item.description !== item.terms && !/^terms\b/i.test(item.description.trim()) 
    ? item.description 
    : `Complete ${item.city || item.name} visa assistance with document review, application filing, and embassy coordination.`;
  
  const message = `Hello Travelian,\n\nI want to inquire about:\n${item.name}\n\nProcessing Time: ${item.processingTime || item.duration}\nValidity: ${item.validity || "Please confirm"}\nStay Duration: ${item.stayDuration || "Please confirm"}\nPrice: PKR ${item.basePrice.toLocaleString()}\n\nService URL: ${siteBase}/visa/${item.packageId}`;

  return (
    <div className="bg-gradient-to-b from-background to-muted/20">
      {/* Hero Section */}
      <section className="gradient-hero text-primary-foreground relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
          <div className="absolute left-10 top-10 h-96 w-96 rounded-full bg-primary/20 blur-3xl" />
          <div className="absolute bottom-0 right-0 h-96 w-96 rounded-full bg-gold/15 blur-3xl" />
        </div>
        
        <div className="relative mx-auto max-w-7xl px-4 py-10 sm:py-12 lg:py-16 sm:px-6 lg:px-8">
          <div className="grid gap-6 sm:gap-8 lg:grid-cols-[1fr_400px] lg:gap-12">
            <div>
              <div className="flex items-center gap-3 mb-4 sm:mb-5">
                <Badge className="bg-gold/20 text-gold border-gold/30 capitalize text-xs sm:text-sm">
                  <Plane className="mr-1.5 h-3 w-3 sm:h-3.5 sm:w-3.5" />
                  {item.packageType} visa
                </Badge>
                <Badge className="bg-white/10 text-primary-foreground border-white/20 text-xs sm:text-sm">
                  {item.validity || "Validity on request"}
                </Badge>
              </div>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl xl:text-5xl font-black font-display leading-tight mb-4 sm:mb-5">
                {item.name}
              </h1>
              <p className="text-sm sm:text-base lg:text-lg text-primary-foreground/80 leading-relaxed max-w-3xl">
                {heroDescription}
              </p>
              
              {/* Quick Info Pills */}
              <div className="flex flex-wrap gap-3 sm:gap-4 mt-6 sm:mt-8">
                <div className="flex items-center gap-2 rounded-full bg-white/10 backdrop-blur-sm px-3 sm:px-4 py-2 border border-white/20">
                  <Clock className="h-4 w-4 text-gold" />
                  <span className="text-xs sm:text-sm font-medium">{item.processingTime || item.duration}</span>
                </div>
                {item.stayDuration && (
                  <div className="flex items-center gap-2 rounded-full bg-white/10 backdrop-blur-sm px-3 sm:px-4 py-2 border border-white/20">
                    <Calendar className="h-4 w-4 text-gold" />
                    <span className="text-xs sm:text-sm font-medium">{item.stayDuration} stay</span>
                  </div>
                )}
              </div>
            </div>

            {/* Pricing Card */}
            <Card className="border-0 shadow-hover h-fit">
              <CardContent className="p-5 sm:p-6 lg:p-7">
                <div className="space-y-4 sm:space-y-5">
                  {/* Pricing Breakdown */}
                  <div>
                    <p className="text-xs sm:text-sm text-muted-foreground mb-3">Price Breakdown</p>
                    {item.embassyFee !== undefined && item.embassyFee > 0 && (
                      <div className="flex justify-between text-sm mb-2">
                        <span className="text-muted-foreground">Embassy Fee</span>
                        <span className="font-semibold">PKR {item.embassyFee.toLocaleString()}</span>
                      </div>
                    )}
                    {item.serviceFee !== undefined && item.serviceFee > 0 && (
                      <div className="flex justify-between text-sm mb-2">
                        <span className="text-muted-foreground">Service Fee</span>
                        <span className="font-semibold">PKR {item.serviceFee.toLocaleString()}</span>
                      </div>
                    )}
                    <div className="h-px bg-border my-3"></div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-xs sm:text-sm text-muted-foreground">Total Price</span>
                      <span className="text-3xl sm:text-4xl font-black text-primary ml-auto">
                        PKR {item.basePrice.toLocaleString()}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-2 sm:space-y-3">
                    <a href={whatsappUrl(message)} target="_blank" rel="noreferrer" className="block">
                      <Button size="lg" className="w-full h-11 sm:h-12 gradient-primary text-primary-foreground font-bold text-sm sm:text-base">
                        <WhatsAppIcon className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
                        WhatsApp Inquiry
                      </Button>
                    </a>
                    <Button asChild size="lg" variant="outline" className="w-full h-11 sm:h-12 text-sm sm:text-base">
                      <Link to="/contact">Call Our Office</Link>
                    </Button>
                  </div>

                  <div className="rounded-lg bg-muted/50 p-3 sm:p-4 border border-border/50">
                    <div className="flex items-start gap-2 sm:gap-3">
                      <Shield className="h-4 w-4 sm:h-5 sm:w-5 text-primary shrink-0 mt-0.5" />
                      <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                        <span className="font-semibold text-foreground">Secure Processing:</span> We confirm all requirements and fees before payment. No hidden charges.
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <div className="mx-auto max-w-7xl px-4 py-8 sm:py-10 lg:py-12 sm:px-6 lg:px-8">
        <div className="grid gap-6 lg:grid-cols-[1fr_380px] lg:gap-8">
          {/* Left Column */}
          <div className="space-y-6">
            {/* Visa Image */}
            {item.image && (
              <div className="overflow-hidden rounded-2xl shadow-card">
                <img 
                  src={item.image} 
                  alt={item.name} 
                  className="w-full h-auto max-h-[420px] object-cover" 
                />
              </div>
            )}

            {/* Processing Details */}
            <Card className="border-0 shadow-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                  <Info className="h-5 w-5 text-primary" />
                  Processing Information
                </CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4 sm:grid-cols-2">
                <div className="flex items-start gap-3 rounded-lg border bg-muted/30 p-4">
                  <Clock className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Processing Time</p>
                    <p className="text-sm sm:text-base font-bold">{item.processingTime || item.duration}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 rounded-lg border bg-muted/30 p-4">
                  <Calendar className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Validity Period</p>
                    <p className="text-sm sm:text-base font-bold">{item.validity || "Confirm with team"}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 rounded-lg border bg-muted/30 p-4">
                  <Plane className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Stay Duration</p>
                    <p className="text-sm sm:text-base font-bold">{item.stayDuration || "As per visa type"}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 rounded-lg border bg-muted/30 p-4">
                  <DollarSign className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Visa Type</p>
                    <p className="text-sm sm:text-base font-bold capitalize">{item.packageType}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Required Documents */}
            <Card className="border-0 shadow-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                  <FileText className="h-5 w-5 text-primary" />
                  Required Documents
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-2 sm:gap-3">
                  {(item.requiredDocuments || item.includes || []).map((document, index) => (
                    <div key={index} className="flex items-start gap-3 rounded-lg border bg-card p-3 sm:p-4 hover:bg-muted/50 transition-colors">
                      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-success/10">
                        <Check className="h-4 w-4 text-success" />
                      </div>
                      <p className="text-sm sm:text-base text-foreground leading-relaxed flex-1">{document}</p>
                    </div>
                  ))}
                </div>
                {(!item.requiredDocuments || item.requiredDocuments.length === 0) && (
                  <p className="text-sm text-muted-foreground">Document requirements will be confirmed by our visa team during consultation.</p>
                )}
              </CardContent>
            </Card>

            {/* Terms & Conditions */}
            {item.terms && (
              <Card className="border-0 shadow-card">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                    <AlertCircle className="h-5 w-5 text-primary" />
                    Terms & Conditions
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="prose prose-sm sm:prose max-w-none">
                    <p className="whitespace-pre-line text-sm sm:text-base leading-relaxed text-muted-foreground">
                      {item.terms}
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right Sidebar */}
          <aside className="space-y-6">
            {/* Quick Actions */}
            <Card className="border-0 shadow-card bg-gradient-to-br from-primary/5 to-muted/40">
              <CardHeader>
                <CardTitle className="text-base sm:text-lg">Need Assistance?</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-xs sm:text-sm text-muted-foreground">
                  Our visa consultants are ready to guide you through the application process, review your documents, and answer any questions.
                </p>
                <a href={whatsappUrl(message)} target="_blank" rel="noreferrer" className="block">
                  <Button size="sm" className="w-full bg-whatsapp text-whatsapp-foreground hover:bg-whatsapp-hover">
                    <WhatsAppIcon className="mr-2 h-4 w-4" />
                    Chat on WhatsApp
                  </Button>
                </a>
                <Button asChild size="sm" variant="outline" className="w-full">
                  <Link to="/contact">Call Office</Link>
                </Button>
              </CardContent>
            </Card>

            {/* How It Works */}
            <Card className="border-0 shadow-card">
              <CardHeader>
                <CardTitle className="text-base sm:text-lg">Application Process</CardTitle>
              </CardHeader>
              <CardContent>
                <ol className="space-y-4">
                  <li className="flex gap-3">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                      1
                    </div>
                    <div>
                      <p className="text-sm font-semibold mb-1">Consultation</p>
                      <p className="text-xs text-muted-foreground">Contact us to confirm requirements and fees</p>
                    </div>
                  </li>
                  <li className="flex gap-3">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                      2
                    </div>
                    <div>
                      <p className="text-sm font-semibold mb-1">Document Review</p>
                      <p className="text-xs text-muted-foreground">Upload documents for expert review</p>
                    </div>
                  </li>
                  <li className="flex gap-3">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                      3
                    </div>
                    <div>
                      <p className="text-sm font-semibold mb-1">Application Filing</p>
                      <p className="text-xs text-muted-foreground">We submit your application to the embassy</p>
                    </div>
                  </li>
                  <li className="flex gap-3">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                      4
                    </div>
                    <div>
                      <p className="text-sm font-semibold mb-1">Visa Delivery</p>
                      <p className="text-xs text-muted-foreground">Receive your visa-stamped passport</p>
                    </div>
                  </li>
                </ol>
              </CardContent>
            </Card>

            {/* Important Note */}
            <Card className="border-0 shadow-card border-l-4 border-l-gold">
              <CardContent className="p-4 sm:p-5">
                <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                  <span className="font-semibold text-foreground">Important:</span> Visa approval is subject to embassy decision. Processing times may vary. We provide assistance but do not guarantee approval. Embassy fees are non-refundable.
                </p>
              </CardContent>
            </Card>

            {/* Browse More */}
            <Card className="border-0 shadow-card">
              <CardContent className="p-4 sm:p-5 text-center">
                <p className="text-xs sm:text-sm text-muted-foreground mb-3">Explore other visa services</p>
                <Button asChild variant="outline" size="sm" className="w-full">
                  <Link to="/visa-services">Browse All Visas</Link>
                </Button>
              </CardContent>
            </Card>
          </aside>
        </div>
      </div>
    </div>
  );
}

