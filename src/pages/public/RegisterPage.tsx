import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
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
  const [accountType, setAccountType] = useState("customer");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState("");
  const submitting = useRef(false);

  const clearError = (field: string) => {
    setErrors(current => ({ ...current, [field]: "" }));
  };

  const register = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submitting.current) return;
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const fullName = String(form.get("fullName") || "");
    const email = String(form.get("email") || "");
    const mobile = String(form.get("mobile") || "");
    const password = String(form.get("password") || "");
    const confirmPassword = String(form.get("confirmPassword") || "");
    const accountType = String(form.get("accountType") || "customer");
    const termsAccepted = form.get("terms") === "on";
    const code = String(form.get("code") || "");
    setServerError("");
    if (!pendingEmail) {
      const nextErrors: Record<string, string> = {
        fullName: !fullName ? "Enter your full name." : "",
        email: !email ? "Enter your email address." : (formElement.elements.namedItem("email") as HTMLInputElement).validity.typeMismatch ? "Enter a valid email address." : "",
        mobile: !mobile.trim() ? "Enter your mobile number." : "",
        password: !password ? "Enter your password." : "",
        confirmPassword: password !== confirmPassword ? "Passwords do not match." : "",
        terms: !termsAccepted ? "Please accept the Terms and Privacy Policy." : "",
      };
      setErrors(nextErrors);
      const firstInvalid = Object.keys(nextErrors).find(key => nextErrors[key]);
      if (firstInvalid) {
        (formElement.elements.namedItem(firstInvalid) as HTMLInputElement)?.focus();
        return;
      }
    }
    try {
      submitting.current = true;
      setLoading(true);
      if (pendingEmail) {
        await confirmSignUp(pendingEmail, code);
        toast.success("Account verified. You can sign in now.");
        setPendingEmail("");
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
      const message = error instanceof Error ? error.message : "Signup failed. Please try again.";
      setServerError(message);
      toast.error(message);
    } finally {
      submitting.current = false;
      setLoading(false);
    }
  };

  return (
    <div data-public-page-scroll className="h-full min-h-0 overflow-y-auto travelian-hero-background">
      <div className="flex min-h-full items-center justify-center px-4 py-6 sm:px-6 sm:py-8">
        <Card className="my-auto w-full max-w-[920px] shrink-0 overflow-hidden rounded-xl border border-border/60 bg-white shadow-md">
          <CardContent className="grid p-0 lg:grid-cols-[42fr_58fr]">
            <AuthAside variant="minimal" eyebrow="Create account" title="Join Travelian" description="Create your account to manage bookings and access Travelian services." />
            <div className="px-6 py-8 sm:px-8">
              <h1 className="font-display text-2xl font-semibold tracking-tight text-foreground">Create your Travelian account</h1>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">Set up your account to manage bookings and Travelian services.</p>
              <form onSubmit={register} noValidate aria-busy={loading} className="mt-6 grid grid-cols-1 gap-x-4 gap-y-2 sm:grid-cols-2">
                {pendingEmail ? (
                  <div className="sm:col-span-2">
                    <Label htmlFor="code" className="text-sm font-medium">Verification code</Label>
                    <Input id="code" name="code" inputMode="numeric" autoComplete="one-time-code" placeholder="Enter email code" aria-describedby="code-help" className="mt-2 h-12 rounded-lg bg-white" />
                    <p id="code-help" className="mt-2 text-xs text-muted-foreground">We sent a code to {pendingEmail}.</p>
                  </div>
                ) : (
                  <>
                    <div>
                      <Label htmlFor="fullName" className="text-sm font-medium">Full Name</Label>
                      <Input id="fullName" name="fullName" autoComplete="name" placeholder="Your name" required aria-invalid={!!errors.fullName} aria-describedby="fullName-error" onChange={() => clearError("fullName")} className="mt-2 h-12 rounded-lg bg-white" />
                      <p id="fullName-error" aria-live="polite" className="min-h-5 pt-1 text-xs text-destructive">{errors.fullName}</p>
                    </div>
                    <div>
                      <Label htmlFor="email" className="text-sm font-medium">Email</Label>
                      <Input id="email" name="email" type="email" autoComplete="email" placeholder="you@example.com" required aria-invalid={!!errors.email} aria-describedby="email-error" onChange={() => clearError("email")} className="mt-2 h-12 rounded-lg bg-white" />
                      <p id="email-error" aria-live="polite" className="min-h-5 pt-1 text-xs text-destructive">{errors.email}</p>
                    </div>
                    <div>
                      <Label htmlFor="mobile" className="text-sm font-medium">Mobile Number</Label>
                      <Input id="mobile" name="mobile" type="tel" autoComplete="tel" placeholder="+92 300 0000000" required aria-invalid={!!errors.mobile} aria-describedby="mobile-error" onChange={() => clearError("mobile")} className="mt-2 h-12 rounded-lg bg-white" />
                      <p id="mobile-error" aria-live="polite" className="min-h-5 pt-1 text-xs text-destructive">{errors.mobile}</p>
                    </div>
                    <fieldset aria-describedby="partner-help" className="min-w-0">
                      <legend className="text-sm font-medium">Account Type</legend>
                      <div className="mt-2 grid h-12 grid-cols-2 rounded-lg border border-input">
                        {[{ value: "customer", label: "Customer" }, { value: "partner", label: "Travel Partner" }].map(option => (
                          <label key={option.value} className={`flex cursor-pointer items-center justify-center gap-1.5 rounded-md px-1 text-xs font-medium ${accountType === option.value ? "bg-accent text-primary" : "text-muted-foreground"}`}>
                            <input type="radio" name="accountType" value={option.value} checked={accountType === option.value} onChange={() => setAccountType(option.value)} className="h-3.5 w-3.5 shrink-0 accent-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2" />
                            {option.label}
                          </label>
                        ))}
                      </div>
                    </fieldset>
                    <p id="partner-help" aria-live="polite" className="min-h-12 text-xs leading-4 text-muted-foreground sm:col-span-2 sm:min-h-8">
                      {accountType === "partner" ? "Travel Partner accounts are reviewed by the Travelian team before agency access is enabled." : ""}
                    </p>
                    <div className="[&_button]:right-1 [&_button]:top-0.5 [&_button]:h-11 [&_button]:w-11 [&_button]:rounded-md [&_button]:focus-visible:outline-none [&_button]:focus-visible:ring-2 [&_button]:focus-visible:ring-ring">
                      <Label htmlFor="password" className="text-sm font-medium">Password</Label>
                      <div className="mt-2"><PasswordInput id="password" name="password" autoComplete="new-password" placeholder="Password" required aria-invalid={!!errors.password} aria-describedby="password-error" onChange={() => clearError("password")} className="h-12 rounded-lg bg-white pr-12" /></div>
                      <p id="password-error" aria-live="polite" className="min-h-5 pt-1 text-xs text-destructive">{errors.password}</p>
                    </div>
                    <div className="[&_button]:right-1 [&_button]:top-0.5 [&_button]:h-11 [&_button]:w-11 [&_button]:rounded-md [&_button]:focus-visible:outline-none [&_button]:focus-visible:ring-2 [&_button]:focus-visible:ring-ring">
                      <Label htmlFor="confirmPassword" className="text-sm font-medium">Confirm Password</Label>
                      <div className="mt-2"><PasswordInput id="confirmPassword" name="confirmPassword" autoComplete="new-password" placeholder="Repeat password" required aria-invalid={!!errors.confirmPassword} aria-describedby="confirmPassword-error" onChange={() => clearError("confirmPassword")} className="h-12 rounded-lg bg-white pr-12" /></div>
                      <p id="confirmPassword-error" aria-live="polite" className="min-h-5 pt-1 text-xs text-destructive">{errors.confirmPassword}</p>
                    </div>
                    <div className="sm:col-span-2">
                      <div className="flex items-start gap-2.5 text-xs leading-5 text-muted-foreground">
                        <input id="terms" name="terms" type="checkbox" required aria-invalid={!!errors.terms} aria-describedby="terms-error" onChange={() => clearError("terms")} className="mt-0.5 h-4 w-4 shrink-0 rounded border-border accent-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2" />
                        <span><label htmlFor="terms" className="cursor-pointer">I agree to the </label><Link to="/terms" className="rounded text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">Terms</Link> and <Link to="/privacy" className="rounded text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">Privacy Policy</Link>.</span>
                      </div>
                      <p id="terms-error" aria-live="polite" className="min-h-5 pt-1 text-xs text-destructive">{errors.terms}</p>
                    </div>
                  </>
                )}
                <p role="alert" className="min-h-10 py-1 text-sm leading-5 text-destructive sm:col-span-2">{serverError}</p>
                <Button type="submit" disabled={loading} className="h-12 w-full rounded-lg bg-primary text-sm font-semibold text-primary-foreground hover:bg-primary/90 sm:col-span-2">
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />}
                  {loading ? (pendingEmail ? "Verifying…" : "Creating account…") : (pendingEmail ? "Verify Account" : "Create Account")}
                </Button>
              </form>
              <p className="mt-6 text-center text-sm text-muted-foreground">
                Already have an account? <Link to="/signin" className="rounded font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">Sign in</Link>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
