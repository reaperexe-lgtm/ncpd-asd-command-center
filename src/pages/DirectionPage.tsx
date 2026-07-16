import { lazy, Suspense } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertTriangle } from "lucide-react";

const SanktionenPage = lazy(() => import("./SanktionenPage"));

const Fallback = () => (
  <div className="p-8 text-primary animate-pulse">Laden...</div>
);

export default function DirectionPage() {
  const { role, isAdmin, loading } = useAuth();

  if (loading) return <Fallback />;

  const allowed = isAdmin || role === "director" || role === "co_director";
  if (!allowed) return <Navigate to="/" replace />;

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex items-center gap-2">
        <AlertTriangle className="w-5 h-5 text-primary" />
        <h1 className="text-2xl font-bold text-primary tracking-wide">Direction</h1>
      </div>
      <Tabs defaultValue="sanktionen" className="w-full">
        <TabsList>
          <TabsTrigger value="sanktionen">Sanktionen</TabsTrigger>
        </TabsList>
        <TabsContent value="sanktionen" className="mt-4">
          <Suspense fallback={<Fallback />}>
            <SanktionenPage />
          </Suspense>
        </TabsContent>
      </Tabs>
    </div>
  );
}
