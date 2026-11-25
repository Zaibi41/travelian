// Pages that must never appear in search results: checkout, bookings, account, sign-in and the admin.
// public/robots.txt disallows the same prefixes (private-paths.test.ts keeps the two in step).
export const PRIVATE_PATH_PREFIXES = [
  "/admin",
  "/booking",
  "/request-booking",
  "/account",
  "/my-bookings",
  "/payment",
  "/find-booking",
  "/auth/",
  "/signin",
  "/register",
] as const;

export function isPrivatePath(pathname: string) {
  return PRIVATE_PATH_PREFIXES.some(prefix =>
    prefix.endsWith("/") ? pathname.startsWith(prefix) : pathname === prefix || pathname.startsWith(`${prefix}/`));
}
