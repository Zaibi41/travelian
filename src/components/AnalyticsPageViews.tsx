import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { trackPageView } from "@/lib/analytics";

/** Sends a Google Analytics page view for each public page the visitor opens (#20). */
export function AnalyticsPageViews() {
  const { pathname } = useLocation();
  useEffect(() => {
    // Let the page set its <title> (react-helmet) before the view is sent.
    const timer = window.setTimeout(() => trackPageView(pathname), 0);
    return () => window.clearTimeout(timer);
  }, [pathname]);
  return null;
}
