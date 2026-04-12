import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { GraduationCap, ClipboardCheck, FileCheck } from "lucide-react";
import TheoryExamResultsPage from "./TheoryExamResultsPage";
import TrainingModules from "@/components/TrainingModules";
import PracticalExam from "@/components/PracticalExam";

const AusbilderPage = () => {
  const { role } = useAuth();
  const [activeTab, setActiveTab] = useState("pruefungen");
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

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="w-full grid grid-cols-4 bg-secondary/50 border border-border">
          <TabsTrigger value="pruefungen" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <ClipboardCheck className="w-4 h-4" />
            Theorie
          </TabsTrigger>
          <TabsTrigger value="asd1" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <FileCheck className="w-4 h-4" />
            Praxis ASD 1
          </TabsTrigger>
          <TabsTrigger value="asd2" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <FileCheck className="w-4 h-4" />
            Praxis ASD 2
          </TabsTrigger>
          <TabsTrigger value="ausbildungen" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <GraduationCap className="w-4 h-4" />
            Ausbildungen
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pruefungen" className="mt-6">
          <TheoryExamResultsPage />
        </TabsContent>

        <TabsContent value="asd1" className="mt-6">
          <PracticalExam examType="ASD1" />
        </TabsContent>

        <TabsContent value="asd2" className="mt-6">
          <PracticalExam examType="ASD2" />
        </TabsContent>

        <TabsContent value="ausbildungen" className="mt-6">
          <TrainingModules onNavigateToExam={(examType) => setActiveTab(examType === "ASD1" ? "asd1" : "asd2")} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AusbilderPage;
