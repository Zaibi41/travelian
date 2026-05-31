import { useEffect, useState } from "react";
import { Calendar, Gift, Heart, Lock, ShieldCheck, Building2, User } from "lucide-react";
import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EmptyState } from "@/components/EmptyState";
import { getSession } from "@/lib/auth-session";
import { roleForSession } from "@/lib/role-mapping";
import { SEO } from "@/components/SEO";

const managementRoles = new Set(["super_admin", "admin", "staff", "agency_owner", "agency_staff", "qa", "internal_support"]);

export default function AccountPage() {
  const [session, setSessionState] = useState(() => getSession());
  const sessionRole = roleForSession(session);
  const isAgencyRole = sessionRole === "agency_owner" || sessionRole === "agency_staff";
  const hasManagementAccess = sessionRole ? managementRoles.has(sessionRole) : false;
  const [firstName = "", ...remainingNames] = session?.name?.trim().split(/\s+/) || [];

  useEffect(() => {
    const handleSessionChange = () => setSessionState(getSession());
    window.addEventListener("travelian:session", handleSessionChange);
    window.addEventListener("storage", handleSessionChange);
    return () => {
      window.removeEventListener("travelian:session", handleSessionChange);
      window.removeEventListener("storage", handleSessionChange);
    };
  }, []);

  if (!session) {
    return (
      <div className="min-h-[calc(100vh-4rem)] bg-muted/30 flex items-center justify-center px-4 py-16">
        <SEO title="Sign in required - Travelian" description="Sign in to access your Travelian account." />
        <Card className="max-w-md w-full shadow-elevated border-0">
          <CardContent className="p-10 text-center">
            <div className="h-16 w-16 rounded-2xl bg-accent flex items-center justify-center mx-auto mb-5">
              <Lock className="h-7 w-7 text-primary" />
            </div>
            <h1 className="text-2xl font-bold text-foreground mb-2">Sign in required</h1>
            <p className="text-sm text-muted-foreground mb-6">Sign in to view your bookings and account details.</p>
            <div className="flex gap-2 justify-center">
              <Link to="/signin"><Button className="gradient-primary text-primary-foreground rounded-xl">Sign In</Button></Link>
              <Link to="/register"><Button variant="outline" className="rounded-xl">Create Account</Button></Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="bg-muted/30 min-h-screen">
      <SEO title="My Account - Travelian" description="Manage your Travelian account and bookings." />
      <div className="gradient-hero py-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 rounded-full bg-primary/20 flex items-center justify-center text-2xl font-bold text-primary-foreground">
              {session.name.split(" ").map(name => name[0]).join("").slice(0, 2).toUpperCase()}
            </div>
            <div>
              <h1 className="text-xl font-bold text-primary-foreground">{session.name}</h1>
              <p className="text-sm text-primary-foreground/60">{session.email}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {hasManagementAccess && (
          <Card className="mb-6 border-primary/20 bg-primary/5 shadow-card">
            <CardContent className="p-5 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="flex items-start gap-3">
                <div className="h-11 w-11 rounded-xl bg-primary/10 flex items-center justify-center">
                  {isAgencyRole ? <Building2 className="h-5 w-5 text-primary" /> : <ShieldCheck className="h-5 w-5 text-primary" />}
                </div>
                <div>
                  <h2 className="text-base font-bold text-foreground">{isAgencyRole ? "Agency management access" : "Management dashboard access"}</h2>
                  <p className="mt-1 text-sm text-muted-foreground">Open the enterprise portal for the tools assigned to your role.</p>
                </div>
              </div>
              <Link to="/admin">
                <Button className="gradient-primary text-primary-foreground">Open Dashboard</Button>
              </Link>
            </CardContent>
          </Card>
        )}

        <Tabs defaultValue="trips" className="space-y-6">
          <TabsList className="bg-card border shadow-sm h-auto p-1 flex-wrap">
            <TabsTrigger value="trips" className="gap-2 text-xs sm:text-sm"><Calendar className="h-4 w-4" /> My Trips</TabsTrigger>
            <TabsTrigger value="wishlist" className="gap-2 text-xs sm:text-sm"><Heart className="h-4 w-4" /> Wishlist</TabsTrigger>
            <TabsTrigger value="rewards" className="gap-2 text-xs sm:text-sm"><Gift className="h-4 w-4" /> Rewards</TabsTrigger>
            <TabsTrigger value="profile" className="gap-2 text-xs sm:text-sm"><User className="h-4 w-4" /> Profile</TabsTrigger>
          </TabsList>

          <TabsContent value="trips">
            <EmptyState icon={Calendar} title="No trips yet" description="Confirmed bookings and upcoming trips will appear here." />
          </TabsContent>

          <TabsContent value="wishlist">
            <EmptyState icon={Heart} title="Your wishlist is empty" description="Saved hotels and packages will appear here." />
          </TabsContent>

          <TabsContent value="rewards">
            <EmptyState icon={Gift} title="No rewards activity yet" description="Eligible rewards will appear here after qualifying bookings." />
          </TabsContent>

          <TabsContent value="profile">
            <Card>
              <CardContent className="p-6">
                <h2 className="text-lg font-bold text-foreground mb-6">Profile</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm">First Name</Label>
                    <Input value={firstName} readOnly className="mt-1" />
                  </div>
                  <div>
                    <Label className="text-sm">Last Name</Label>
                    <Input value={remainingNames.join(" ")} readOnly className="mt-1" />
                  </div>
                  <div>
                    <Label className="text-sm">Email</Label>
                    <Input value={session.email} readOnly className="mt-1" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
