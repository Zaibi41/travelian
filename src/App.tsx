import { lazy, Suspense } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AnalyticsPageViews } from "@/components/AnalyticsPageViews";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { ScrollToTop } from "@/components/ScrollToTop";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { PublicLayout } from "@/components/public/PublicLayout";
import { RoleProvider } from "@/contexts/RoleContext";
import { AdminProvider } from "@/contexts/AdminStore";
import { LocaleProvider } from "@/contexts/LocaleContext";

// Public pages
import HomePage from "./pages/public/HomePage";
// Pages prerendered at deploy time (scripts/prerender.mjs); they load without a "Loading page…" flash.
import { AboutPage, CareersPage, ContactPage, DealsPage, FaqPage, GroupTicketingPage, PrivacyPage, TermsPage } from "./pages/public/prerendered-pages";
// The admin shell (sidebar, header, guards) is only fetched by admin routes, not by public visitors.
const AdminLayout = lazy(() => import("@/components/AdminLayout").then(m => ({ default: m.AdminLayout })));
const PublicHotelsPage = lazy(() => import("./pages/public/PublicHotelsPage"));
const HotelDetailPage = lazy(() => import("./pages/public/HotelDetailPage"));
const PublicFlightsPage = lazy(() => import("./pages/public/PublicFlightsPage"));
const FlightDetailPage = lazy(() => import("./pages/public/FlightDetailPage"));
const PublicPackagesPage = lazy(() => import("./pages/public/PublicPackagesPage"));
const UmrahSamplePage = lazy(() => import("./pages/public/UmrahSamplePage"));

const PublicBlogPage = lazy(() => import("./pages/public/PublicBlogPage"));
const BookingPage = lazy(() => import("./pages/public/BookingPage"));
const AccountPage = lazy(() => import("./pages/public/AccountPage"));
const SignInPage = lazy(() => import("./pages/public/SignInPage"));
const RegisterPage = lazy(() => import("./pages/public/RegisterPage"));
const AuthCallbackPage = lazy(() => import("./pages/public/AuthCallbackPage"));
const UmrahDetailPage = lazy(() => import("./pages/public/UmrahDetailPage"));
const MyBookingsPage = lazy(() => import("./pages/public/MyBookingsPage"));
const FindBookingPage = lazy(() => import("./pages/public/FindBookingPage"));
const BookingLinkPage = lazy(() => import("./pages/public/BookingLinkPage"));
const BlogDetailPage = lazy(() => import("./pages/public/BlogDetailPage"));
const DestinationPage = lazy(() => import("./pages/public/DestinationPage"));
const BookingRequestPage = lazy(() => import("./pages/public/BookingRequestPage"));

// Admin pages
const DashboardPage = lazy(() => import("./pages/DashboardPage"));
const AgenciesPage = lazy(() => import("./pages/AgenciesPage"));
const PackagesPage = lazy(() => import("./pages/PackagesPage"));
const HotelsPage = lazy(() => import("./pages/HotelsPage"));
const FlightsPage = lazy(() => import("./pages/FlightsPage"));
const WalletPage = lazy(() => import("./pages/WalletPage"));
const PaymentsPage = lazy(() => import("./pages/PaymentsPage"));
const AccountsLedgersPage = lazy(() => import("./pages/AccountsLedgersPage"));
const AuditLogPage = lazy(() => import("./pages/AuditLogPage"));
const ReconciliationPage = lazy(() => import("./pages/ReconciliationPage"));
const ProviderSystemsPage = lazy(() => import("./pages/ProviderSystemsPage"));
const GroupTicketingCollectionsPage = lazy(() => import("./pages/GroupTicketingCollectionsPage"));
const AdminSearchPage = lazy(() => import("./pages/AdminSearchPage"));
const HoldFlightPage = lazy(() => import("./pages/HoldFlightPage"));
const HoldResultPage = lazy(() => import("./pages/HoldResultPage"));
const GroupHoldPage = lazy(() => import("./pages/GroupHoldPage"));
const GroupHeldPage = lazy(() => import("./pages/GroupHeldPage"));
const FlightBookingsRoute = lazy(() => import("./pages/AdminBookingsRoutes").then(m => ({ default: m.FlightBookingsRoute })));
const CustomerPortalPage = lazy(() => import("./pages/CustomerPortalPage"));
const UsersPage = lazy(() => import("./pages/UsersPage"));
const CustomersTravelersPage = lazy(() => import("./pages/CustomersTravelersPage"));
const SavedPersonPage = lazy(() => import("./pages/SavedPersonPage"));
const RBACPage = lazy(() => import("./pages/RBACPage"));
const CouponsPage = lazy(() => import("./pages/CouponsPage"));
const BlogPage = lazy(() => import("./pages/BlogPage"));
const NotificationsPage = lazy(() => import("./pages/NotificationsPage"));
const AnnouncementsPage = lazy(() => import("./pages/AnnouncementsPage"));
const SiteLogoPage = lazy(() => import("./pages/SiteLogoPage"));
const SettingsPage = lazy(() => import("./pages/SettingsPage"));
const NotFound = lazy(() => import("./pages/NotFound"));
const BookingsRoute = lazy(() => import("./pages/AdminBookingsRoutes").then(m => ({ default: m.BookingsRoute })));
const BookingDetailRoute = lazy(() => import("./pages/AdminBookingsRoutes").then(m => ({ default: m.BookingDetailRoute })));
const LegacyRequestsRoute = lazy(() => import("./pages/AdminBookingsRoutes").then(m => ({ default: m.LegacyRequestsRoute })));
const GroupBookingRoute = lazy(() => import("./pages/AdminBookingsRoutes").then(m => ({ default: m.GroupBookingRoute })));
const ReportsPage = lazy(() => import("./pages/ReportsPage"));
const RoadmapPlaceholderPage = lazy(() => import("./pages/RoadmapPlaceholderPage"));

