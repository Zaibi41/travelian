import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AdminLayout } from "@/components/AdminLayout";
import { RoleProvider } from "@/contexts/RoleContext";
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
          <AdminLayout>
            <Routes>
              <Route path="/" element={<DashboardPage />} />
              <Route path="/agencies" element={<AgenciesPage />} />
              <Route path="/packages" element={<PackagesPage />} />
              <Route path="/tours" element={<TourPackagesPage />} />
              <Route path="/visa" element={<VisaPackagesPage />} />
              <Route path="/bookings" element={<BookingsPage />} />
              <Route path="/tickets" element={<TicketsPage />} />
              <Route path="/hotels" element={<HotelsPage />} />
              <Route path="/flights" element={<FlightsPage />} />
              <Route path="/wallet" element={<WalletPage />} />
              <Route path="/users" element={<UsersPage />} />
              <Route path="/rbac" element={<RBACPage />} />
              <Route path="/coupons" element={<CouponsPage />} />
              <Route path="/blog" element={<BlogPage />} />
              <Route path="/documents" element={<DocumentsPage />} />
              <Route path="/notifications" element={<NotificationsPage />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </AdminLayout>
        </RoleProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
