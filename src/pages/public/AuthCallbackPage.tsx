import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, Plane } from "lucide-react";
import { toast } from "sonner";
import { completeCognitoRedirect } from "@/lib/cognito-auth";
import { isAdminPortalRole, roleForSession } from "@/lib/role-mapping";
import { useRole } from "@/contexts/RoleContext";

export default function AuthCallbackPage() {
  const navigate = useNavigate();
  const { setCurrentRole } = useRole();
  const [message, setMessage] = useState("Completing secure sign in");

  useEffect(() => {
    let cancelled = false;

    completeCognitoRedirect(window.location.search)
      .then((session) => {
        if (cancelled) return;
        const role = roleForSession(session);
        if (role) setCurrentRole(role);
        toast.success("Welcome to Travelian");
        navigate(isAdminPortalRole(role) ? "/admin" : "/admin/customer", { replace: true });
      })
      .catch((error) => {
        if (cancelled) return;
        setMessage(error instanceof Error ? error.message : "Sign in could not be completed.");
        toast.error("Sign in failed");
        setTimeout(() => navigate("/signin", { replace: true }), 2200);
      });

    return () => {
      cancelled = true;
    };
  }, [navigate, setCurrentRole]);

  return (
    <div className="h-[calc(100dvh-4rem)] md:h-[calc(100dvh-6.25rem)] overflow-hidden flex items-center justify-center bg-muted/30 px-4">
      <div className="w-full max-w-sm rounded-2xl border bg-card p-8 text-center shadow-elevated">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl gradient-primary">
          <Plane className="h-6 w-6 text-primary-foreground" />
        </div>
        <Loader2 className="mx-auto mt-6 h-6 w-6 animate-spin text-primary" />
        <h1 className="mt-5 text-xl font-bold text-foreground">Travelian secure access</h1>
        <p className="mt-2 text-sm text-muted-foreground">{message}</p>
      </div>
    </div>
  );
}
