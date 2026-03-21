import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Users } from "lucide-react";

const ROLE_LABELS: Record<string, string> = {
  director: "Director", co_director: "Co-Director", supervisor: "Supervisor",
  ausbilder: "Ausbilder", trial_ausbilder: "Trial-Ausbilder", member: "Member", trial_member: "Trial Member",
};
const ROLE_COLORS: Record<string, string> = {
  director: "from-red-500/20 to-red-500/5 border-red-500/30",
  co_director: "from-orange-500/20 to-orange-500/5 border-orange-500/30",
  supervisor: "from-yellow-500/20 to-yellow-500/5 border-yellow-500/30",
  ausbilder: "from-amber-500/20 to-amber-500/5 border-amber-500/30",
  trial_ausbilder: "from-lime-500/20 to-lime-500/5 border-lime-500/30",
  member: "from-primary/20 to-primary/5 border-primary/30",
  trial_member: "from-purple-500/20 to-purple-500/5 border-purple-500/30",
};
const ROLE_TEXT: Record<string, string> = {
  director: "text-red-400", co_director: "text-orange-400", supervisor: "text-yellow-400",
  ausbilder: "text-amber-300", trial_ausbilder: "text-lime-400", member: "text-primary", trial_member: "text-purple-400",
};
const ROLE_ORDER = ["director","co_director","supervisor","ausbilder","trial_ausbilder","member","trial_member"];
const HIDDEN_ROLES = ["admin"];

const MemberPage = () => {
  const { data: members, isLoading } = useQuery({
    queryKey: ["members"],
    queryFn: async () => {
      const { data: profiles } = await supabase.from("profiles").select("*").eq("is_approved", true);
      const { data: roles } = await supabase.from("user_roles").select("*");
      return (profiles || []).map((p) => ({
        ...p,
        role: roles?.find((r) => r.user_id === p.id)?.role || "trial_member",
      })).filter((m) => !HIDDEN_ROLES.includes(m.role))
        .sort((a, b) => ROLE_ORDER.indexOf(a.role) - ROLE_ORDER.indexOf(b.role));
    },
  });

  // Group by role
  const grouped: Record<string, typeof members> = {};
  members?.forEach((m) => {
    if (!grouped[m.role]) grouped[m.role] = [];
    grouped[m.role]!.push(m);
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Users className="w-7 h-7 text-primary" />
        <div>
          <h1 className="text-2xl font-bold text-primary">Member</h1>
          <p className="text-xs text-muted-foreground">{members?.length || 0} aktive Mitglieder</p>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><div className="text-primary animate-pulse">Lade Mitglieder...</div></div>
      ) : (
        <div className="space-y-8">
          {ROLE_ORDER.filter((r) => grouped[r]?.length).map((role) => (
            <div key={role}>
              <h2 className={`text-sm font-bold uppercase tracking-wider mb-3 ${ROLE_TEXT[role]}`}>
                {ROLE_LABELS[role]} ({grouped[role]!.length})
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                {grouped[role]!.map((m) => (
                  <div
                    key={m.id}
                    className={`bg-gradient-to-b ${ROLE_COLORS[role]} border rounded-lg p-4 hover:scale-[1.02] transition-transform duration-150`}
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
                    <h3 className={`font-bold text-sm ${ROLE_TEXT[role]}`}>{m.name}</h3>
                    <p className="text-[10px] text-muted-foreground mt-0.5">{ROLE_LABELS[role]}</p>
                    {m.dienstnummer && <p className="text-[10px] text-muted-foreground font-mono">{m.dienstnummer}</p>}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MemberPage;
