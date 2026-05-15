import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Plane, Mail, Lock, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { setSession } from "@/lib/auth-session";

const schema = z.object({
  email: z.string().trim().email("Enter a valid email").max(255),
  password: z.string().min(6, "Password must be at least 6 characters").max(72),
});

const SocialBtn = ({ provider, children }: { provider: string; children: React.ReactNode }) => (
  <Button
    type="button"
    variant="outline"
    className="w-full gap-2 rounded-lg"
    onClick={() => toast.info(`${provider} sign-in is coming soon`)}
  >
    {children}
  </Button>
);

export default function SignInPage() {
  const navigate = useNavigate();
  const [showPwd, setShowPwd] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const parsed = schema.safeParse({
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
      toast.success("Welcome back!");
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
          <h1 className="text-2xl font-bold text-center text-foreground">Welcome back</h1>
          <p className="text-sm text-muted-foreground text-center mt-1">Sign in to manage your trips</p>

          <form onSubmit={onSubmit} className="mt-6 space-y-4">
            <div>
              <Label htmlFor="email">Email *</Label>
              <div className="relative mt-1">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input id="email" name="email" type="email" placeholder="you@example.com" className="pl-9 h-11" />
              </div>
              {errors.email && <p className="text-xs text-destructive mt-1">{errors.email}</p>}
            </div>
            <div>
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password *</Label>
                <Link to="/signin" className="text-xs text-primary hover:underline" onClick={(e) => { e.preventDefault(); toast.info("Password reset link sent if account exists."); }}>Forgot?</Link>
              </div>
              <div className="relative mt-1">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input id="password" name="password" type={showPwd ? "text" : "password"} placeholder="••••••••" className="pl-9 pr-9 h-11" />
                <button type="button" onClick={() => setShowPwd(s => !s)} className="absolute right-3 top-3 text-muted-foreground" aria-label="Toggle password">
                  {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.password && <p className="text-xs text-destructive mt-1">{errors.password}</p>}
            </div>
            <Button type="submit" disabled={loading} className="w-full h-11 gradient-primary text-primary-foreground font-semibold">
              {loading ? "Signing in..." : "Sign In"}
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
            New to Travelian? <Link to="/register" className="text-primary font-semibold hover:underline">Create an account</Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
