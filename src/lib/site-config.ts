// Centralised customer-facing contact info for Travelian.
// Edit here once; consumed by the public navbar, footer, floating WhatsApp button and inline CTAs.

export const SUPPORT_PHONE_DISPLAY = "+92 300 4440014";
export const SUPPORT_PHONE_TEL = "+923004440014";
export const SUPPORT_WHATSAPP_DIGITS = "923004440014";
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
