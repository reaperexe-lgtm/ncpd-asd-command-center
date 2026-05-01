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
import FluglizenzMemberPage from "./pages/FluglizenzMemberPage";
import BewerbungssperrePage from "./pages/BewerbungssperrePage";
import GamblingPage from "./pages/GamblingPage";
import VerfolgungPage from "./pages/VerfolgungPage";
import AdminPanel from "./pages/AdminPanel";
import ProfilePage from "./pages/ProfilePage";
import AusbilderPage from "./pages/AusbilderPage";
import AufstellungsprotokollPage from "./pages/AufstellungsprotokollPage";
import UebungenPage from "./pages/UebungenPage";
import ASDApplicantDashboard from "./pages/ASDApplicantDashboard";
import FlightApplicantDashboard from "./pages/FlightApplicantDashboard";
import LernenPage from "./pages/LernenPage";
import AchievementsPage from "./pages/AchievementsPage";
import SearchRescuePage from "./pages/SearchRescuePage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const ProtectedRoutes = () => {
  const { user, isApproved, role, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-primary animate-pulse">Laden...</div>
      </div>
    );
  }

  if (!user) return <Navigate to="/auth" replace />;
  if (role === "asd_applicant") return <Navigate to="/asd-dashboard" replace />;
  if (role === "flight_applicant") return <Navigate to="/flight-dashboard" replace />;
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
        <Route path="/fluglizenz-member" element={<FluglizenzMemberPage />} />
        <Route path="/bewerbungssperre" element={<BewerbungssperrePage />} />
        <Route path="/admin" element={<AdminPanel />} />
        <Route path="/profil" element={<ProfilePage />} />
        <Route path="/ausbilder" element={<AusbilderPage />} />
        <Route path="/aufstellungsprotokoll" element={<AufstellungsprotokollPage />} />
        <Route path="/uebungen" element={<UebungenPage />} />
        <Route path="/lernen" element={<LernenPage />} />
        <Route path="/achievements" element={<AchievementsPage />} />
        <Route path="/search-rescue" element={<SearchRescuePage />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Layout>
  );
};

const ASDDashboardRoute = () => {
  const { user, role, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center bg-background"><div className="text-primary animate-pulse">Laden...</div></div>;
  if (!user) return <Navigate to="/auth" replace />;
  if (role !== "asd_applicant") return <Navigate to="/" replace />;
  return <ASDApplicantDashboard />;
};

const FlightDashboardRoute = () => {
  const { user, role, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center bg-background"><div className="text-primary animate-pulse">Laden...</div></div>;
  if (!user) return <Navigate to="/auth" replace />;
  if (role !== "flight_applicant") return <Navigate to="/" replace />;
  return <FlightApplicantDashboard />;
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
            <Route path="/asd-dashboard" element={<ASDDashboardRoute />} />
            <Route path="/flight-dashboard" element={<FlightDashboardRoute />} />
            <Route path="/*" element={<ProtectedRoutes />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
