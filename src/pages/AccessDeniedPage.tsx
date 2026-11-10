import { Link } from "react-router-dom";
import { ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function AccessDeniedPage() {
  return (
    <div className="flex min-h-[calc(100vh-7rem)] items-center justify-center p-6">
      <div className="w-full max-w-md rounded-2xl border bg-card p-8 text-center shadow-card">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
          <ShieldAlert className="h-7 w-7" />
        </div>
        <h1 className="mt-5 font-display text-page-title font-bold text-foreground">Access Denied</h1>
        <p className="mt-2 text-body text-muted-foreground">
          Your role does not have permission to open this workspace page.
        </p>
        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
          <Button className="gradient-primary text-primary-foreground rounded-xl" asChild>
            <Link to="/admin">Go to Dashboard</Link>
          </Button>
          <Button variant="outline" className="rounded-xl" asChild>
            <Link to="/">Public Site</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
