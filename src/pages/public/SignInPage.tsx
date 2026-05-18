import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plane, Loader2, Mail, Lock } from "lucide-react";
import { toast } from "sonner";
import { signInWithPassword } from "@/lib/cognito-auth";
import { roleForSession } from "@/lib/role-mapping";
import { useRole } from "@/contexts/RoleContext";

export default function SignInPage() {
  const navigate = useNavigate();
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
      navigate(role ? "/admin" : "/account");
    } catch (error) {
      setLoading(false);
      toast.error(error instanceof Error ? error.message : "Sign in failed. Please try again.");
    }
  };

  return (
    <div className="relative h-full min-h-0 overflow-hidden flex items-center justify-center gradient-hero px-4 py-3">
      <div className="absolute inset-0 opacity-10 pointer-events-none" aria-hidden="true">
        <div className="absolute left-10 top-10 h-72 w-72 rounded-full bg-primary/40 blur-3xl" />
        <div className="absolute bottom-0 right-12 h-80 w-80 rounded-full bg-gold/25 blur-3xl" />
      </div>
      <Card className="relative w-full max-w-md shadow-hover border border-primary-foreground/10">
        <CardContent className="p-6 sm:p-8">
          <Link to="/" className="flex items-center justify-center gap-2 mb-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl gradient-primary">
              <Plane className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-extrabold font-display">Travelian</span>
          </Link>
          <h1 className="text-2xl font-bold text-center text-foreground">Welcome back</h1>
          <p className="text-sm text-muted-foreground text-center mt-1">Access your trips, bookings, and agency workspace</p>

          <form onSubmit={signIn} className="mt-7 space-y-4">
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
                <Input id="password" name="password" type="password" autoComplete="current-password" placeholder="Password" className="h-11 pl-9" />
              </div>
            </div>
            <Button type="submit" disabled={loading} className="w-full h-11 gradient-primary text-primary-foreground font-semibold">
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Sign In
            </Button>
          </form>

          <p className="text-center text-sm text-muted-foreground mt-5">
            New to Travelian? <Link to="/register" className="text-primary font-semibold hover:underline">Create an account</Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
