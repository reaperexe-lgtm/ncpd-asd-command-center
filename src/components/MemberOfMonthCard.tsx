import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Crown, Cake, PartyPopper } from "lucide-react";

/** Berechnet automatisch den Member of the (Vor-)Monats und cached ihn. */
const MemberOfMonthCard = () => {
  const now = new Date();
  // Member of LAST month (am 1. eines neuen Monats wird der vorherige gekürt)
  const targetDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const year = targetDate.getFullYear();
  const month = targetDate.getMonth() + 1; // 1-12

  const { data: cached, refetch } = useQuery({
    queryKey: ["mom-cached", year, month],
    queryFn: async () => {
      const { data } = await supabase.from("member_of_month").select("*").eq("year", year).eq("month", month).maybeSingle();
      if (!data) return null;
      const { data: prof } = await supabase.from("profiles").select("name, image_url, dienstnummer").eq("id", data.user_id).maybeSingle();
      return { ...data, profile: prof };
    },
  });

  // Calculate winner if not cached
  useEffect(() => {
    const compute = async () => {
      if (cached) return;
      const monthStart = new Date(year, month - 1, 1).toISOString();
      const monthEnd = new Date(year, month, 1).toISOString();

      const [missionsRes, pursuitsRes] = await Promise.all([
        supabase.from("missions").select("created_by").gte("created_at", monthStart).lt("created_at", monthEnd),
        supabase.from("pursuits").select("created_by").gte("created_at", monthStart).lt("created_at", monthEnd),
      ]);

      const score: Record<string, number> = {};
      (missionsRes.data || []).forEach((m: any) => { if (m.created_by) score[m.created_by] = (score[m.created_by] || 0) + 2; });
      (pursuitsRes.data || []).forEach((p: any) => { if (p.created_by) score[p.created_by] = (score[p.created_by] || 0) + 1; });

      const winner = Object.entries(score).sort(([, a], [, b]) => b - a)[0];
      if (!winner) return;

      await supabase.from("member_of_month").insert({
        year, month, user_id: winner[0], score: winner[1],
        details: { missions: (missionsRes.data || []).filter((m: any) => m.created_by === winner[0]).length,
                   pursuits: (pursuitsRes.data || []).filter((p: any) => p.created_by === winner[0]).length },
      } as any);
      refetch();
    };
    compute();
  }, [cached, year, month, refetch]);

  // Birthdays & jubilees this month
  const { data: profiles } = useQuery({
    queryKey: ["profiles-milestones"],
    queryFn: async () => {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, name, image_url, asd_join_date, created_at")
        .eq("is_approved", true);
      // birthday is in profiles_private and only readable by owner+admin.
      // RLS will silently return only allowed rows; merge them in.
      const { data: privs } = await supabase
        .from("profiles_private")
        .select("user_id, birthday");
      const bdayMap = new Map((privs || []).map((p: any) => [p.user_id, p.birthday]));
      return (profiles || []).map((p: any) => ({
        ...p,
        birthday: bdayMap.get(p.id) ?? null,
      }));
    },
  });

  const today = new Date();
  const currentMonth = today.getMonth() + 1;
  const birthdaysThisMonth = (profiles || []).filter((p: any) => {
    if (!p.birthday) return false;
    return new Date(p.birthday).getMonth() + 1 === currentMonth;
  });
  const jubileesThisMonth = (profiles || []).filter((p: any) => {
    const join = p.asd_join_date || p.created_at;
    if (!join) return false;
    const d = new Date(join);
    if (d.getMonth() + 1 !== currentMonth) return false;
    const years = today.getFullYear() - d.getFullYear();
    return years >= 1;
  }).map((p: any) => ({ ...p, years: today.getFullYear() - new Date(p.asd_join_date || p.created_at).getFullYear() }));

  const monthName = new Date(year, month - 1, 1).toLocaleDateString("de-DE", { month: "long", year: "numeric" });

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-base sm:text-lg flex items-center gap-2 text-primary">
          <Crown className="w-5 h-5" /> Highlights
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {cached?.profile ? (
          <div className="flex items-center gap-3 p-3 rounded-lg bg-gradient-to-r from-yellow-500/15 to-yellow-700/10 border border-yellow-500/40">
            <Crown className="w-7 h-7 text-yellow-400 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-[10px] uppercase tracking-wide text-yellow-400">Member of the Month – {monthName}</p>
              <p className="font-bold truncate">{cached.profile.name}</p>
              <p className="text-[10px] text-muted-foreground tabular-nums">
                Score {cached.score} · {(cached.details as any)?.missions ?? 0} Einsätze · {(cached.details as any)?.pursuits ?? 0} Verfolgungen
              </p>
            </div>
            {cached.profile.image_url && <img src={cached.profile.image_url} alt="" className="w-12 h-12 rounded-full object-cover border border-yellow-500/40" />}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">Member of the Month für {monthName} wird berechnet…</p>
        )}

        {birthdaysThisMonth.length > 0 && (
          <div>
            <p className="text-xs font-bold flex items-center gap-1 mb-1.5 text-pink-400"><Cake className="w-4 h-4" /> Geburtstage diesen Monat</p>
            <div className="flex flex-wrap gap-1.5">
              {birthdaysThisMonth.map((p: any) => (
                <span key={p.id} className="text-[11px] px-2 py-0.5 rounded-full bg-pink-500/10 border border-pink-500/30 text-pink-300">
                  🎂 {p.name} ({new Date(p.birthday).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit" })})
                </span>
              ))}
            </div>
          </div>
        )}

        {jubileesThisMonth.length > 0 && (
          <div>
            <p className="text-xs font-bold flex items-center gap-1 mb-1.5 text-purple-400"><PartyPopper className="w-4 h-4" /> Jubiläen diesen Monat</p>
            <div className="flex flex-wrap gap-1.5">
              {jubileesThisMonth.map((p: any) => (
                <span key={p.id} className="text-[11px] px-2 py-0.5 rounded-full bg-purple-500/10 border border-purple-500/30 text-purple-300">
                  🎉 {p.name} – {p.years} Jahr{p.years === 1 ? "" : "e"} in der ASD
                </span>
              ))}
            </div>
          </div>
        )}

        {birthdaysThisMonth.length === 0 && jubileesThisMonth.length === 0 && (
          <p className="text-[11px] text-muted-foreground">Keine Geburtstage / Jubiläen diesen Monat.</p>
        )}
      </CardContent>
    </Card>
  );
};

export default MemberOfMonthCard;