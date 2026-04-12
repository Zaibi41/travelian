import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AdminLayout } from "@/components/AdminLayout";
import { PublicLayout } from "@/components/public/PublicLayout";
import { RoleProvider } from "@/contexts/RoleContext";

// Public pages
import HomePage from "./pages/public/HomePage";
import PublicHotelsPage from "./pages/public/PublicHotelsPage";
import HotelDetailPage from "./pages/public/HotelDetailPage";
import PublicFlightsPage from "./pages/public/PublicFlightsPage";
import PublicPackagesPage from "./pages/public/PublicPackagesPage";
import PublicToursPage from "./pages/public/PublicToursPage";
import PublicVisaPage from "./pages/public/PublicVisaPage";
import PublicBlogPage from "./pages/public/PublicBlogPage";
import ContactPage from "./pages/public/ContactPage";
import AboutPage from "./pages/public/AboutPage";
import DealsPage from "./pages/public/DealsPage";
import BookingPage from "./pages/public/BookingPage";
import AccountPage from "./pages/public/AccountPage";

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
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <RoleProvider>
          <Routes>
            {/* Public routes */}
            <Route path="/" element={<PublicLayout><HomePage /></PublicLayout>} />
            <Route path="/hotels-search" element={<PublicLayout><PublicHotelsPage /></PublicLayout>} />
            <Route path="/hotel/:id" element={<PublicLayout><HotelDetailPage /></PublicLayout>} />
            <Route path="/flights-search" element={<PublicLayout><PublicFlightsPage /></PublicLayout>} />
            <Route path="/umrah-packages" element={<PublicLayout><PublicPackagesPage /></PublicLayout>} />
            <Route path="/tour-packages" element={<PublicLayout><PublicToursPage /></PublicLayout>} />
            <Route path="/visa-services" element={<PublicLayout><PublicVisaPage /></PublicLayout>} />
            <Route path="/blog-public" element={<PublicLayout><PublicBlogPage /></PublicLayout>} />
            <Route path="/contact" element={<PublicLayout><ContactPage /></PublicLayout>} />
            <Route path="/about" element={<PublicLayout><AboutPage /></PublicLayout>} />
            <Route path="/deals" element={<PublicLayout><DealsPage /></PublicLayout>} />
            <Route path="/booking" element={<PublicLayout><BookingPage /></PublicLayout>} />
            <Route path="/account" element={<PublicLayout><AccountPage /></PublicLayout>} />

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
            <Route path="/admin/wallet" element={<AdminLayout><WalletPage /></AdminLayout>} />
            <Route path="/admin/users" element={<AdminLayout><UsersPage /></AdminLayout>} />
            <Route path="/admin/rbac" element={<AdminLayout><RBACPage /></AdminLayout>} />
            <Route path="/admin/coupons" element={<AdminLayout><CouponsPage /></AdminLayout>} />
            <Route path="/admin/blog" element={<AdminLayout><BlogPage /></AdminLayout>} />
            <Route path="/admin/documents" element={<AdminLayout><DocumentsPage /></AdminLayout>} />
            <Route path="/admin/notifications" element={<AdminLayout><NotificationsPage /></AdminLayout>} />
            <Route path="/admin/settings" element={<AdminLayout><SettingsPage /></AdminLayout>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </RoleProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
