import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { trackPageView } from "@/lib/analytics";

/** #20: one GA4 page view per public route (titles are set by <SEO> first, so the view waits a tick). */
export function AnalyticsTracker() {
  const { pathname, search } = useLocation();
  useEffect(() => {
    const timer = window.setTimeout(() => trackPageView(pathname, search), 0);
    return () => window.clearTimeout(timer);
  }, [pathname, search]);
  return null;
}
