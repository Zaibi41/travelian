// Kept apart from admin-navigation (icons, roles) so the router can read it without adding them to the public bundle.

// Old URLs (2026-11-06 renames and the 2026-11-27 menu cleanup). Each redirects (src/App.tsx); for access it
// counts as its new page. Tabs are checked by their page, not here.
export const RENAMED_ADMIN_PATHS: Record<string, string> = {
  "/admin/roadmap/audit-logs": "/admin/system/logs?tab=audit",
  "/admin/roadmap/audit-log": "/admin/system/logs?tab=audit",
  "/admin/roadmap/reconciliation": "/admin/finance/reconciliation",
  "/admin/roadmap/webhook-logs": "/admin/system/logs?tab=errors",
  "/admin/roadmap/system-logs-jobs": "/admin/system/logs?tab=errors",
  "/admin/roadmap/payment-gateways": "/admin/integrations?tab=payments",
  "/admin/roadmap/payment-providers": "/admin/integrations?tab=payments",
  "/admin/flights": "/admin/pricing?tab=rules",
  "/admin/pricing/flights": "/admin/pricing?tab=rules",
  "/admin/coupons": "/admin/pricing?tab=promotions",
  "/admin/group-ticketing": "/admin/integrations?tab=suppliers",
  "/admin/hotels": "/admin/integrations?tab=suppliers",
  "/admin/provider-systems": "/admin/integrations?tab=suppliers",
  "/admin/rbac": "/admin/users?tab=roles",
  "/admin/blog": "/admin/website?tab=blog",
  "/admin/site-logo": "/admin/website?tab=branding",
  "/admin/settings": "/admin/system/settings",
  "/admin/announcements": "/admin/system/announcements",
  "/admin/audit-log": "/admin/system/logs?tab=audit",
  "/admin/search": "/admin/bookings/new",
};
