import { lazy, Suspense } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { ScrollToTop } from "@/components/ScrollToTop";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AdminLayout } from "@/components/AdminLayout";
import { PublicLayout } from "@/components/public/PublicLayout";
import { RoleProvider } from "@/contexts/RoleContext";
import { AdminProvider } from "@/contexts/AdminStore";
import { LocaleProvider } from "@/contexts/LocaleContext";

// Public pages
import HomePage from "./pages/public/HomePage";
const PublicHotelsPage = lazy(() => import("./pages/public/PublicHotelsPage"));
const HotelDetailPage = lazy(() => import("./pages/public/HotelDetailPage"));
const PublicFlightsPage = lazy(() => import("./pages/public/PublicFlightsPage"));
const FlightDetailPage = lazy(() => import("./pages/public/FlightDetailPage"));
const PublicPackagesPage = lazy(() => import("./pages/public/PublicPackagesPage"));
const UmrahSamplePage = lazy(() => import("./pages/public/UmrahSamplePage"));

const PublicBlogPage = lazy(() => import("./pages/public/PublicBlogPage"));
const ContactPage = lazy(() => import("./pages/public/ContactPage"));
const AboutPage = lazy(() => import("./pages/public/AboutPage"));
const DealsPage = lazy(() => import("./pages/public/DealsPage"));
const BookingPage = lazy(() => import("./pages/public/BookingPage"));
const AccountPage = lazy(() => import("./pages/public/AccountPage"));
const SignInPage = lazy(() => import("./pages/public/SignInPage"));
const RegisterPage = lazy(() => import("./pages/public/RegisterPage"));
const AuthCallbackPage = lazy(() => import("./pages/public/AuthCallbackPage"));
const FaqPage = lazy(() => import("./pages/public/FaqPage"));
const PrivacyPage = lazy(() => import("./pages/public/PrivacyPage"));
const TermsPage = lazy(() => import("./pages/public/TermsPage"));
const CareersPage = lazy(() => import("./pages/public/CareersPage"));
const UmrahDetailPage = lazy(() => import("./pages/public/UmrahDetailPage"));
const MyBookingsPage = lazy(() => import("./pages/public/MyBookingsPage"));
const BlogDetailPage = lazy(() => import("./pages/public/BlogDetailPage"));
const DestinationPage = lazy(() => import("./pages/public/DestinationPage"));
const BookingRequestPage = lazy(() => import("./pages/public/BookingRequestPage"));
const GroupTicketingPage = lazy(() => import("./pages/public/GroupTicketingPage"));

