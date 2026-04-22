import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Plane, Search, AlertCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useState } from "react";

const FluglizenzMemberPage = () => {
  const [search, setSearch] = useState("");

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

  const extractAsdNumber = (dn?: string | null): number => {
    if (!dn) return Number.POSITIVE_INFINITY;
    const digits = dn.replace(/\D/g, "");
    return digits ? parseInt(digits, 10) : Number.POSITIVE_INFINITY;
  };

  const filtered = (members || [])
    .filter((m: any) => {
      if (!search.trim()) return true;
      const q = search.toLowerCase().trim();
      return (
        (m.internal_dienstnummer || "").toLowerCase().includes(q) ||
        (m.dienstnummer || "").toLowerCase().includes(q) ||
        (m.name || "").toLowerCase().includes(q)
      );
    })
    .sort((a: any, b: any) => {
      const na = extractAsdNumber(a.internal_dienstnummer);
      const nb = extractAsdNumber(b.internal_dienstnummer);
      if (na !== nb) return na - nb;
      return (a.name || "").localeCompare(b.name || "");
    });

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
            placeholder="Nach interner ASD-DN, PD-DN oder Name suchen..."
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
            <div
              key={m.id}
              className="bg-gradient-to-b from-sky-500/20 to-sky-500/5 border border-sky-500/30 rounded-lg p-4"
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
              {m.internal_dienstnummer && (
                <div className="mt-2 inline-flex items-center gap-1 bg-primary/15 border border-primary/40 rounded-md px-2 py-0.5">
                  <span className="text-[9px] uppercase tracking-wider text-primary/70 font-semibold">ASD</span>
                  <span className="text-xs font-mono font-bold text-primary">{m.internal_dienstnummer}</span>
                </div>
              )}
              {!m.internal_dienstnummer && (
                <div className="mt-2 inline-flex items-center gap-1 bg-amber-500/10 border border-amber-500/30 rounded-md px-2 py-0.5">
                  <AlertCircle className="w-3 h-3 text-amber-300" />
                  <span className="text-[9px] uppercase tracking-wider text-amber-300 font-semibold">Keine ASD-DN</span>
                </div>
              )}
              {m.dienstnummer && (
                <p className="text-[10px] text-muted-foreground font-mono mt-1">PD · {m.dienstnummer}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default FluglizenzMemberPage;
