import { useState } from "react";
import type { ComponentProps } from "react";
import { Eye, EyeOff, Lock } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type PasswordInputProps = ComponentProps<"input">;

export function PasswordInput({ className, ...props }: PasswordInputProps) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="relative">
      <Lock className="absolute left-3 top-4 h-4 w-4 text-muted-foreground" />
      <Input
        {...props}
        type={visible ? "text" : "password"}
        className={cn("h-12 rounded-xl bg-muted/30 pl-9 pr-10", className)}
      />
      <button
        type="button"
        onClick={() => setVisible((current) => !current)}
        className="absolute right-3 top-3.5 inline-flex h-5 w-5 items-center justify-center text-muted-foreground transition-colors hover:text-foreground"

        aria-label={visible ? "Hide password" : "Show password"}
      >
        {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  );
}
