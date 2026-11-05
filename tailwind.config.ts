import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./pages/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: { "2xl": "1400px" },
    },
    extend: {
      fontFamily: {
        display: ["Plus Jakarta Sans", "sans-serif"],
        body: ["Inter", "sans-serif"],
      },
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        success: {
          DEFAULT: "hsl(var(--success))",
          foreground: "hsl(var(--success-foreground))",
        },
        warning: {
          DEFAULT: "hsl(var(--warning))",
          foreground: "hsl(var(--warning-foreground))",
        },
        info: {
          DEFAULT: "hsl(var(--info))",
          foreground: "hsl(var(--info-foreground))",
        },
        gold: {
          DEFAULT: "hsl(var(--gold))",
          foreground: "hsl(var(--gold-foreground))",
          light: "hsl(var(--gold-light))",
        },
        teal: {
          DEFAULT: "hsl(var(--teal))",
          foreground: "hsl(var(--teal-foreground))",
          soft: "hsl(var(--teal-soft))",
        },
        whatsapp: {
          DEFAULT: "hsl(var(--whatsapp))",
          foreground: "hsl(var(--whatsapp-foreground))",
          hover: "hsl(var(--whatsapp-hover))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        // Admin-only tokens (src/styles/theme.css). Defined only under
        // <html data-app-theme="admin">; do not use on public pages.
        brand: {
          navy: "hsl(var(--brand-navy))",
          teal: "hsl(var(--brand-teal))",
        },
        status: {
          critical: {
            DEFAULT: "hsl(var(--status-critical))",
            text: "hsl(var(--status-critical-text))",
            soft: "hsl(var(--status-critical-soft))",
          },
          action: {
            DEFAULT: "hsl(var(--status-action))",
            text: "hsl(var(--status-action-text))",
            soft: "hsl(var(--status-action-soft))",
          },
          fine: {
            DEFAULT: "hsl(var(--status-fine))",
            text: "hsl(var(--status-fine-text))",
            soft: "hsl(var(--status-fine-soft))",
          },
        },
        chart: {
          1: "hsl(var(--chart-1))",
          2: "hsl(var(--chart-2))",
        },
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
          muted: "hsl(var(--sidebar-muted))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
        pill: "9999px",
      },
      // Admin-only type scale and sizes (src/styles/theme.css).
      fontSize: {
        "page-title": ["var(--text-page-title)", { lineHeight: "1.25" }],
        kpi: ["var(--text-kpi)", { lineHeight: "1.2" }],
        "kpi-sm": ["var(--text-kpi-sm)", { lineHeight: "1.2" }],
        section: ["var(--text-section)", { lineHeight: "1.4" }],
        nav: ["var(--text-nav)", { lineHeight: "1.4" }],
        body: ["var(--text-body)", { lineHeight: "1.5" }],
        table: ["var(--text-table)", { lineHeight: "1.4" }],
        label: ["var(--text-label)", { lineHeight: "1.4" }],
      },
      spacing: {
        "content": "var(--content-padding)",
        "card": "var(--card-padding)",
        "card-gap": "var(--card-gap)",
        "section-gap": "var(--section-gap)",
        "control": "var(--control-height)",
        "nav-item": "var(--nav-item-height)",
        "table-header": "var(--table-header-height)",
        "table-row": "var(--table-row-height)",
        "badge": "var(--badge-height)",
        "admin-sidebar": "var(--admin-sidebar-width)",
        "stripe": "var(--status-stripe)",
      },
      keyframes: {
        "accordion-down": { from: { height: "0" }, to: { height: "var(--radix-accordion-content-height)" } },
        "accordion-up": { from: { height: "var(--radix-accordion-content-height)" }, to: { height: "0" } },
        "fade-in": { from: { opacity: "0", transform: "translateY(10px)" }, to: { opacity: "1", transform: "translateY(0)" } },
        "fade-in-up": { from: { opacity: "0", transform: "translateY(20px)" }, to: { opacity: "1", transform: "translateY(0)" } },
        "slide-in-right": { from: { opacity: "0", transform: "translateX(20px)" }, to: { opacity: "1", transform: "translateX(0)" } },
        "scale-in": { from: { opacity: "0", transform: "scale(0.95)" }, to: { opacity: "1", transform: "scale(1)" } },
        "pulse-gold": { "0%, 100%": { boxShadow: "0 0 0 0 hsl(42 78% 55% / 0.4)" }, "50%": { boxShadow: "0 0 0 8px hsl(42 78% 55% / 0)" } },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "fade-in": "fade-in 0.4s ease-out",
        "fade-in-up": "fade-in-up 0.5s ease-out",
        "slide-in-right": "slide-in-right 0.4s ease-out",
        "scale-in": "scale-in 0.3s ease-out",
        "pulse-gold": "pulse-gold 2s ease-in-out infinite",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
