import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AdminLayout } from "@/components/AdminLayout";
import DashboardPage from "./pages/DashboardPage";
import AgenciesPage from "./pages/AgenciesPage";
import PackagesPage from "./pages/PackagesPage";
import BookingsPage from "./pages/BookingsPage";
import WalletPage from "./pages/WalletPage";
import UsersPage from "./pages/UsersPage";
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
        <AdminLayout>
          <Routes>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/agencies" element={<AgenciesPage />} />
            <Route path="/packages" element={<PackagesPage />} />
            <Route path="/bookings" element={<BookingsPage />} />
            <Route path="/wallet" element={<WalletPage />} />
            <Route path="/users" element={<UsersPage />} />
            <Route path="/documents" element={<DocumentsPage />} />
            <Route path="/notifications" element={<NotificationsPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AdminLayout>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
