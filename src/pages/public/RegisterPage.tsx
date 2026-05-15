import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Plane, Mail, Lock, User } from "lucide-react";
import { toast } from "sonner";
import { setSession } from "@/lib/auth-session";

const schema = z.object({
  fullName: z.string().trim().min(2, "Name is required").max(100),
  email: z.string().trim().email("Enter a valid email").max(255),
  password: z.string().min(8, "Password must be at least 8 characters").max(72),
});

const SocialBtn = ({ provider, children }: { provider: string; children: React.ReactNode }) => (
  <Button type="button" variant="outline" className="w-full gap-2 rounded-lg" onClick={() => toast.info(`${provider} sign-up is coming soon`)}>
    {children}
  </Button>
);

export default function RegisterPage() {
  const navigate = useNavigate();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const parsed = schema.safeParse({
      fullName: fd.get("fullName"),
      email: fd.get("email"),
      password: fd.get("password"),
    });
    if (!parsed.success) {
      const errs: Record<string, string> = {};
      parsed.error.issues.forEach(i => { errs[String(i.path[0])] = i.message; });
      setErrors(errs);
      return;
    }
    setErrors({});
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setSession({ email: String(parsed.data.email), name: String(parsed.data.fullName), createdAt: new Date().toISOString() });
      toast.success("Account created! Welcome to Travelian.");
      navigate("/account");
    }, 600);
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center bg-muted/30 py-10 px-4">
      <Card className="w-full max-w-md shadow-elevated border-0">
        <CardContent className="p-8">
          <Link to="/" className="flex items-center justify-center gap-2 mb-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl gradient-primary">
              <Plane className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-extrabold font-display">Travelian</span>
          </Link>
          <h1 className="text-2xl font-bold text-center text-foreground">Create your account</h1>
          <p className="text-sm text-muted-foreground text-center mt-1">Start booking with exclusive member rates</p>

          <form onSubmit={onSubmit} className="mt-6 space-y-4">
            <div>
              <Label htmlFor="fullName">Full Name *</Label>
              <div className="relative mt-1">
                <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input id="fullName" name="fullName" placeholder="John Doe" className="pl-9 h-11" />
              </div>
              {errors.fullName && <p className="text-xs text-destructive mt-1">{errors.fullName}</p>}
            </div>
            <div>
              <Label htmlFor="email">Email *</Label>
              <div className="relative mt-1">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input id="email" name="email" type="email" placeholder="you@example.com" className="pl-9 h-11" />
              </div>
              {errors.email && <p className="text-xs text-destructive mt-1">{errors.email}</p>}
            </div>
            <div>
              <Label htmlFor="password">Password *</Label>
              <div className="relative mt-1">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input id="password" name="password" type="password" placeholder="At least 8 characters" className="pl-9 h-11" />
              </div>
              {errors.password && <p className="text-xs text-destructive mt-1">{errors.password}</p>}
            </div>
            <p className="text-xs text-muted-foreground">By signing up you agree to our <Link to="/terms" className="text-primary hover:underline">Terms</Link> and <Link to="/privacy" className="text-primary hover:underline">Privacy Policy</Link>.</p>
            <Button type="submit" disabled={loading} className="w-full h-11 gradient-primary text-primary-foreground font-semibold">
              {loading ? "Creating..." : "Create Account"}
            </Button>
          </form>

          <div className="my-6 flex items-center gap-3 text-xs text-muted-foreground">
            <div className="flex-1 h-px bg-border" /> OR <div className="flex-1 h-px bg-border" />
          </div>

          <div className="space-y-2">
            <SocialBtn provider="Google"><span className="text-base">G</span> Continue with Google</SocialBtn>
            <SocialBtn provider="Facebook"><span className="text-base">f</span> Continue with Facebook</SocialBtn>
            <SocialBtn provider="Apple"><span className="text-base"></span> Continue with Apple</SocialBtn>
          </div>

          <p className="text-center text-sm text-muted-foreground mt-6">
            Already a member? <Link to="/signin" className="text-primary font-semibold hover:underline">Sign in</Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
