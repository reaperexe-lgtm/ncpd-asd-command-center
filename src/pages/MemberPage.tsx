import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const ROLE_LABELS: Record<string, string> = {
  director: "Director", co_director: "Co-Director", supervisor: "Supervisor",
  ausbilder: "Ausbilder", trial_ausbilder: "Trial-Ausbilder", member: "Member", trial_member: "Trial Member",
};
const ROLE_COLORS: Record<string, string> = {
  director: "text-red-400", co_director: "text-orange-400", supervisor: "text-yellow-400",
  ausbilder: "text-amber-300", trial_ausbilder: "text-lime-400", member: "text-primary", trial_member: "text-purple-400",
};
const ROLE_ORDER = ["director","co_director","supervisor","ausbilder","trial_ausbilder","member","trial_member"];

const MemberPage = () => {
  const { data: members, isLoading } = useQuery({
    queryKey: ["members"],
    queryFn: async () => {
      const { data: profiles } = await supabase.from("profiles").select("*").eq("is_approved", true);
      const { data: roles } = await supabase.from("user_roles").select("*");
      return (profiles || []).map((p) => ({
        ...p,
        role: roles?.find((r) => r.user_id === p.id)?.role || "trial_member",
      })).sort((a, b) => ROLE_ORDER.indexOf(a.role) - ROLE_ORDER.indexOf(b.role));
    },
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-primary">Member</h1>
      {isLoading ? (
        <p className="text-muted-foreground">Lade...</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {members?.map((m) => (
            <div key={m.id} className="bg-card border border-border rounded-lg p-4 hover:border-primary/40 transition-colors">
              <h3 className={`font-bold ${ROLE_COLORS[m.role] || "text-primary"}`}>{m.name}</h3>
              <p className="text-xs text-muted-foreground">Aktueller Rang: {ROLE_LABELS[m.role] || m.role}</p>
              {m.dienstnummer && <p className="text-xs text-muted-foreground mt-1">{m.dienstnummer}</p>}
              <div className="mt-3 aspect-square bg-secondary/30 rounded-md overflow-hidden border border-border/50">
                {m.image_url ? (
                  <img src={m.image_url} alt={m.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-4xl text-muted-foreground/30">
                    {m.name?.charAt(0) || "?"}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MemberPage;
