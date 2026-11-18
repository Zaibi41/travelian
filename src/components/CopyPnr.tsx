// A small copy button placed right after a PNR: one click puts the PNR on the clipboard.
import { useEffect, useState } from "react";
import { Check, Copy } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export function CopyPnr({ pnr, className }: { pnr?: string | null; className?: string }) {
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    if (!copied) return;
    const timer = window.setTimeout(() => setCopied(false), 1500);
    return () => window.clearTimeout(timer);
  }, [copied]);
  const value = pnr?.trim();
  if (!value) return null;
  const copy = async (event: React.MouseEvent) => {
    // Never also open a row or follow a link the button sits in.
    event.preventDefault();
    event.stopPropagation();
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      toast.success(`PNR ${value} copied`);
    } catch {
      toast.error(`Copy didn't work. The PNR is ${value}.`);
    }
  };
  return (
    <button
      type="button"
      onClick={event => void copy(event)}
      aria-label={`Copy PNR ${value}`}
      title="Copy PNR"
      className={cn(
        "inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md align-middle text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        className,
      )}
    >
      {copied ? <Check className="h-3.5 w-3.5 text-success" aria-hidden /> : <Copy className="h-3.5 w-3.5" aria-hidden />}
    </button>
  );
}