// Admin pages
const DashboardPage = lazy(() => import("./pages/DashboardPage"));
const AgenciesPage = lazy(() => import("./pages/AgenciesPage"));
const PackagesPage = lazy(() => import("./pages/PackagesPage"));
const HotelsPage = lazy(() => import("./pages/HotelsPage"));
const FlightsPage = lazy(() => import("./pages/FlightsPage"));
const WalletPage = lazy(() => import("./pages/WalletPage"));
const PaymentsPage = lazy(() => import("./pages/PaymentsPage"));
const SecretManagerPage = lazy(() => import("./pages/SecretManagerPage"));
const ProviderSystemsPage = lazy(() => import("./pages/ProviderSystemsPage"));
const GroupTicketingCollectionsPage = lazy(() => import("./pages/GroupTicketingCollectionsPage"));
const AdminSearchPage = lazy(() => import("./pages/AdminSearchPage"));
const FlightBookingsPage = lazy(() => import("./pages/FlightBookingsPage"));
const CustomerPortalPage = lazy(() => import("./pages/CustomerPortalPage"));
const UsersPage = lazy(() => import("./pages/UsersPage"));
const CustomersPage = lazy(() => import("./pages/CustomersPage"));
const RBACPage = lazy(() => import("./pages/RBACPage"));
const CouponsPage = lazy(() => import("./pages/CouponsPage"));
const BlogPage = lazy(() => import("./pages/BlogPage"));
const DocumentsPage = lazy(() => import("./pages/DocumentsPage"));
const NotificationsPage = lazy(() => import("./pages/NotificationsPage"));
const SettingsPage = lazy(() => import("./pages/SettingsPage"));
const NotFound = lazy(() => import("./pages/NotFound"));
const BookingRequestsPage = lazy(() => import("./pages/BookingRequestsPage"));
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
            <Route path="/admin/bookings" element={<AdminLayout><Navigate to="/admin/flight-bookings?tab=all" replace /></AdminLayout>} />
            <Route path="/admin/bookings/holds" element={<AdminLayout><Navigate to="/admin/flight-bookings?tab=held" replace /></AdminLayout>} />
            <Route path="/admin/booking-requests" element={<AdminLayout><Navigate to="/admin/requests?tab=all" replace /></AdminLayout>} />
            <Route path="/admin/reports" element={<AdminLayout><ReportsPage /></AdminLayout>} />
            <Route path="/admin/roadmap/audit-logs" element={<AdminLayout><RoadmapPlaceholderPage title="Audit Logs" description="A searchable trail of every admin action (user, module, before/after) with filters by user, module and date." eta="Sprint 4" /></AdminLayout>} />
            <Route path="/admin/roadmap/webhook-logs" element={<AdminLayout><RoadmapPlaceholderPage title="Webhook Logs" description="Inbound and outbound webhook delivery logs for payment gateways and supplier APIs, with retry controls." eta="Sprint 3" /></AdminLayout>} />
            <Route path="/admin/roadmap/reconciliation" element={<AdminLayout><RoadmapPlaceholderPage title="Reconciliation" description="Match supplier statements, gateway settlements and Travelian ledger lines; flag mismatches for review." eta="Sprint 4" /></AdminLayout>} />
            <Route path="/admin/roadmap/payment-gateways" element={<AdminLayout><RoadmapPlaceholderPage title="Payment Gateways" description="Toggle gateways live/sandbox, configure per-gateway fees and routing rules." eta="Sprint 3" /></AdminLayout>} />
            <Route path="/admin/tickets" element={<AdminLayout><Navigate to="/admin/flight-bookings?tab=issued" replace /></AdminLayout>} />
            <Route path="/admin/hotels" element={<AdminLayout><HotelsPage /></AdminLayout>} />
            <Route path="/admin/flights" element={<AdminLayout><FlightsPage /></AdminLayout>} />
            <Route path="/admin/flights-search" element={<AdminLayout><PublicFlightsPage bookingPath="/admin/booking" adminMode /></AdminLayout>} />
            <Route path="/admin/flight-search" element={<AdminLayout><Navigate to="/admin/search?tab=flights" replace /></AdminLayout>} />
            <Route path="/admin/search" element={<AdminLayout><AdminSearchPage /></AdminLayout>} />
            <Route path="/admin/flight-bookings" element={<AdminLayout><FlightBookingsPage /></AdminLayout>} />
            <Route path="/admin/requests" element={<AdminLayout><BookingRequestsPage /></AdminLayout>} />
            <Route path="/admin/booking" element={<AdminLayout><BookingPage /></AdminLayout>} />
            <Route path="/admin/wallet" element={<AdminLayout><WalletPage /></AdminLayout>} />
            <Route path="/admin/payments" element={<AdminLayout><PaymentsPage /></AdminLayout>} />
            <Route path="/admin/users" element={<AdminLayout><UsersPage /></AdminLayout>} />
            <Route path="/admin/customers" element={<AdminLayout><CustomersPage /></AdminLayout>} />
            <Route path="/admin/rbac" element={<AdminLayout><RBACPage /></AdminLayout>} />
            <Route path="/admin/provider-systems" element={<AdminLayout><ProviderSystemsPage /></AdminLayout>} />
            <Route path="/admin/group-ticketing" element={<AdminLayout><GroupTicketingCollectionsPage /></AdminLayout>} />
            <Route path="/admin/secrets" element={<AdminLayout><SecretManagerPage /></AdminLayout>} />
            <Route path="/admin/coupons" element={<AdminLayout><CouponsPage /></AdminLayout>} />
            <Route path="/admin/blog" element={<AdminLayout><BlogPage /></AdminLayout>} />
            <Route path="/admin/documents" element={<AdminLayout><DocumentsPage /></AdminLayout>} />
            <Route path="/admin/notifications" element={<AdminLayout><NotificationsPage /></AdminLayout>} />
            <Route path="/admin/settings" element={<AdminLayout><SettingsPage /></AdminLayout>} />
            <Route path="/admin/customer" element={<AdminLayout><CustomerPortalPage /></AdminLayout>} />
            <Route path="/admin/customer/*" element={<AdminLayout><CustomerPortalPage /></AdminLayout>} />
              <Route path="*" element={<NotFound />} />
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
