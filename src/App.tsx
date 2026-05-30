import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
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
import PublicHotelsPage from "./pages/public/PublicHotelsPage";
import PublicTransfersPage from "./pages/public/PublicTransfersPage";
import HotelDetailPage from "./pages/public/HotelDetailPage";
import PublicFlightsPage from "./pages/public/PublicFlightsPage";
import FlightDetailPage from "./pages/public/FlightDetailPage";
import PublicPackagesPage from "./pages/public/PublicPackagesPage";
import PublicToursPage from "./pages/public/PublicToursPage";
import PublicVisaPage from "./pages/public/PublicVisaPage";
import PublicBlogPage from "./pages/public/PublicBlogPage";
import ContactPage from "./pages/public/ContactPage";
import AboutPage from "./pages/public/AboutPage";
import DealsPage from "./pages/public/DealsPage";
import BookingPage from "./pages/public/BookingPage";
import AccountPage from "./pages/public/AccountPage";
import SignInPage from "./pages/public/SignInPage";
import RegisterPage from "./pages/public/RegisterPage";
import AuthCallbackPage from "./pages/public/AuthCallbackPage";
import FaqPage from "./pages/public/FaqPage";
import PrivacyPage from "./pages/public/PrivacyPage";
import TermsPage from "./pages/public/TermsPage";
import CareersPage from "./pages/public/CareersPage";
import UmrahDetailPage from "./pages/public/UmrahDetailPage";
import MyBookingsPage from "./pages/public/MyBookingsPage";
import TourDetailPage from "./pages/public/TourDetailPage";
import VisaDetailPage from "./pages/public/VisaDetailPage";
import BlogDetailPage from "./pages/public/BlogDetailPage";
import DestinationPage from "./pages/public/DestinationPage";
import GroupTicketingPage from "./pages/public/GroupTicketingPage";

