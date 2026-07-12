import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Plane, Search, FileText, Siren, Users } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { countCrewParticipationsForUser, countMissionsForUser } from "@/lib/missionStats";

const FluglizenzMemberPage = () => {
  const [search, setSearch] = useState("");
  const [selectedMember, setSelectedMember] = useState<any>(null);

  const { data: members, isLoading } = useQuery({
    queryKey: ["flight-license-members"],
    queryFn: async () => {
      const { data: roles } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "flight_license");
      const userIds = (roles || []).map((r) => r.user_id);
      if (userIds.length === 0) return [];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("*")
        .in("id", userIds);
      return profiles || [];
    },
  });

  const { data: memberStats } = useQuery({
    queryKey: ["flight-member-stats", selectedMember?.id],
    enabled: !!selectedMember,
    queryFn: async () => {
      const uid = selectedMember.id;
      const name = selectedMember.name;
      const { count: missionsCreated } = await supabase.from("missions").select("*", { count: "exact", head: true }).eq("created_by", uid);
      const { data: allMissionRows } = await supabase.from("missions").select("created_by, protokollschreiber, pilot, co_pilot, left_gunner, right_gunner");
      const protokolle = countMissionsForUser(allMissionRows || [], uid);
      const { count: pursuitsCreated } = await supabase.from("pursuits").select("*", { count: "exact", head: true }).eq("created_by", uid);
      const { data: allMissions } = await supabase.from("missions").select("pilot, co_pilot, left_gunner, right_gunner");
      const missionsCrew = countCrewParticipationsForUser(allMissions || [], name);
      const { data: allPursuits } = await supabase.from("pursuits").select("pilot, co_pilot, left_gunner, right_gunner");
      let pursuitsCrew = 0;
      allPursuits?.forEach((p) => {
        if ([p.pilot, p.co_pilot, p.left_gunner, p.right_gunner].includes(name)) pursuitsCrew++;
      });
      const { count: flightLicenses } = await supabase.from("flight_licenses").select("*", { count: "exact", head: true }).eq("name", name);
      return {
        missionsCreated: missionsCreated || 0,
        protokolle: protokolle || 0,
        pursuitsCreated: pursuitsCreated || 0,
        missionsCrew,
        pursuitsCrew,
        flightLicenses: flightLicenses || 0,
      };
    },
  });

  const filtered = (members || [])
    .filter((m: any) => {
      if (!search.trim()) return true;
      const q = search.toLowerCase().trim();
      return (
        (m.dienstnummer || "").toLowerCase().includes(q) ||
        (m.name || "").toLowerCase().includes(q)
      );
    })
    .sort((a: any, b: any) => (a.name || "").localeCompare(b.name || ""));

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Plane className="w-7 h-7 text-primary" />
        <div>
          <h1 className="text-2xl font-bold text-primary">Fluglizenz-Inhaber</h1>
          <p className="text-xs text-muted-foreground">
            {members?.length || 0} aktive Fluglizenz-Inhaber
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[220px] max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Nach PD-DN oder Name suchen..."
            className="pl-9 bg-background border-border"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="text-primary animate-pulse">Lade Fluglizenz-Inhaber...</div>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground text-sm">
          Keine Fluglizenz-Inhaber gefunden.
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          {filtered.map((m: any) => (
            <button
              key={m.id}
              onClick={() => setSelectedMember(m)}
              className="bg-gradient-to-b from-sky-500/20 to-sky-500/5 border border-sky-500/30 rounded-lg p-4 hover:scale-[1.02] transition-transform duration-150 text-left"
            >
              <div className="aspect-square bg-background/50 rounded-md overflow-hidden border border-border/50 mb-3">
                {m.image_url ? (
                  <img src={m.image_url} alt={m.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-4xl font-bold text-muted-foreground/20">
                    {m.name?.charAt(0)?.toUpperCase() || "?"}
                  </div>
                )}
              </div>
              <h3 className="font-bold text-sm text-sky-300">{m.name}</h3>
              <p className="text-[10px] text-muted-foreground mt-0.5 flex items-center gap-1">
                <Plane className="w-3 h-3" />
                Fluglizenz
              </p>
              {m.dienstnummer && (
                <p className="text-[10px] text-muted-foreground font-mono mt-2">PD · {m.dienstnummer}</p>
              )}
            </button>
          ))}
        </div>
      )}

      <Dialog open={!!selectedMember} onOpenChange={(open) => { if (!open) setSelectedMember(null); }}>
        <DialogContent className="sm:max-w-lg bg-card border-border max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-sky-300 flex items-center gap-3">
              {selectedMember?.image_url ? (
                <img src={selectedMember.image_url} alt="" className="w-10 h-10 rounded-full object-cover border border-border" />
              ) : (
                <div className="w-10 h-10 rounded-full bg-sky-500/10 flex items-center justify-center text-sky-300 font-bold">
                  {selectedMember?.name?.charAt(0)?.toUpperCase()}
                </div>
              )}
              <div>
                <span>{selectedMember?.name}</span>
                <p className="text-xs text-muted-foreground font-normal flex items-center gap-1">
                  <Plane className="w-3 h-3" /> Fluglizenz
                  {selectedMember?.dienstnummer && ` · PD ${selectedMember.dienstnummer}`}
                </p>
              </div>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Statistiken</h3>
            <div className="grid grid-cols-2 gap-3">
              {[
                { icon: FileText, label: "Einsätze erstellt", value: memberStats?.missionsCreated },
                { icon: FileText, label: "Protokolle geschrieben", value: memberStats?.protokolle },
                { icon: Siren, label: "10-80 erstellt", value: memberStats?.pursuitsCreated },
                { icon: Users, label: "Heli-Beteiligungen", value: memberStats?.missionsCrew },
                { icon: Siren, label: "10-80 Besatzung", value: memberStats?.pursuitsCrew },
                { icon: Plane, label: "Fluglizenzen", value: memberStats?.flightLicenses },
              ].map(({ icon: Icon, label, value }) => (
                <div key={label} className="bg-background/50 border border-border/50 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <Icon className="w-3.5 h-3.5 text-sky-400/60" />
                    <span className="text-[10px] text-muted-foreground uppercase tracking-wider">{label}</span>
                  </div>
                  <p className="text-xl font-bold text-sky-300 tabular-nums">{value ?? "–"}</p>
                </div>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default FluglizenzMemberPage;
