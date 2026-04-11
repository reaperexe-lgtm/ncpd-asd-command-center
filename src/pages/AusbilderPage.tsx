import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { GraduationCap, ClipboardCheck } from "lucide-react";
import TheoryExamResultsPage from "./TheoryExamResultsPage";
import TrainingModules from "@/components/TrainingModules";

const AusbilderPage = () => {
  const { role } = useAuth();
  const canAccess = ["admin", "director", "co_director", "supervisor", "ausbilder", "trial_ausbilder"].includes(role || "");

  if (!canAccess) {
    return <div className="text-center py-12 text-muted-foreground">Keine Berechtigung.</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Ausbilder</h1>
        <p className="text-sm text-muted-foreground mt-1">Prüfungen & Ausbildungen verwalten</p>
      </div>

      <Tabs defaultValue="pruefungen" className="w-full">
        <TabsList className="w-full grid grid-cols-2 bg-secondary/50 border border-border">
          <TabsTrigger value="pruefungen" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <ClipboardCheck className="w-4 h-4" />
            Prüfungen
          </TabsTrigger>
          <TabsTrigger value="ausbildungen" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <GraduationCap className="w-4 h-4" />
            Ausbildungen
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pruefungen" className="mt-6">
          <TheoryExamResultsPage />
        </TabsContent>

        <TabsContent value="ausbildungen" className="mt-6">
          <TrainingModules />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AusbilderPage;
