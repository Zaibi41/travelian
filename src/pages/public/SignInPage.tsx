import { useEffect, useRef, useState } from "react";
import { Link, Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Mail } from "lucide-react";
import { toast } from "sonner";
import { signInWithPassword } from "@/lib/cognito-auth";
import { isAdminPortalRole, roleForSession } from "@/lib/role-mapping";
import { useRole } from "@/contexts/RoleContext";
import { PasswordInput } from "@/components/PasswordInput";
import { AuthAside } from "@/components/public/AuthAside";
import { EXPIRED_MESSAGE, EXPIRED_REASON, safeReturnPath, signInDecision, type SignInDecision } from "@/lib/auth-guard";
import { clearSession, getSession } from "@/lib/auth-session";
import { renewSession } from "@/lib/session-renewal";
import { SEO } from "@/components/SEO";


export default function SignInPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { setCurrentRole } = useRole();
  const [loading, setLoading] = useState(false);
  const submitting = useRef(false);
  const [errors, setErrors] = useState({ email: "", password: "" });
  const [serverError, setServerError] = useState("");
  // Decided before the first render, so the form never flashes for someone already signed in.
  const [gate, setGate] = useState<SignInDecision>(() => signInDecision(getSession(), searchParams.get("redirect")));

  useEffect(() => {
    if (gate.kind === "form") {
      const stale = getSession();
      if (stale) clearSession();                    // expired, no refresh token: nothing to keep
      return undefined;
    }
    if (gate.kind !== "refresh") return undefined;
    let live = true;
    void renewSession().then(ok => {
      if (!live) return;
      if (!ok) clearSession();
      setGate(ok ? signInDecision(getSession(), searchParams.get("redirect")) : { kind: "form" });
    });
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- decided once per visit
  }, [gate.kind]);

  const signIn = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submitting.current) return;
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const email = String(form.get("email") || "");
    const password = String(form.get("password") || "");
    const emailInput = formElement.elements.namedItem("email") as HTMLInputElement;
    const nextErrors = {
      email: !email ? "Enter your email address." : emailInput.validity.typeMismatch ? "Enter a valid email address." : "",
      password: !password ? "Enter your password." : "",
    };
    setErrors(nextErrors);
    setServerError("");
    if (nextErrors.email || nextErrors.password) {
      (formElement.elements.namedItem(nextErrors.email ? "email" : "password") as HTMLInputElement).focus();
      return;
    }
    try {
      submitting.current = true;
      setLoading(true);
      const session = await signInWithPassword(email, password);
      const role = roleForSession(session);
      if (role) setCurrentRole(role);
      toast.success("Welcome back");
      // Only a relative path inside /admin is followed (no other site, //host or javascript:).
      const fallback = isAdminPortalRole(role) ? "/admin" : "/admin/customer";
      navigate(safeReturnPath(searchParams.get("redirect")) ?? fallback, { replace: true });
    } catch (error) {
      setLoading(false);
      const message = error instanceof Error ? error.message : "Sign in failed. Please try again.";
      setServerError(message);
      toast.error(message);
    } finally {
      submitting.current = false;
    }
  };

  if (gate.kind === "go") return <Navigate to={gate.to} replace />;
  if (gate.kind === "refresh") return <p role="status" className="sr-only">Checking your session…</p>;

  return (
    <div data-public-page-scroll className="h-full min-h-0 overflow-y-auto travelian-hero-background">
      <SEO title="Sign In | Travelian" description="Sign in to your Travelian account to manage flights, group tickets and hotel bookings." noIndex />
      <div className="flex min-h-full items-center justify-center px-4 py-6 sm:px-6 sm:py-8">
        <Card className="my-auto w-full max-w-[880px] shrink-0 overflow-hidden rounded-xl border border-border/60 bg-white shadow-md">
          <CardContent className="grid p-0 lg:grid-cols-[44fr_56fr]">
            <AuthAside variant="minimal" eyebrowSize="text-xs" eyebrow="Member access" title="Welcome back" description="Manage your trips, bookings and account from one place." />
            <div className="px-6 py-8 sm:px-10 sm:py-10">
              <h1 className="font-display text-2xl font-semibold tracking-tight text-foreground">Sign in to Travelian</h1>
              <p className="mt-2 text-sm text-muted-foreground">Access your bookings and account.</p>
              {searchParams.get("reason") === EXPIRED_REASON && (
                <p role="status" className="mt-4 rounded-lg border border-primary/25 bg-primary/5 px-3 py-2 text-sm text-foreground">{EXPIRED_MESSAGE}</p>
              )}

              <form onSubmit={signIn} noValidate aria-busy={loading} className="mt-7">
                <div>
                  <Label htmlFor="email" className="text-sm font-medium">Email</Label>
                  <div className="relative mt-2">
                    <Mail aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input id="email" name="email" type="email" autoComplete="email" placeholder="you@example.com" required aria-invalid={!!errors.email} aria-describedby="email-error" onChange={() => { if (errors.email) setErrors(current => ({ ...current, email: "" })); }} className="h-12 rounded-lg bg-white pl-10" />
                  </div>
                  <p id="email-error" aria-live="polite" className="min-h-6 pt-1 text-xs leading-5 text-destructive">{errors.email}</p>
                </div>
                <div className="mt-2">
                  <Label htmlFor="password" className="text-sm font-medium">Password</Label>
                  <div className="mt-2 [&_button]:right-1 [&_button]:top-0.5 [&_button]:h-11 [&_button]:w-11 [&_button]:rounded-md [&_button]:focus-visible:outline-none [&_button]:focus-visible:ring-2 [&_button]:focus-visible:ring-ring">
                    <PasswordInput id="password" name="password" autoComplete="current-password" placeholder="Password" required aria-invalid={!!errors.password} aria-describedby="password-error" onChange={() => { if (errors.password) setErrors(current => ({ ...current, password: "" })); }} className="h-12 rounded-lg bg-white pr-12" />
                  </div>
                  <p id="password-error" aria-live="polite" className="min-h-6 pt-1 text-xs leading-5 text-destructive">{errors.password}</p>
                </div>
                <div className="flex justify-end">
                  <button type="button" className="min-h-8 rounded text-xs font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" onClick={() => toast.info("Password reset is available through Travelian support while account recovery is being finalized.")}>
                    Forgot password?
                  </button>
                </div>
                <p role="alert" className="min-h-6 py-1 text-sm leading-5 text-destructive">{serverError}</p>
                <Button type="submit" disabled={loading} className="h-12 w-full rounded-lg bg-primary text-sm font-semibold text-primary-foreground hover:bg-primary/90">
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />}
                  {loading ? "Signing in…" : "Sign In"}
                </Button>
              </form>
              <p className="mt-6 text-center text-sm text-muted-foreground">
                New to Travelian? <Link to="/register" className="rounded font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">Create an account</Link>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
