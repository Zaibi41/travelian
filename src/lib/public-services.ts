// Retired public products stay blocked in legacy booking queries and coupons.
// Admin inventory and shared booking records are retained independently.

export function isPublicServiceVisible(service: string): boolean {
  if (service === "visa" || service === "visas") return false;
  if (service === "tour" || service === "tours") return false;
  return true;
}

export function isPublicPathVisible(href: string): boolean {
  const url = new URL(href, "https://travelian.pk");
  const path = url.pathname.toLowerCase();
  if (/^\/(visa-services|visa|study-abroad)(\/|$)/.test(path)) return false;
  if (/^\/(tour-packages|tour)(\/|$)/.test(path)) return false;
  if (/^\/(booking|request-booking)\/?$/.test(path)) {
    return isPublicServiceVisible(url.searchParams.get("type") || url.searchParams.get("category") || "");
  }
  return true;
}
