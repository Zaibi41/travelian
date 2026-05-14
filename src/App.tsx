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
import FaqPage from "./pages/public/FaqPage";
import PrivacyPage from "./pages/public/PrivacyPage";
import TermsPage from "./pages/public/TermsPage";
import CareersPage from "./pages/public/CareersPage";
import UmrahDetailPage from "./pages/public/UmrahDetailPage";
import MyBookingsPage from "./pages/public/MyBookingsPage";

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
import UsersPage from "./pages/UsersPage";
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
              <ScrollToTop />
          <Routes>
            {/* Public routes */}
            <Route path="/" element={<PublicLayout><HomePage /></PublicLayout>} />
            <Route path="/hotels-search" element={<PublicLayout><PublicHotelsPage /></PublicLayout>} />
            <Route path="/hotel/:id" element={<PublicLayout><HotelDetailPage /></PublicLayout>} />
            <Route path="/flights-search" element={<PublicLayout><PublicFlightsPage /></PublicLayout>} />
            <Route path="/flight/:id" element={<PublicLayout><FlightDetailPage /></PublicLayout>} />
            <Route path="/umrah-packages" element={<PublicLayout><PublicPackagesPage /></PublicLayout>} />
            <Route path="/umrah/:id" element={<PublicLayout><UmrahDetailPage /></PublicLayout>} />
            <Route path="/tour-packages" element={<PublicLayout><PublicToursPage /></PublicLayout>} />
            <Route path="/visa-services" element={<PublicLayout><PublicVisaPage /></PublicLayout>} />
            <Route path="/blog-public" element={<PublicLayout><PublicBlogPage /></PublicLayout>} />
            <Route path="/contact" element={<PublicLayout><ContactPage /></PublicLayout>} />
            <Route path="/about" element={<PublicLayout><AboutPage /></PublicLayout>} />
            <Route path="/deals" element={<PublicLayout><DealsPage /></PublicLayout>} />
            <Route path="/booking" element={<PublicLayout><BookingPage /></PublicLayout>} />
            <Route path="/account" element={<PublicLayout><AccountPage /></PublicLayout>} />
            <Route path="/my-bookings" element={<PublicLayout><MyBookingsPage /></PublicLayout>} />
            <Route path="/signin" element={<PublicLayout><SignInPage /></PublicLayout>} />
            <Route path="/register" element={<PublicLayout><RegisterPage /></PublicLayout>} />
            <Route path="/faq" element={<PublicLayout><FaqPage /></PublicLayout>} />
            <Route path="/privacy" element={<PublicLayout><PrivacyPage /></PublicLayout>} />
            <Route path="/terms" element={<PublicLayout><TermsPage /></PublicLayout>} />
            <Route path="/careers" element={<PublicLayout><CareersPage /></PublicLayout>} />

            {/* Admin routes */}
            <Route path="/admin" element={<AdminProvider><AdminLayout><DashboardPage /></AdminLayout></AdminProvider>} />
            <Route path="/admin/agencies" element={<AdminProvider><AdminLayout><AgenciesPage /></AdminLayout></AdminProvider>} />
            <Route path="/admin/packages" element={<AdminProvider><AdminLayout><PackagesPage /></AdminLayout></AdminProvider>} />
            <Route path="/admin/tours" element={<AdminProvider><AdminLayout><TourPackagesPage /></AdminLayout></AdminProvider>} />
            <Route path="/admin/visa" element={<AdminProvider><AdminLayout><VisaPackagesPage /></AdminLayout></AdminProvider>} />
            <Route path="/admin/bookings" element={<AdminProvider><AdminLayout><BookingsPage /></AdminLayout></AdminProvider>} />
            <Route path="/admin/tickets" element={<AdminProvider><AdminLayout><TicketsPage /></AdminLayout></AdminProvider>} />
            <Route path="/admin/hotels" element={<AdminProvider><AdminLayout><HotelsPage /></AdminLayout></AdminProvider>} />
            <Route path="/admin/flights" element={<AdminProvider><AdminLayout><FlightsPage /></AdminLayout></AdminProvider>} />
            <Route path="/admin/wallet" element={<AdminProvider><AdminLayout><WalletPage /></AdminLayout></AdminProvider>} />
            <Route path="/admin/payments" element={<AdminProvider><AdminLayout><PaymentsPage /></AdminLayout></AdminProvider>} />
            <Route path="/admin/users" element={<AdminProvider><AdminLayout><UsersPage /></AdminLayout></AdminProvider>} />
            <Route path="/admin/rbac" element={<AdminProvider><AdminLayout><RBACPage /></AdminLayout></AdminProvider>} />
            <Route path="/admin/secrets" element={<AdminProvider><AdminLayout><SecretManagerPage /></AdminLayout></AdminProvider>} />
            <Route path="/admin/coupons" element={<AdminProvider><AdminLayout><CouponsPage /></AdminLayout></AdminProvider>} />
            <Route path="/admin/blog" element={<AdminProvider><AdminLayout><BlogPage /></AdminLayout></AdminProvider>} />
            <Route path="/admin/documents" element={<AdminProvider><AdminLayout><DocumentsPage /></AdminLayout></AdminProvider>} />
            <Route path="/admin/notifications" element={<AdminProvider><AdminLayout><NotificationsPage /></AdminLayout></AdminProvider>} />
            <Route path="/admin/settings" element={<AdminProvider><AdminLayout><SettingsPage /></AdminLayout></AdminProvider>} />
              <Route path="*" element={<NotFound />} />
            </Routes>
            </LocaleProvider>
          </RoleProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </HelmetProvider>
);

export default App;
