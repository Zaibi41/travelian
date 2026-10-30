// Centralised customer-facing contact info for Travelian.
// Edit here once; consumed by the public navbar, footer, floating WhatsApp button and inline CTAs.

export const SUPPORT_PHONE_DISPLAY = "+92 324 4440014";
export const SUPPORT_PHONE_TEL = "+923244440014";
export const SUPPORT_WHATSAPP_DIGITS = "923244440014";
export const SUPPORT_EMAIL = "info@travelian.pk";

export function whatsappUrl(message?: string) {
  const base = `https://wa.me/${SUPPORT_WHATSAPP_DIGITS}`;
  if (!message) return base;
  return `${base}?text=${encodeURIComponent(message)}`;
}

export function whatsappUrlFor(phoneDigits: string, message?: string) {
  const digits = (phoneDigits || "").replace(/\D/g, "");
  const target = digits || SUPPORT_WHATSAPP_DIGITS;
  const base = `https://wa.me/${target}`;
  if (!message) return base;
  return `${base}?text=${encodeURIComponent(message)}`;
}

export const SUPPORT_ADDRESS = "589-J2, Johar Town, Lahore";
export const SITE_URL = "https://travelian.pk";
export const SITE_DISPLAY = "www.travelian.pk";
export const SOCIAL_LINKS = [
  { id: "facebook", label: "Facebook", href: "https://www.facebook.com/Travelian.pk/" },
  { id: "instagram", label: "Instagram", href: "https://www.instagram.com/travelian.pk/" },
  { id: "youtube", label: "YouTube", href: "https://www.youtube.com/@Travelianpk" },
  { id: "tiktok", label: "TikTok", href: "https://www.tiktok.com/@travelian.pk" },
] as const;
