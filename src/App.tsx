import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import Layout from "./components/Layout";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import WaitingApproval from "./pages/WaitingApproval";
import MemberPage from "./pages/MemberPage";
import EinsatzPage from "./pages/EinsatzPage";
import ProtokollePage from "./pages/ProtokollePage";
import FamilienPage from "./pages/FamilienPage";
import StatistikPage from "./pages/StatistikPage";
import FluglizenzenPage from "./pages/FluglizenzenPage";
import BewerbungssperrePage from "./pages/BewerbungssperrePage";
import GamblingPage from "./pages/GamblingPage";
import VerfolgungPage from "./pages/VerfolgungPage";
import AdminPanel from "./pages/AdminPanel";
import ProfilePage from "./pages/ProfilePage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const ProtectedRoutes = () => {
  const { user, isApproved, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-primary animate-pulse">Laden...</div>
      </div>
    );
  }

  if (!user) return <Navigate to="/auth" replace />;
  if (!isApproved) return <WaitingApproval />;

  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Index />} />
        <Route path="/gambling" element={<GamblingPage />} />
        <Route path="/verfolgung" element={<VerfolgungPage />} />
        <Route path="/einsatz" element={<EinsatzPage />} />
        <Route path="/protokolle" element={<ProtokollePage />} />
        <Route path="/familien" element={<FamilienPage />} />
        <Route path="/statistik" element={<StatistikPage />} />
        <Route path="/member" element={<MemberPage />} />
        <Route path="/fluglizenzen" element={<FluglizenzenPage />} />
        <Route path="/bewerbungssperre" element={<BewerbungssperrePage />} />
        <Route path="/admin" element={<AdminPanel />} />
        <Route path="/profil" element={<ProfilePage />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Layout>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/auth" element={<Auth />} />
            <Route path="/*" element={<ProtectedRoutes />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