const queryClient = new QueryClient();

const App = () => (
  <HelmetProvider>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <RoleProvider>
            <LocaleProvider>
              <AdminProvider>
              <ScrollToTop />
              <AnalyticsPageViews />
          <Suspense fallback={<div role="status" className="travelian-container py-8 text-sm text-muted-foreground">Loading page…</div>}>
          <Routes>
            {/* Public routes */}
            <Route path="/" element={<PublicLayout><HomePage /></PublicLayout>} />
            <Route path="/hotels-search" element={<PublicLayout><PublicHotelsPage /></PublicLayout>} />
            <Route path="/hotel/:id" element={<PublicLayout><HotelDetailPage /></PublicLayout>} />
            <Route path="/flights-search" element={<PublicLayout><PublicFlightsPage /></PublicLayout>} />
            <Route path="/flight/:id" element={<PublicLayout><FlightDetailPage /></PublicLayout>} />
            <Route path="/umrah-packages" element={<PublicLayout><PublicPackagesPage /></PublicLayout>} />
            <Route path="/umrah-sample" element={<PublicLayout><Suspense fallback={<div role="status" className="px-4 py-8 text-sm text-muted-foreground">Loading page…</div>}><UmrahSamplePage /></Suspense></PublicLayout>} />
            <Route path="/umrah/:id" element={<PublicLayout><UmrahDetailPage /></PublicLayout>} />
            <Route path="/blog" element={<PublicLayout><Suspense fallback={<div role="status" className="px-4 py-8 text-sm text-muted-foreground">Loading page…</div>}><PublicBlogPage /></Suspense></PublicLayout>} />
            <Route path="/blog-public" element={<Navigate to="/blog" replace />} />
            <Route path="/blog/:slug" element={<PublicLayout><Suspense fallback={<div role="status" className="px-4 py-8 text-sm text-muted-foreground">Loading page…</div>}><BlogDetailPage /></Suspense></PublicLayout>} />
            <Route path="/contact" element={<PublicLayout><ContactPage /></PublicLayout>} />
            <Route path="/about" element={<PublicLayout><AboutPage /></PublicLayout>} />
            <Route path="/deals" element={<PublicLayout><Suspense fallback={<div role="status" className="px-4 py-8 text-sm text-muted-foreground">Loading page…</div>}><DealsPage /></Suspense></PublicLayout>} />
            <Route path="/destination/:slug" element={<PublicLayout><Suspense fallback={<div role="status" className="px-4 py-8 text-sm text-muted-foreground">Loading page…</div>}><DestinationPage /></Suspense></PublicLayout>} />
            <Route path="/group-ticketing" element={<PublicLayout><GroupTicketingPage /></PublicLayout>} />
            <Route path="/group-ticketing/:category" element={<PublicLayout><GroupTicketingPage /></PublicLayout>} />
            <Route path="/booking" element={<PublicLayout><BookingPage /></PublicLayout>} />
            <Route path="/request-booking" element={<PublicLayout><BookingRequestPage /></PublicLayout>} />
            <Route path="/account" element={<PublicLayout><AccountPage /></PublicLayout>} />
            <Route path="/my-bookings" element={<PublicLayout><MyBookingsPage /></PublicLayout>} />
            <Route path="/find-booking" element={<PublicLayout><FindBookingPage /></PublicLayout>} />
            <Route path="/my-bookings/view/:token" element={<PublicLayout><BookingLinkPage /></PublicLayout>} />
            <Route path="/signin" element={<PublicLayout showFooter={false}><SignInPage /></PublicLayout>} />
            <Route path="/register" element={<PublicLayout showFooter={false}><RegisterPage /></PublicLayout>} />
            <Route path="/auth/callback" element={<PublicLayout showFooter={false}><AuthCallbackPage /></PublicLayout>} />
            <Route path="/faq" element={<PublicLayout><FaqPage /></PublicLayout>} />
            <Route path="/privacy" element={<PublicLayout><PrivacyPage /></PublicLayout>} />
            <Route path="/terms" element={<PublicLayout><TermsPage /></PublicLayout>} />
            <Route path="/careers" element={<PublicLayout><Suspense fallback={<div role="status" className="px-4 py-8 text-sm text-muted-foreground">Loading page…</div>}><CareersPage /></Suspense></PublicLayout>} />

            {/* Admin routes */}
            <Route path="/admin" element={<AdminLayout><DashboardPage /></AdminLayout>} />
            <Route path="/admin/agencies" element={<AdminLayout><AgenciesPage /></AdminLayout>} />
            <Route path="/admin/packages" element={<AdminLayout><PackagesPage /></AdminLayout>} />
            <Route path="/admin/bookings" element={<AdminLayout><BookingsRoute /></AdminLayout>} />
            <Route path="/admin/bookings/umrah" element={<Navigate to="/admin/bookings" replace />} />
            {["flights", "group-ticketing", "hotels", "inquiries-requests", "quotations"].map(tab => (
              <Route key={tab} path={`/admin/bookings/${tab}`} element={<AdminLayout><BookingsRoute tab={tab} /></AdminLayout>} />
            ))}
            <Route path="/admin/bookings/group-ticketing/:bookingId/:tab" element={<AdminLayout><GroupBookingRoute /></AdminLayout>} />
            <Route path="/admin/bookings/:bookingId" element={<AdminLayout><BookingDetailRoute /></AdminLayout>} />
            <Route path="/admin/bookings/:bookingId/:tab" element={<AdminLayout><BookingDetailRoute /></AdminLayout>} />
            <Route path="/admin/bookings/holds" element={<AdminLayout><Navigate to="/admin/flight-bookings?tab=held" replace /></AdminLayout>} />
            <Route path="/admin/booking-requests" element={<AdminLayout><Navigate to="/admin/requests?tab=all" replace /></AdminLayout>} />
            <Route path="/admin/reports" element={<AdminLayout><ReportsPage /></AdminLayout>} />
            <Route path="/admin/attention-queue" element={<AdminLayout><RoadmapPlaceholderPage title="Attention Queue" description="One list of cases needing a person, so nothing relies on memory or chat" /></AdminLayout>} />
            <Route path="/admin/alerts" element={<AdminLayout><RoadmapPlaceholderPage title="Alerts" description="Automatic warnings that need acknowledgement, separate from human cases" /></AdminLayout>} />
            <Route path="/admin/audit-log" element={<AdminLayout><AuditLogPage /></AdminLayout>} />
            <Route path="/admin/roadmap/audit-log" element={<AdminLayout><Navigate to="/admin/audit-log" replace /></AdminLayout>} />
            <Route path="/admin/roadmap/audit-logs" element={<AdminLayout><Navigate to="/admin/audit-log" replace /></AdminLayout>} />
            <Route path="/admin/roadmap/system-logs-jobs" element={<AdminLayout><RoadmapPlaceholderPage title="System Logs &amp; Jobs" description="Lets support trace an error to its cause" /></AdminLayout>} />
            <Route path="/admin/roadmap/webhook-logs" element={<AdminLayout><Navigate to="/admin/roadmap/system-logs-jobs" replace /></AdminLayout>} />
            <Route path="/admin/finance/reconciliation" element={<AdminLayout><ReconciliationPage /></AdminLayout>} />
            <Route path="/admin/roadmap/reconciliation" element={<AdminLayout><Navigate to="/admin/finance/reconciliation" replace /></AdminLayout>} />
            <Route path="/admin/roadmap/payment-providers" element={<AdminLayout><RoadmapPlaceholderPage title="Payment Providers" description="Banks and gateways used for receipts and payouts" /></AdminLayout>} />
            <Route path="/admin/roadmap/payment-gateways" element={<AdminLayout><Navigate to="/admin/roadmap/payment-providers" replace /></AdminLayout>} />
            <Route path="/admin/tickets" element={<AdminLayout><Navigate to="/admin/flight-bookings?tab=issued" replace /></AdminLayout>} />
            <Route path="/admin/hotels" element={<AdminLayout><HotelsPage /></AdminLayout>} />
            <Route path="/admin/flights" element={<AdminLayout><FlightsPage /></AdminLayout>} />
            <Route path="/admin/flights-search" element={<AdminLayout><PublicFlightsPage bookingPath="/admin/booking" adminMode /></AdminLayout>} />
            <Route path="/admin/flight-search" element={<AdminLayout><Navigate to="/admin/search?tab=flights" replace /></AdminLayout>} />
            <Route path="/admin/search" element={<AdminLayout><AdminSearchPage /></AdminLayout>} />
            <Route path="/admin/search/flights/hold" element={<AdminLayout><HoldFlightPage /></AdminLayout>} />
            <Route path="/admin/search/flights/hold/result" element={<AdminLayout><HoldResultPage /></AdminLayout>} />
            <Route path="/admin/search/group-ticketing/hold" element={<AdminLayout><GroupHoldPage /></AdminLayout>} />
            <Route path="/admin/search/group-ticketing/held/:bookingId" element={<AdminLayout><GroupHeldPage /></AdminLayout>} />
            <Route path="/admin/flight-bookings" element={<AdminLayout><FlightBookingsRoute /></AdminLayout>} />
            <Route path="/admin/requests" element={<AdminLayout><LegacyRequestsRoute /></AdminLayout>} />
            <Route path="/admin/booking" element={<AdminLayout><BookingPage adminMode /></AdminLayout>} />
            <Route path="/admin/wallet" element={<AdminLayout><WalletPage /></AdminLayout>} />
            <Route path="/admin/payments" element={<AdminLayout><PaymentsPage /></AdminLayout>} />
            <Route path="/admin/finance/accounts-ledgers" element={<AdminLayout><AccountsLedgersPage /></AdminLayout>} />
            <Route path="/admin/users" element={<AdminLayout><UsersPage /></AdminLayout>} />
            <Route path="/admin/customers" element={<AdminLayout><CustomersTravelersPage /></AdminLayout>} />
            <Route path="/admin/customers/travelers" element={<AdminLayout><CustomersTravelersPage tab="travelers" /></AdminLayout>} />
            <Route path="/admin/customers/communications" element={<AdminLayout><CustomersTravelersPage tab="communications" /></AdminLayout>} />
            <Route path="/admin/customers/people/:personId" element={<AdminLayout><SavedPersonPage /></AdminLayout>} />
            <Route path="/admin/rbac" element={<AdminLayout><RBACPage /></AdminLayout>} />
            <Route path="/admin/provider-systems" element={<AdminLayout><ProviderSystemsPage /></AdminLayout>} />
            <Route path="/admin/group-ticketing" element={<AdminLayout><GroupTicketingCollectionsPage /></AdminLayout>} />
            <Route path="/admin/coupons" element={<AdminLayout><CouponsPage /></AdminLayout>} />
            <Route path="/admin/blog" element={<AdminLayout><BlogPage /></AdminLayout>} />
            <Route path="/admin/notifications" element={<AdminLayout><NotificationsPage /></AdminLayout>} />
            <Route path="/admin/announcements" element={<AdminLayout><AnnouncementsPage /></AdminLayout>} />
            <Route path="/admin/site-logo" element={<AdminLayout><SiteLogoPage /></AdminLayout>} />
            <Route path="/admin/settings" element={<AdminLayout><SettingsPage /></AdminLayout>} />
            <Route path="/admin/customer" element={<AdminLayout><CustomerPortalPage /></AdminLayout>} />
            <Route path="/admin/customer/*" element={<AdminLayout><CustomerPortalPage /></AdminLayout>} />
              <Route path="*" element={<PublicLayout><NotFound /></PublicLayout>} />
            </Routes>
          </Suspense>
            </AdminProvider>
            </LocaleProvider>
          </RoleProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </HelmetProvider>
);

export default App;
