import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plane, UserPlus, Loader2, Mail, User, KeyRound, Phone, Briefcase, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { confirmSignUp, signUpWithPassword } from "@/lib/cognito-auth";
import { PasswordInput } from "@/components/PasswordInput";
import { AuthAside } from "@/components/public/AuthAside";

import { rememberAccountRole } from "@/lib/role-mapping";
import type { UserRole } from "@/data/models";

function roleForAccountType(accountType: string): UserRole {
  return accountType === "partner" ? "agency_owner" : "customer";
}

export default function RegisterPage() {
  const [loading, setLoading] = useState(false);
  const [pendingEmail, setPendingEmail] = useState("");

  const register = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const fullName = String(form.get("fullName") || "");
    const email = String(form.get("email") || "");
    const mobile = String(form.get("mobile") || "");
    const password = String(form.get("password") || "");
    const confirmPassword = String(form.get("confirmPassword") || "");
    const accountType = String(form.get("accountType") || "customer");
    const termsAccepted = form.get("terms") === "on";
    const code = String(form.get("code") || "");
    try {
      setLoading(true);
      if (pendingEmail) {
        await confirmSignUp(pendingEmail, code);
        toast.success("Account verified. You can sign in now.");
        setPendingEmail("");
        return;
      }
      if (!fullName || !email || !password) {
        toast.error("Name, email, and password are required");
        return;
      }
      if (!mobile.trim()) {
        toast.error("Mobile number is required");
        return;
      }
      if (password !== confirmPassword) {
        toast.error("Passwords do not match");
        return;
      }
      if (!termsAccepted) {
        toast.error("Please accept the Terms and Privacy Policy");
        return;
      }
      const result = await signUpWithPassword(email, password, fullName);
      rememberAccountRole(email, roleForAccountType(accountType));
      if (result.UserConfirmed) {
        toast.success(accountType === "partner" ? "Partner account created. Travelian will review agency access." : "Account created. You can sign in now.");
      } else {
        setPendingEmail(email);
        toast.success(accountType === "partner" ? "Verification code sent. Partner access will be reviewed after verification." : "Verification code sent to your email.");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Signup failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-full items-start justify-center overflow-y-auto gradient-hero px-4 py-6">
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        <div className="absolute left-10 top-10 h-72 w-72 rounded-full bg-primary/25 blur-3xl" />
        <div className="absolute bottom-0 right-12 h-80 w-80 rounded-full bg-gold/20 blur-3xl" />
      </div>
      <Card className="relative w-full max-w-5xl overflow-hidden rounded-2xl border border-border/60 shadow-hover">
        <CardContent className="grid p-0 md:grid-cols-[0.9fr_1.1fr]">
          <AuthAside
            eyebrow="Create account"
            title="Join Travelian"
            description="Create a customer account for faster bookings, or choose Travel Partner to start the agency onboarding review."
            points={["Verified travel support", "Secure account access", "Partner onboarding ready"]}
          />
          <div className="p-6 sm:p-8">
          <Link to="/" className="flex items-center justify-center">
            <img src="/travelian-logo-wordmark.png" alt="Travelian" className="h-12 w-44 object-contain" />
          </Link>
          <h1 className="mt-3 text-center font-display text-2xl font-bold text-foreground">Create your account</h1>
          <p className="mt-1.5 text-center text-sm text-muted-foreground">Create a Travelian account for faster bookings</p>

          <form onSubmit={register} className="mt-6 grid grid-cols-1 gap-3.5 sm:grid-cols-2">

            {pendingEmail ? (
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="code">Verification code</Label>
                <div className="relative">
                  <KeyRound className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />
                  <Input id="code" name="code" inputMode="numeric" placeholder="Enter email code" className="h-11 pl-9" />
                </div>
                <p className="text-xs text-muted-foreground">We sent a code to {pendingEmail}.</p>
              </div>
            ) : (
              <>
                <div className="space-y-1.5">
                  <Label htmlFor="fullName">Full name</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />
                  <Input id="fullName" name="fullName" autoComplete="name" placeholder="Your name" className="h-11 pl-9" />
                </div>
              </div>
                <div className="space-y-1.5">
                  <Label htmlFor="email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />
                  <Input id="email" name="email" type="email" autoComplete="email" placeholder="you@example.com" className="h-11 pl-9" />
                </div>
              </div>
                <div className="space-y-1.5">
                  <Label htmlFor="mobile">Mobile number</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />
                    <Input id="mobile" name="mobile" type="tel" autoComplete="tel" placeholder="+92 300 0000000" className="h-11 pl-9" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="accountType">Account type</Label>
                  <div className="relative">
                    <Briefcase className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />
                    <select id="accountType" name="accountType" defaultValue="customer" className="h-11 w-full rounded-md border border-input bg-background pl-9 pr-3 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
                      <option value="customer">Customer</option>
                      <option value="partner">Travel Partner</option>
                    </select>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="password">Password</Label>
                  <PasswordInput id="password" name="password" autoComplete="new-password" placeholder="At least 8 characters" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="confirmPassword">Confirm password</Label>
                  <PasswordInput id="confirmPassword" name="confirmPassword" autoComplete="new-password" placeholder="Repeat password" />
                </div>
                <label className="sm:col-span-2 flex items-start gap-3 rounded-lg border border-border/70 bg-muted/30 p-3 text-xs text-muted-foreground">
                  <input name="terms" type="checkbox" className="mt-0.5 h-4 w-4 shrink-0 rounded border-border accent-primary" />
                  <span className="leading-5">I agree to the <Link to="/terms" className="text-primary hover:underline">Terms</Link> and <Link to="/privacy" className="text-primary hover:underline">Privacy Policy</Link>.</span>
                </label>
              </>
            )}
            <Button type="submit" disabled={loading} className="w-full h-11 gradient-primary text-primary-foreground font-semibold sm:col-span-2">
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UserPlus className="mr-2 h-4 w-4" />}
              {pendingEmail ? "Verify Account" : "Create Account"}
            </Button>
          </form>

          <p className="mt-2 text-xs text-muted-foreground text-center">
            Travel partners are reviewed by the Travelian team before agency access is enabled.
          </p>

          <p className="text-center text-sm text-muted-foreground mt-2">
            Already a member? <Link to="/signin" className="text-primary font-semibold hover:underline">Sign in</Link>
          </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