// Admin pages
import DashboardPage from "./pages/DashboardPage";
import AgenciesPage from "./pages/AgenciesPage";
import PackagesPage from "./pages/PackagesPage";
import TourPackagesPage from "./pages/TourPackagesPage";
import VisaPackagesPage from "./pages/VisaPackagesPage";
import BookingsPage from "./pages/BookingsPage";
import TicketsPage from "./pages/TicketsPage";
import HotelsPage from "./pages/HotelsPage";
import FlightsPage from "./pages/FlightsPage";
import WalletPage from "./pages/WalletPage";
import PaymentsPage from "./pages/PaymentsPage";
import SecretManagerPage from "./pages/SecretManagerPage";
import ProviderSystemsPage from "./pages/ProviderSystemsPage";
import AgencyFlightSearchPage from "./pages/AgencyFlightSearchPage";
import CustomerPortalPage from "./pages/CustomerPortalPage";
import UsersPage from "./pages/UsersPage";
import CustomersPage from "./pages/CustomersPage";
import RBACPage from "./pages/RBACPage";
import CouponsPage from "./pages/CouponsPage";
import BlogPage from "./pages/BlogPage";
import DocumentsPage from "./pages/DocumentsPage";
import NotificationsPage from "./pages/NotificationsPage";
import SettingsPage from "./pages/SettingsPage";
import NotFound from "./pages/NotFound";

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
          <Routes>
            {/* Public routes */}
            <Route path="/" element={<PublicLayout><HomePage /></PublicLayout>} />
            <Route path="/hotels-search" element={<PublicLayout><PublicHotelsPage /></PublicLayout>} />
            <Route path="/transfers-search" element={<PublicLayout><PublicTransfersPage /></PublicLayout>} />
            <Route path="/hotel/:id" element={<PublicLayout><HotelDetailPage /></PublicLayout>} />
            <Route path="/flights-search" element={<PublicLayout><PublicFlightsPage /></PublicLayout>} />
            <Route path="/flight/:id" element={<PublicLayout><FlightDetailPage /></PublicLayout>} />
            <Route path="/umrah-packages" element={<PublicLayout><PublicPackagesPage /></PublicLayout>} />
            <Route path="/umrah/:id" element={<PublicLayout><UmrahDetailPage /></PublicLayout>} />
            <Route path="/tour-packages" element={<PublicLayout><PublicToursPage /></PublicLayout>} />
            <Route path="/visa-services" element={<PublicLayout><PublicVisaPage /></PublicLayout>} />
            <Route path="/blog-public" element={<PublicLayout><PublicBlogPage /></PublicLayout>} />
            <Route path="/blog/:slug" element={<PublicLayout><BlogDetailPage /></PublicLayout>} />
            <Route path="/tour/:id" element={<PublicLayout><TourDetailPage /></PublicLayout>} />
            <Route path="/visa/:id" element={<PublicLayout><VisaDetailPage /></PublicLayout>} />
            <Route path="/contact" element={<PublicLayout><ContactPage /></PublicLayout>} />
            <Route path="/about" element={<PublicLayout><AboutPage /></PublicLayout>} />
            <Route path="/deals" element={<PublicLayout><DealsPage /></PublicLayout>} />
            <Route path="/destination/:slug" element={<PublicLayout><DestinationPage /></PublicLayout>} />
            <Route path="/group-ticketing" element={<PublicLayout><GroupTicketingPage /></PublicLayout>} />
            <Route path="/group-ticketing/:category" element={<PublicLayout><GroupTicketingPage /></PublicLayout>} />
            <Route path="/booking" element={<PublicLayout><BookingPage /></PublicLayout>} />
            <Route path="/account" element={<PublicLayout><AccountPage /></PublicLayout>} />
            <Route path="/my-bookings" element={<PublicLayout><MyBookingsPage /></PublicLayout>} />
            <Route path="/signin" element={<PublicLayout showFooter={false}><SignInPage /></PublicLayout>} />
            <Route path="/register" element={<PublicLayout showFooter={false}><RegisterPage /></PublicLayout>} />
            <Route path="/auth/callback" element={<PublicLayout showFooter={false}><AuthCallbackPage /></PublicLayout>} />
            <Route path="/faq" element={<PublicLayout><FaqPage /></PublicLayout>} />
            <Route path="/privacy" element={<PublicLayout><PrivacyPage /></PublicLayout>} />
            <Route path="/terms" element={<PublicLayout><TermsPage /></PublicLayout>} />
            <Route path="/careers" element={<PublicLayout><CareersPage /></PublicLayout>} />

            {/* Admin routes */}
            <Route path="/admin" element={<AdminLayout><DashboardPage /></AdminLayout>} />
            <Route path="/admin/agencies" element={<AdminLayout><AgenciesPage /></AdminLayout>} />
            <Route path="/admin/packages" element={<AdminLayout><PackagesPage /></AdminLayout>} />
            <Route path="/admin/tours" element={<AdminLayout><TourPackagesPage /></AdminLayout>} />
            <Route path="/admin/visa" element={<AdminLayout><VisaPackagesPage /></AdminLayout>} />
            <Route path="/admin/bookings" element={<AdminLayout><BookingsPage /></AdminLayout>} />
            <Route path="/admin/tickets" element={<AdminLayout><TicketsPage /></AdminLayout>} />
            <Route path="/admin/hotels" element={<AdminLayout><HotelsPage /></AdminLayout>} />
            <Route path="/admin/flights" element={<AdminLayout><FlightsPage /></AdminLayout>} />
            <Route path="/admin/flights-search" element={<AdminLayout><PublicFlightsPage bookingPath="/admin/booking" adminMode /></AdminLayout>} />
            <Route path="/admin/flight-search" element={<AdminLayout><AgencyFlightSearchPage /></AdminLayout>} />
            <Route path="/admin/booking" element={<AdminLayout><BookingPage /></AdminLayout>} />
            <Route path="/admin/wallet" element={<AdminLayout><WalletPage /></AdminLayout>} />
            <Route path="/admin/payments" element={<AdminLayout><PaymentsPage /></AdminLayout>} />
            <Route path="/admin/users" element={<AdminLayout><UsersPage /></AdminLayout>} />
            <Route path="/admin/customers" element={<AdminLayout><CustomersPage /></AdminLayout>} />
            <Route path="/admin/rbac" element={<AdminLayout><RBACPage /></AdminLayout>} />
            <Route path="/admin/provider-systems" element={<AdminLayout><ProviderSystemsPage /></AdminLayout>} />
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
            </AdminProvider>
            </LocaleProvider>
          </RoleProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </HelmetProvider>
);

export default App;
