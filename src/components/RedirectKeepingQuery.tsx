import { Navigate, useLocation } from "react-router-dom";

/** Redirects an old URL to its new one, keeping the old query string (the target's own query values win). */
export function RedirectKeepingQuery({ to }: { to: string }) {
  const { search, hash } = useLocation();
  const [pathname, targetQuery = ""] = to.split("?");
  const params = new URLSearchParams(search);
  new URLSearchParams(targetQuery).forEach((value, key) => params.set(key, value));
  const query = params.toString();
  return <Navigate to={`${pathname}${query ? `?${query}` : ""}${hash}`} replace />;
}
