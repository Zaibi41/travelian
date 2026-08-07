import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plane, Loader2, Mail, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { signInWithPassword } from "@/lib/cognito-auth";
import { isAdminPortalRole, roleForSession } from "@/lib/role-mapping";
import { useRole } from "@/contexts/RoleContext";
import { PasswordInput } from "@/components/PasswordInput";
import { AuthAside } from "@/components/public/AuthAside";


export default function SignInPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { setCurrentRole } = useRole();
  const [loading, setLoading] = useState(false);

  const signIn = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") || "");
    const password = String(form.get("password") || "");
    if (!email || !password) {
      toast.error("Email and password are required");
      return;
    }
    try {
      setLoading(true);
      const session = await signInWithPassword(email, password);
      const role = roleForSession(session);
      if (role) setCurrentRole(role);
      toast.success("Welcome back");
      const redirect = searchParams.get("redirect");
      const fallback = isAdminPortalRole(role) ? "/admin" : "/admin/customer";
      navigate(redirect && redirect.startsWith("/") ? redirect : fallback);
    } catch (error) {
      setLoading(false);
      toast.error(error instanceof Error ? error.message : "Sign in failed. Please try again.");
    }
  };

  return (
    <div className="relative flex h-full min-h-0 items-center justify-center overflow-y-auto gradient-hero px-4 py-6">
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        <div className="absolute left-10 top-10 h-72 w-72 rounded-full bg-primary/25 blur-3xl" />
        <div className="absolute bottom-0 right-12 h-80 w-80 rounded-full bg-gold/20 blur-3xl" />
      </div>
      <Card className="relative w-full max-w-4xl overflow-hidden rounded-2xl border border-border/60 shadow-hover">
        <CardContent className="grid p-0 md:grid-cols-[0.95fr_1.05fr]">
          <AuthAside
            eyebrow="Member access"
            title="Welcome back to Travelian"
            description="Sign in to manage bookings, e-tickets and requests — customers and travel partners use the same login."
            points={[
              "Secure account access",
              "All trips and e-tickets in one place",
              "WhatsApp & office support",
            ]}
          />
          <div className="p-6 sm:p-9">
            <Link to="/" className="flex items-center justify-center">
              <img src="/travelian-logo-wordmark.png" alt="Travelian" className="h-14 w-52 object-contain" />
            </Link>
            <h1 className="mt-3 text-center font-display text-2xl font-bold text-foreground">Sign in to your account</h1>
            <p className="mt-1.5 text-center text-sm text-muted-foreground">
              Access your trips, bookings, and agency workspace
            </p>

            <form onSubmit={signIn} className="mt-7 space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />
                  <Input id="email" name="email" type="email" autoComplete="email" placeholder="you@example.com" className="h-12 rounded-xl bg-muted/30 pl-9" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="password" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Password</Label>
                <PasswordInput id="password" name="password" autoComplete="current-password" placeholder="Password" />
              </div>
              <div className="flex justify-end">
                <button
                  type="button"
                  className="text-xs font-semibold text-primary hover:underline"
                  onClick={() => toast.info("Password reset is available through Travelian support while account recovery is being finalized.")}
                >
                  Forgot password?
                </button>
              </div>
              <Button type="submit" disabled={loading} className="h-12 w-full rounded-xl gradient-primary text-base font-semibold text-primary-foreground shadow-elegant transition-transform hover:-translate-y-0.5">
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Sign In
              </Button>
            </form>

            <div className="mt-6 flex items-center gap-3 rounded-xl border border-border/60 bg-muted/30 px-3 py-2.5">
              <ShieldCheck className="h-4 w-4 shrink-0 text-gold" />
              <p className="text-xs leading-snug text-muted-foreground">
                Your details are protected with encrypted, secure sign-in.
              </p>
            </div>

            <p className="mt-5 text-center text-sm text-muted-foreground">
              New to Travelian? <Link to="/register" className="font-semibold text-primary hover:underline">Create an account</Link>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

