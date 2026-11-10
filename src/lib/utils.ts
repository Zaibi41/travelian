import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

// Teach tailwind-merge the admin type scale (tailwind.config.ts fontSize), so
// e.g. "text-kpi" is treated as a font size and not dropped as a conflicting
// text color when combined with "text-status-action-text".
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      "font-size": [{ text: ["page-title", "kpi", "kpi-sm", "section", "nav", "body", "table", "label", "helper"] }],
    },
  },
});

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
