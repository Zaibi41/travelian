import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

// Teach tailwind-merge the admin type scale (tailwind.config.ts fontSize), so
// e.g. "text-kpi" is treated as a font size and not dropped as a conflicting
// text color when combined with "text-status-action-text".
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      "font-size": [{ text: ["page-title", "kpi", "kpi-sm", "section", "nav", "body", "table", "label", "helper"] }],
      // Admin size and radius tokens (src/styles/tokens.css), so an override such as
      // "h-9" replaces "h-control" instead of both being kept. Names only the admin uses.
      h: [{ h: ["control", "control-lg", "badge", "table-row", "table-header", "nav-item"] }],
      w: [{ w: ["control", "admin-sidebar"] }],
      "min-h": [{ "min-h": ["control", "control-lg"] }],
      px: [{ px: ["card", "badge-x", "content"] }],
      rounded: [{ rounded: ["field", "pill"] }],
    },
  },
});

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
