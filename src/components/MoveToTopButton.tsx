import { useEffect, useState } from "react";
import { ArrowUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function MoveToTopButton({ className }: { className?: string }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 420);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  if (!visible) return null;

  return (
    <Button
      type="button"
      size="icon"
      variant="secondary"
      className={cn("fixed bottom-24 right-5 z-50 h-11 w-11 rounded-full shadow-xl", className)}
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      aria-label="Move to top"
    >
      <ArrowUp className="h-5 w-5" />
    </Button>
  );
}
