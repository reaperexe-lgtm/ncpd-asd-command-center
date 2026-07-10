import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { GraduationCap, ClipboardCheck, FileCheck, Users, BarChart3, Phone, Plane, LifeBuoy } from "lucide-react";
import TheoryExamResultsPage from "./TheoryExamResultsPage";
import TrainingModules from "@/components/TrainingModules";
import PracticalExam from "@/components/PracticalExam";
import ASDApplicantManagement from "@/components/ASDApplicantManagement";
import FlightApplicantManagement from "@/components/FlightApplicantManagement";
import AusbilderStatistik from "@/components/AusbilderStatistik";
import AusbilderKontakte from "@/components/AusbilderKontakte";
import SearchAndRescueContent from "@/components/SearchAndRescueContent";
import SRTrainingSignups from "@/components/SRTrainingSignups";
import SRMemberProgress from "@/components/SRMemberProgress";

const AusbilderPage = () => {
  const { role } = useAuth();
  const [activeTab, setActiveTab] = useState("pruefungen");
  const canAccess = ["admin", "director", "co_director", "supervisor", "ausbilder", "trial_ausbilder", "team_red"].includes(role || "");

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
        <TabsList className="w-full grid grid-cols-9 bg-secondary/50 border border-border">
          <TabsTrigger value="pruefungen" className="gap-1.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-xs">
            <ClipboardCheck className="w-4 h-4" />
            Theorie
          </TabsTrigger>
          <TabsTrigger value="asd1" className="gap-1.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-xs">
            <FileCheck className="w-4 h-4" />
            Vorabprüfung 1
          </TabsTrigger>
          <TabsTrigger value="asd2" className="gap-1.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-xs">
            <FileCheck className="w-4 h-4" />
            Vorabprüfung 2
          </TabsTrigger>
          <TabsTrigger value="ausbildungen" className="gap-1.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-xs">
            <GraduationCap className="w-4 h-4" />
            Ausbildungen
          </TabsTrigger>
          <TabsTrigger value="bewerber" className="gap-1.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-xs">
            <Users className="w-4 h-4" />
            ASD-Bewerber
          </TabsTrigger>
          <TabsTrigger value="fluglizenz" className="gap-1.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-xs">
            <Plane className="w-4 h-4" />
            Fluglizenz
          </TabsTrigger>
          <TabsTrigger value="sr" className="gap-1.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-xs">
            <LifeBuoy className="w-4 h-4" />
            Search & Rescue
          </TabsTrigger>
          <TabsTrigger value="kontakte" className="gap-1.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-xs">
            <Phone className="w-4 h-4" />
            Kontakte
          </TabsTrigger>
          <TabsTrigger value="statistik" className="gap-1.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-xs">
            <BarChart3 className="w-4 h-4" />
            Statistik
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

        <TabsContent value="bewerber" className="mt-6">
          <ASDApplicantManagement />
        </TabsContent>

        <TabsContent value="fluglizenz" className="mt-6">
          <FlightApplicantManagement />
        </TabsContent>

        <TabsContent value="sr" className="mt-6">
          <Tabs defaultValue="signups" className="w-full">
            <TabsList className="bg-secondary/50 border border-border">
              <TabsTrigger value="signups" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-xs">Anmeldungen</TabsTrigger>
              <TabsTrigger value="progress" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-xs">Modulfortschritt</TabsTrigger>
              <TabsTrigger value="theorie" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-xs">Theorie</TabsTrigger>
            </TabsList>
            <TabsContent value="signups" className="mt-4"><SRTrainingSignups /></TabsContent>
            <TabsContent value="progress" className="mt-4"><SRMemberProgress /></TabsContent>
            <TabsContent value="theorie" className="mt-4"><SearchAndRescueContent /></TabsContent>
          </Tabs>
        </TabsContent>

        <TabsContent value="kontakte" className="mt-6">
          <AusbilderKontakte />
        </TabsContent>

        <TabsContent value="statistik" className="mt-6">
          <AusbilderStatistik />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AusbilderPage;
