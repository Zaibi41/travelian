import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Flame, Clock, Percent, Zap, Tag, Star, MapPin, Heart, ArrowRight, Check, Copy } from "lucide-react";
import { Link } from "react-router-dom";
import { mockCoupons, mockHotels, mockPackages } from "@/data/mock";
import { useState } from "react";
import { toast } from "sonner";
import { SEO } from "@/components/SEO";

const flashDeals = [
  { title: "Makkah Hotels Flash Sale", discount: "40% OFF", desc: "5-star hotels near Haram at unbeatable prices", bg: "gradient-deal", expiry: "2 days", category: "Hotels", to: "/hotels-search" },
  { title: "Summer Tour Early Bird", discount: "Save $300", desc: "Book Turkey & Egypt tours before May", bg: "gradient-primary", expiry: "15 days", category: "Tours", to: "/tour-packages" },
  { title: "Umrah Economy Special", discount: "From $799", desc: "7-night economy package with flights", bg: "gradient-hero", expiry: "Limited", category: "Umrah", to: "/umrah-packages" },
  { title: "First Booking Bonus", discount: "$50 OFF", desc: "Use code WELCOME50 on your first booking", bg: "gradient-deal", expiry: "Ongoing", category: "All", to: "/hotels-search" },
];

export default function DealsPage() {
  const today = new Date().toISOString().slice(0, 10);
  const activeCoupons = mockCoupons.filter(c => c.status === 'active' && c.validUntil >= today);
  const [copied, setCopied] = useState<string | null>(null);

  const onCopy = (code: string) => {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(code);
      toast.success(`Copied promo code ${code}`);
      setTimeout(() => setCopied(null), 2000);
    }).catch(() => toast.error("Could not copy code"));
  };


  return (
    <div>
      {/* Hero */}
      <section className="gradient-deal py-12 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-10 right-20 w-64 h-64 bg-primary-foreground/20 rounded-full blur-3xl" />
        </div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <Badge className="bg-primary-foreground/20 text-primary-foreground border-0 mb-4"><Flame className="h-3 w-3 mr-1" /> Limited Time Offers</Badge>
          <h1 className="text-3xl md:text-4xl font-extrabold font-display text-primary-foreground mb-3">Deals & Promotions</h1>
          <p className="text-primary-foreground/70 max-w-xl mx-auto">Exclusive discounts on hotels, flights, and packages. Don't miss out!</p>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {/* Flash Deals */}
        <div className="mb-12">
          <div className="flex items-center gap-2 mb-6">
            <Zap className="h-5 w-5 text-warning" />
            <h2 className="text-xl font-bold font-display text-foreground">Flash Deals</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {flashDeals.map((deal, i) => (
              <Link to={deal.to} key={i} className={`${deal.bg} rounded-2xl p-5 text-primary-foreground relative overflow-hidden hover:scale-[1.02] transition-transform block`}>
                <div className="absolute top-0 right-0 w-24 h-24 bg-primary-foreground/5 rounded-full -mr-8 -mt-8" />
                <Badge className="bg-primary-foreground/20 text-primary-foreground border-0 text-[10px] mb-2">{deal.category}</Badge>
                <h3 className="font-bold text-sm mb-1">{deal.title}</h3>
                <p className="text-2xl font-extrabold mb-1">{deal.discount}</p>
                <p className="text-xs text-primary-foreground/70 mb-3">{deal.desc}</p>
                <div className="flex items-center justify-between">
                  <span className="text-xs flex items-center gap-1"><Clock className="h-3 w-3" /> {deal.expiry}</span>
                  <Button size="sm" variant="secondary" className="text-xs h-7" tabIndex={-1}>Grab Deal</Button>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Coupons */}
        <div className="mb-12">
          <div className="flex items-center gap-2 mb-6">
            <Tag className="h-5 w-5 text-primary" />
            <h2 className="text-xl font-bold font-display text-foreground">Promo Codes</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {activeCoupons.map(coupon => (
              <Card key={coupon.couponId} className="overflow-hidden border-dashed border-2 hover:border-primary transition-colors">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <Badge className="bg-accent text-accent-foreground capitalize">{coupon.applicableTo}</Badge>
                    <div className="text-right">
                      <p className="text-2xl font-extrabold text-primary">
                        {coupon.discountType === 'percentage' ? `${coupon.discountValue}%` : `$${coupon.discountValue}`}
                      </p>
                      <p className="text-[10px] text-muted-foreground">OFF</p>
                    </div>
                  </div>
                  <h3 className="font-semibold text-foreground text-sm">{coupon.description}</h3>
                  <div className="mt-3 p-2.5 bg-muted rounded-lg flex items-center justify-between">
                    <code className="text-sm font-bold text-primary tracking-wider">{coupon.code}</code>
                    <Button size="sm" variant="ghost" onClick={() => onCopy(coupon.code)} className="text-xs h-7 text-primary gap-1" aria-label={`Copy promo code ${coupon.code}`}>
                      {copied === coupon.code ? (<><Check className="h-3 w-3" /> Copied</>) : (<><Copy className="h-3 w-3" /> Copy</>)}
                    </Button>
                  </div>
                  <div className="flex items-center justify-between mt-3 text-xs text-muted-foreground">
                    <span>Min. order: ${coupon.minOrder}</span>
                    <span>Valid until {coupon.validUntil}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Discounted Hotels */}
        <div>
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <Percent className="h-5 w-5 text-destructive" />
              <h2 className="text-xl font-bold font-display text-foreground">Discounted Hotels</h2>
            </div>
            <Link to="/hotels-search" className="text-sm text-primary font-medium flex items-center gap-1 hover:underline">
              See all <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {mockHotels.filter(h => h.status === 'active').slice(0, 3).map(hotel => (
              <Link to={`/hotel/${hotel.hotelId}`} key={hotel.hotelId}>
                <Card className="overflow-hidden hover:shadow-elevated transition-all group">
                  <div className="h-40 bg-gradient-to-br from-warning/10 to-accent flex items-center justify-center relative">
                    <span className="text-5xl group-hover:scale-110 transition-transform">🏨</span>
                    <Badge className="absolute top-3 left-3 bg-destructive text-destructive-foreground border-0 text-xs">30% OFF</Badge>
                    <button className="absolute top-3 right-3 h-7 w-7 rounded-full bg-foreground/20 backdrop-blur-sm flex items-center justify-center text-primary-foreground">
                      <Heart className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <CardContent className="p-4">
                    <h3 className="font-semibold text-foreground text-sm">{hotel.name}</h3>
                    <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5"><MapPin className="h-3 w-3" /> {hotel.city}</p>
                    <div className="flex items-end justify-between mt-3">
                      <div>
                        <span className="text-xs text-muted-foreground line-through">${Math.round(hotel.pricePerNight * 1.3)}</span>
                        <p className="text-lg font-bold text-destructive">${hotel.pricePerNight}<span className="text-xs font-normal text-muted-foreground">/night</span></p>
                      </div>
                      <div className="bg-primary text-primary-foreground text-xs font-bold px-1.5 py-0.5 rounded">9.{hotel.starRating}</div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
