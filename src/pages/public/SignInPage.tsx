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
    <div className="relative flex h-full min-h-0 items-center justify-center overflow-y-auto gradient-hero px-4 py-4">
      <div className="absolute inset-0 opacity-10 pointer-events-none" aria-hidden="true">
        <div className="absolute left-10 top-10 h-72 w-72 rounded-full bg-primary/40 blur-3xl" />
        <div className="absolute bottom-0 right-12 h-80 w-80 rounded-full bg-gold/25 blur-3xl" />
      </div>
      <Card className="relative w-full max-w-4xl overflow-hidden border border-primary-foreground/10 shadow-hover">
        <CardContent className="grid p-0 md:grid-cols-[0.9fr_1.1fr]">
          <div className="hidden min-h-[420px] flex-col justify-between bg-primary p-6 text-primary-foreground md:flex">
            <div>
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/15">
                <Plane className="h-5 w-5" />
              </div>
              <h2 className="mt-5 text-3xl font-extrabold font-display">Welcome back to Travelian</h2>
              <p className="mt-3 text-sm leading-relaxed text-primary-foreground/75">
                Sign in to manage bookings, e-tickets and requests — customers and travel partners use the same login.
              </p>
            </div>
            <ul className="grid gap-2.5 text-sm text-primary-foreground/85">
              {["Secure account access", "All trips and e-tickets in one place", "WhatsApp & office support"].map(item => (
                <li key={item} className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-gold" /> {item}
                </li>
              ))}
            </ul>
          </div>
          <div className="p-6 sm:p-8">
          <Link to="/" className="flex items-center justify-center gap-2 mb-4">
            <img src="/travelian-logo-wordmark.png" alt="Travelian" className="h-14 w-52 object-contain" />
          </Link>
          <h1 className="text-2xl font-bold text-center text-foreground">Sign in to your account</h1>
          <p className="text-sm text-muted-foreground text-center mt-1">Access your trips, bookings, and agency workspace</p>

          <form onSubmit={signIn} className="mt-6 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />
                <Input id="email" name="email" type="email" autoComplete="email" placeholder="you@example.com" className="h-11 pl-9" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
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
            <Button type="submit" disabled={loading} className="w-full h-11 gradient-primary text-primary-foreground font-semibold">
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Sign In
            </Button>
          </form>

          <p className="text-center text-sm text-muted-foreground mt-5">
            New to Travelian? <Link to="/register" className="text-primary font-semibold hover:underline">Create an account</Link>
          </p>
          </div>
        </CardContent>
      </Card>

    </div>
  );
}
