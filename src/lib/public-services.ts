// Public visibility only: administration, inventory and integration code stay intact.
export const PUBLIC_SERVICE_VISIBILITY = { visa: false, tour: false };

export function isPublicServiceVisible(service: string): boolean {
  if (service === "visa" || service === "visas") return PUBLIC_SERVICE_VISIBILITY.visa;
  if (service === "tour" || service === "tours") return PUBLIC_SERVICE_VISIBILITY.tour;
  return true;
}

export function isPublicPathVisible(href: string): boolean {
  const url = new URL(href, "https://travelian.pk");
  const path = url.pathname.toLowerCase();
  if (/^\/(visa-services|visa|study-abroad)(\/|$)/.test(path)) return PUBLIC_SERVICE_VISIBILITY.visa;
  if (/^\/(tour-packages|tour)(\/|$)/.test(path)) return PUBLIC_SERVICE_VISIBILITY.tour;
  if (/^\/(booking|request-booking)\/?$/.test(path)) {
    return isPublicServiceVisible(url.searchParams.get("type") || url.searchParams.get("category") || "");
  }
  return true;
}
