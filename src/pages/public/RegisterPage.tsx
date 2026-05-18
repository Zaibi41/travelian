import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plane, UserPlus, Loader2, Mail, Lock, User, KeyRound } from "lucide-react";
import { toast } from "sonner";
import { confirmSignUp, signUpWithPassword } from "@/lib/cognito-auth";

export default function RegisterPage() {
  const [loading, setLoading] = useState(false);
  const [pendingEmail, setPendingEmail] = useState("");

  const register = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const fullName = String(form.get("fullName") || "");
    const email = String(form.get("email") || "");
    const password = String(form.get("password") || "");
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
      const result = await signUpWithPassword(email, password, fullName);
      if (result.UserConfirmed) {
        toast.success("Account created. You can sign in now.");
      } else {
        setPendingEmail(email);
        toast.success("Verification code sent to your email.");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Signup failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative h-full min-h-0 overflow-hidden flex items-center justify-center gradient-hero px-4 py-2 sm:py-3">
      <div className="absolute inset-0 opacity-10 pointer-events-none" aria-hidden="true">
        <div className="absolute left-10 top-10 h-72 w-72 rounded-full bg-primary/40 blur-3xl" />
        <div className="absolute bottom-0 right-12 h-80 w-80 rounded-full bg-gold/25 blur-3xl" />
      </div>
      <Card className="relative w-full max-w-md shadow-hover border border-primary-foreground/10">
        <CardContent className="p-5 sm:p-6">
          <Link to="/" className="flex items-center justify-center gap-2 mb-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl gradient-primary">
              <Plane className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-extrabold font-display">Travelian</span>
          </Link>
          <h1 className="text-2xl font-bold text-center text-foreground">Create your account</h1>
          <p className="text-sm text-muted-foreground text-center mt-1">Create a Travelian account for faster bookings</p>

          <form onSubmit={register} className="mt-5 space-y-3">
            {pendingEmail ? (
              <div className="space-y-1.5">
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
                  <Label htmlFor="password">Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />
                    <Input id="password" name="password" type="password" autoComplete="new-password" placeholder="At least 8 characters" className="h-11 pl-9" />
                  </div>
                </div>
              </>
            )}
            <Button type="submit" disabled={loading} className="w-full h-11 gradient-primary text-primary-foreground font-semibold">
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UserPlus className="mr-2 h-4 w-4" />}
              {pendingEmail ? "Verify Account" : "Create Account"}
            </Button>
          </form>

          <p className="mt-3 text-xs text-muted-foreground text-center">
            By signing up you agree to our <Link to="/terms" className="text-primary hover:underline">Terms</Link> and <Link to="/privacy" className="text-primary hover:underline">Privacy Policy</Link>.
          </p>

          <p className="text-center text-sm text-muted-foreground mt-3">
            Already a member? <Link to="/signin" className="text-primary font-semibold hover:underline">Sign in</Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
