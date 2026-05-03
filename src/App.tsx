import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { lazy, Suspense } from "react";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import Layout from "./components/Layout";
import Auth from "./pages/Auth";
import WaitingApproval from "./pages/WaitingApproval";
import NotFound from "./pages/NotFound";

const Index = lazy(() => import("./pages/Index"));
const MemberPage = lazy(() => import("./pages/MemberPage"));
const EinsatzPage = lazy(() => import("./pages/EinsatzPage"));
const ProtokollePage = lazy(() => import("./pages/ProtokollePage"));
const FamilienPage = lazy(() => import("./pages/FamilienPage"));
const StatistikPage = lazy(() => import("./pages/StatistikPage"));
const FluglizenzenPage = lazy(() => import("./pages/FluglizenzenPage"));
const FluglizenzMemberPage = lazy(() => import("./pages/FluglizenzMemberPage"));
const BewerbungssperrePage = lazy(() => import("./pages/BewerbungssperrePage"));
const GamblingPage = lazy(() => import("./pages/GamblingPage"));
const VerfolgungPage = lazy(() => import("./pages/VerfolgungPage"));
const AdminPanel = lazy(() => import("./pages/AdminPanel"));
const ProfilePage = lazy(() => import("./pages/ProfilePage"));
const AusbilderPage = lazy(() => import("./pages/AusbilderPage"));
const AufstellungsprotokollPage = lazy(() => import("./pages/AufstellungsprotokollPage"));
const UebungenPage = lazy(() => import("./pages/UebungenPage"));
const ASDApplicantDashboard = lazy(() => import("./pages/ASDApplicantDashboard"));
const FlightApplicantDashboard = lazy(() => import("./pages/FlightApplicantDashboard"));
const LernenPage = lazy(() => import("./pages/LernenPage"));
const AchievementsPage = lazy(() => import("./pages/AchievementsPage"));
const SearchRescuePage = lazy(() => import("./pages/SearchRescuePage"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000,
      gcTime: 5 * 60 * 1000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

const PageFallback = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <div className="text-primary animate-pulse">Laden...</div>
  </div>
);

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
      <Suspense fallback={<PageFallback />}>
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
      </Suspense>
    </Layout>
  );
};

const ASDDashboardRoute = () => {
  const { user, role, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center bg-background"><div className="text-primary animate-pulse">Laden...</div></div>;
  if (!user) return <Navigate to="/auth" replace />;
  if (role !== "asd_applicant") return <Navigate to="/" replace />;
  return <Suspense fallback={<PageFallback />}><ASDApplicantDashboard /></Suspense>;
};

const FlightDashboardRoute = () => {
  const { user, role, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center bg-background"><div className="text-primary animate-pulse">Laden...</div></div>;
  if (!user) return <Navigate to="/auth" replace />;
  if (role !== "flight_applicant") return <Navigate to="/" replace />;
  return <Suspense fallback={<PageFallback />}><FlightApplicantDashboard /></Suspense>;
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
