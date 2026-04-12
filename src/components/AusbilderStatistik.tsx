import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { Trophy, GraduationCap, ClipboardCheck, FileCheck, CalendarIcon, X } from "lucide-react";
import { format, subDays, subMonths, startOfWeek, startOfMonth, endOfDay } from "date-fns";
import { de } from "date-fns/locale";
import { cn } from "@/lib/utils";

const TRAINER_ROLES = ["director", "co_director", "supervisor", "ausbilder", "trial_ausbilder"];

const ROLE_LABELS: Record<string, string> = {
  director: "Director",
  co_director: "Co-Director",
  supervisor: "Supervisor",
  ausbilder: "Ausbilder",
  trial_ausbilder: "Trial-Ausbilder",
};

const ROLE_BADGE_COLORS: Record<string, string> = {
  director: "bg-red-500/20 text-red-400 border-red-500/30",
  co_director: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  supervisor: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  ausbilder: "bg-amber-500/20 text-amber-300 border-amber-500/30",
  trial_ausbilder: "bg-lime-500/20 text-lime-400 border-lime-500/30",
};

type TimeFilter = "all" | "week" | "month" | "3months" | "custom";

const AusbilderStatistik = () => {
  const [timeFilter, setTimeFilter] = useState<TimeFilter>("all");
  const [customFrom, setCustomFrom] = useState<Date | undefined>();
  const [customTo, setCustomTo] = useState<Date | undefined>();

  const dateRange = useMemo(() => {
    const now = new Date();
    switch (timeFilter) {
      case "week":
        return { from: startOfWeek(now, { locale: de }), to: endOfDay(now) };
      case "month":
        return { from: startOfMonth(now), to: endOfDay(now) };
      case "3months":
        return { from: subMonths(now, 3), to: endOfDay(now) };
      case "custom":
        return { from: customFrom, to: customTo ? endOfDay(customTo) : undefined };
      default:
        return { from: undefined, to: undefined };
    }
  }, [timeFilter, customFrom, customTo]);

  const { data: trainers } = useQuery({
    queryKey: ["trainer-profiles"],
    queryFn: async () => {
      const { data: roles } = await supabase
        .from("user_roles")
        .select("user_id, role")
        .in("role", TRAINER_ROLES as any);
      if (!roles?.length) return [];
      const userIds = roles.map((r) => r.user_id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, name")
        .in("id", userIds);
      return (profiles || []).map((p) => ({
        ...p,
        role: roles.find((r) => r.user_id === p.id)?.role || "member",
      }));
    },
  });

  const { data: trainingProgress } = useQuery({
    queryKey: ["training-progress-stats", dateRange.from?.toISOString(), dateRange.to?.toISOString()],
    queryFn: async () => {
      let query = supabase
        .from("asd_applicant_progress")
        .select("completed_by, completed_at")
        .eq("completed", true)
        .not("completed_by", "is", null);
      if (dateRange.from) query = query.gte("completed_at", dateRange.from.toISOString());
      if (dateRange.to) query = query.lte("completed_at", dateRange.to.toISOString());
      const { data } = await query;
      return data || [];
    },
  });

  const { data: theoryReviews } = useQuery({
    queryKey: ["theory-review-stats", dateRange.from?.toISOString(), dateRange.to?.toISOString()],
    queryFn: async () => {
      let query = supabase
        .from("theory_exam_results")
        .select("reviewed_by, reviewed_at")
        .not("reviewed_by", "is", null);
      if (dateRange.from) query = query.gte("reviewed_at", dateRange.from.toISOString());
      if (dateRange.to) query = query.lte("reviewed_at", dateRange.to.toISOString());
      const { data } = await query;
      return data || [];
    },
  });

  const { data: practicalExams } = useQuery({
    queryKey: ["practical-exam-stats", dateRange.from?.toISOString(), dateRange.to?.toISOString()],
    queryFn: async () => {
      let query = supabase
        .from("practical_exam_results")
        .select("examiner_id, created_at");
      if (dateRange.from) query = query.gte("created_at", dateRange.from.toISOString());
      if (dateRange.to) query = query.lte("created_at", dateRange.to.toISOString());
      const { data } = await query;
      return data || [];
    },
  });

  const trainerStats = (trainers || [])
    .map((trainer) => {
      const moduleCount = (trainingProgress || []).filter((p) => p.completed_by === trainer.id).length;
      const theoryCount = (theoryReviews || []).filter((r) => r.reviewed_by === trainer.id).length;
      const practicalCount = (practicalExams || []).filter((e) => e.examiner_id === trainer.id).length;
      const total = moduleCount + theoryCount + practicalCount;
      return { ...trainer, moduleCount, theoryCount, practicalCount, total };
    })
    .sort((a, b) => b.total - a.total);

  const chartData = trainerStats
    .filter((t) => t.total > 0)
    .map((t) => ({ name: t.name, Ausbildungen: t.moduleCount, Theorie: t.theoryCount, Praxis: t.practicalCount }));

  const totalAll = trainerStats.reduce((s, t) => s + t.total, 0);
  const totalModules = trainerStats.reduce((s, t) => s + t.moduleCount, 0);
  const totalTheory = trainerStats.reduce((s, t) => s + t.theoryCount, 0);
  const totalPractical = trainerStats.reduce((s, t) => s + t.practicalCount, 0);

  const filterButtons: { key: TimeFilter; label: string }[] = [
    { key: "all", label: "Gesamt" },
    { key: "week", label: "Diese Woche" },
    { key: "month", label: "Dieser Monat" },
    { key: "3months", label: "3 Monate" },
    { key: "custom", label: "Benutzerdefiniert" },
  ];

  return (
    <div className="space-y-6">
      {/* Time Filter */}
      <Card className="bg-card border-border">
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium text-muted-foreground mr-2">Zeitraum:</span>
            {filterButtons.map((fb) => (
              <Button
                key={fb.key}
                size="sm"
                variant={timeFilter === fb.key ? "default" : "outline"}
                onClick={() => setTimeFilter(fb.key)}
                className="text-xs"
              >
                {fb.label}
              </Button>
            ))}
          </div>
          {timeFilter === "custom" && (
            <div className="flex flex-wrap items-center gap-3 mt-3">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className={cn("w-[160px] justify-start text-left text-xs", !customFrom && "text-muted-foreground")}>
                    <CalendarIcon className="w-3 h-3 mr-1" />
                    {customFrom ? format(customFrom, "dd.MM.yyyy") : "Von"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={customFrom} onSelect={setCustomFrom} initialFocus className={cn("p-3 pointer-events-auto")} />
                </PopoverContent>
              </Popover>
              <span className="text-muted-foreground text-xs">bis</span>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className={cn("w-[160px] justify-start text-left text-xs", !customTo && "text-muted-foreground")}>
                    <CalendarIcon className="w-3 h-3 mr-1" />
                    {customTo ? format(customTo, "dd.MM.yyyy") : "Bis"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={customTo} onSelect={setCustomTo} initialFocus className={cn("p-3 pointer-events-auto")} />
                </PopoverContent>
              </Popover>
              {(customFrom || customTo) && (
                <Button variant="ghost" size="sm" onClick={() => { setCustomFrom(undefined); setCustomTo(undefined); }}>
                  <X className="w-3 h-3" />
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-card border-border">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/20"><Trophy className="w-5 h-5 text-primary" /></div>
            <div>
              <p className="text-2xl font-bold text-foreground">{totalAll}</p>
              <p className="text-xs text-muted-foreground">Gesamt</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-500/20"><GraduationCap className="w-5 h-5 text-amber-400" /></div>
            <div>
              <p className="text-2xl font-bold text-foreground">{totalModules}</p>
              <p className="text-xs text-muted-foreground">Ausbildungsmodule</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-500/20"><ClipboardCheck className="w-5 h-5 text-blue-400" /></div>
            <div>
              <p className="text-2xl font-bold text-foreground">{totalTheory}</p>
              <p className="text-xs text-muted-foreground">Theorie-Prüfungen</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-500/20"><FileCheck className="w-5 h-5 text-green-400" /></div>
            <div>
              <p className="text-2xl font-bold text-foreground">{totalPractical}</p>
              <p className="text-xs text-muted-foreground">Praxis-Prüfungen</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Chart */}
      {chartData.length > 0 && (
        <Card className="bg-card border-border">
          <CardHeader><CardTitle className="text-foreground text-lg">Übersicht</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData} barGap={4}>
                <XAxis dataKey="name" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
                <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} allowDecimals={false} />
                <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", color: "hsl(var(--foreground))" }} />
                <Bar dataKey="Ausbildungen" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Theorie" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Praxis" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Trainer List */}
      <Card className="bg-card border-border">
        <CardHeader><CardTitle className="text-foreground text-lg">Ausbilder-Rangliste</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-3">
            {trainerStats.map((trainer, index) => (
              <div key={trainer.id} className="flex items-center justify-between p-3 rounded-lg bg-secondary/30 border border-border">
                <div className="flex items-center gap-3">
                  <span className="text-lg font-bold text-muted-foreground w-8 text-center">{index + 1}.</span>
                  <div>
                    <p className="font-medium text-foreground">{trainer.name}</p>
                    <Badge variant="outline" className={`text-xs ${ROLE_BADGE_COLORS[trainer.role] || ""}`}>
                      {ROLE_LABELS[trainer.role] || trainer.role}
                    </Badge>
                  </div>
                </div>
                <div className="flex items-center gap-4 text-sm">
                  <div className="text-center">
                    <p className="font-bold text-amber-400">{trainer.moduleCount}</p>
                    <p className="text-[10px] text-muted-foreground">Module</p>
                  </div>
                  <div className="text-center">
                    <p className="font-bold text-blue-400">{trainer.theoryCount}</p>
                    <p className="text-[10px] text-muted-foreground">Theorie</p>
                  </div>
                  <div className="text-center">
                    <p className="font-bold text-green-400">{trainer.practicalCount}</p>
                    <p className="text-[10px] text-muted-foreground">Praxis</p>
                  </div>
                  <div className="text-center border-l border-border pl-4">
                    <p className="font-bold text-primary text-lg">{trainer.total}</p>
                    <p className="text-[10px] text-muted-foreground">Gesamt</p>
                  </div>
                </div>
              </div>
            ))}
            {trainerStats.length === 0 && (
              <p className="text-center text-muted-foreground py-8">Keine Daten vorhanden.</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AusbilderStatistik;
