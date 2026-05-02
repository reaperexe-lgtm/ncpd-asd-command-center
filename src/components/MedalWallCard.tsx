import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Medal, Gem, Trophy, Search } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const TIER_ORDER: Record<string, number> = {
  bronze: 1, silver: 2, gold: 3, platinum: 4, diamond: 5,
};

const TIER_MEDAL_CLS: Record<string, string> = {
  bronze: "text-amber-500",
  silver: "text-slate-300",
  gold: "text-yellow-400",
  platinum: "text-cyan-300",
  diamond: "text-fuchsia-300",
};

const TIER_LABELS: Record<string, string> = {
  bronze: "Bronze", silver: "Silber", gold: "Gold", platinum: "Platin", diamond: "Diamant",
};

const TIER_SEQUENCE = ["bronze", "silver", "gold", "platinum", "diamond"];

const MedalWallCard = () => {
  const [search, setSearch] = useState("");
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  const { data: defs } = useQuery({
    queryKey: ["medal-wall-defs"],
    queryFn: async () => {
      const { data } = await supabase
        .from("achievement_definitions")
        .select("code, base_code, title, tier, threshold, sort_order")
        .eq("is_active", true);
      return data || [];
    },
  });

  const { data: owned } = useQuery({
    queryKey: ["medal-wall-owned"],
    queryFn: async () => {
      const { data } = await supabase
        .from("user_achievements")
        .select("user_id, achievement_code, awarded_at");
      return data || [];
    },
  });

  const { data: profiles } = useQuery({
    queryKey: ["medal-wall-profiles"],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("id, name, dienstnummer, image_url")
        .eq("is_approved", true);
      return data || [];
    },
  });

  const rows = useMemo(() => {
    if (!defs || !owned || !profiles) return [];
    const defByCode = new Map(defs.map((d: any) => [d.code, d]));

    // Group owned achievements per user, then per base_code → keep highest tier
    const byUser = new Map<string, Map<string, any>>();
    for (const o of owned) {
      const def = defByCode.get(o.achievement_code);
      if (!def) continue;
      const baseKey = def.base_code || def.code;
      if (!byUser.has(o.user_id)) byUser.set(o.user_id, new Map());
      const groupMap = byUser.get(o.user_id)!;
      const existing = groupMap.get(baseKey);
      const currentRank = TIER_ORDER[def.tier] || 0;
      const existingRank = existing ? TIER_ORDER[existing.tier] || 0 : -1;
      if (currentRank > existingRank) {
        groupMap.set(baseKey, {
          base_code: baseKey,
          tier: def.tier,
          title: def.title?.replace(/\s+(Bronze|Silber|Gold|Platin|Diamant)\s*$/i, "").trim() || def.title,
          sort_order: def.sort_order || 0,
          awarded_at: o.awarded_at,
        });
      }
    }

    return profiles
      .map((p: any) => {
        const medals = Array.from((byUser.get(p.id) || new Map()).values()) as any[];
        medals.sort((a, b) => (TIER_ORDER[b.tier] || 0) - (TIER_ORDER[a.tier] || 0) || a.sort_order - b.sort_order);
        const score = medals.reduce((sum, m) => sum + (TIER_ORDER[m.tier] || 0), 0);
        return { ...p, medals, score };
      })
      .filter((u: any) => u.medals.length > 0)
      .sort((a: any, b: any) => b.score - a.score || b.medals.length - a.medals.length || a.name.localeCompare(b.name));
  }, [defs, owned, profiles]);

  const filtered = rows.filter((u: any) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return u.name?.toLowerCase().includes(q) || u.dienstnummer?.toLowerCase().includes(q);
  });

  const selectedUser = rows.find((u: any) => u.id === selectedUserId)
    || profiles?.find((p: any) => p.id === selectedUserId);

  // Build full grouped achievements view (all base groups, all 5 tiers) with ownership for selected user
  const ownedSetForSelected = useMemo(() => {
    if (!selectedUserId || !owned) return new Set<string>();
    return new Set(
      owned.filter((o: any) => o.user_id === selectedUserId).map((o: any) => o.achievement_code),
    );
  }, [selectedUserId, owned]);

  const groupedDefs = useMemo(() => {
    if (!defs) return [] as any[];
    const map = new Map<string, any>();
    for (const d of defs as any[]) {
      const key = d.base_code || d.code;
      if (!map.has(key)) {
        map.set(key, {
          base: key,
          title: d.title?.replace(/\s+(Bronze|Silber|Gold|Platin|Diamant)\s*$/i, "").trim() || d.title,
          tiers: [],
        });
      }
      map.get(key).tiers.push(d);
    }
    return Array.from(map.values()).map((g: any) => ({
      ...g,
      tiers: g.tiers.sort(
        (a: any, b: any) =>
          (TIER_ORDER[a.tier] || 0) - (TIER_ORDER[b.tier] || 0) || (a.threshold || 0) - (b.threshold || 0),
      ),
    }));
  }, [defs]);

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-base sm:text-lg flex items-center gap-2 text-primary">
          <Trophy className="w-5 h-5" /> Medaillenwand
          <span className="ml-auto text-xs text-muted-foreground tabular-nums">
            {rows.length} {rows.length === 1 ? "Mitglied" : "Mitglieder"}
          </span>
        </CardTitle>
        <div className="relative mt-2">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Name oder Dienstnummer suchen…"
            className="pl-9"
          />
        </div>
      </CardHeader>
      <CardContent>
        {filtered.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">
            Noch niemand hat Medaillen freigeschaltet.
          </p>
        ) : (
          <div className="space-y-2">
            {filtered.map((u: any, idx: number) => (
              <div
                key={u.id}
                role="button"
                tabIndex={0}
                onClick={() => setSelectedUserId(u.id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setSelectedUserId(u.id);
                  }
                }}
                className="flex items-center gap-3 p-2.5 rounded-lg bg-background/40 border border-border hover:border-primary/60 hover:bg-background/70 transition-colors cursor-pointer"
              >
                <span className="w-7 text-center text-xs font-bold tabular-nums text-muted-foreground shrink-0">
                  #{idx + 1}
                </span>
                {u.image_url ? (
                  <img src={u.image_url} alt={u.name} className="w-10 h-10 rounded-full object-cover shrink-0" />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold shrink-0">
                    {u.name?.charAt(0)?.toUpperCase() || "?"}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-foreground leading-tight truncate">{u.name}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {u.dienstnummer ? `#${u.dienstnummer} · ` : ""}{u.medals.length} Medaille{u.medals.length === 1 ? "" : "n"}
                  </p>
                </div>
                <div className="flex items-center gap-1 flex-wrap justify-end max-w-[60%]">
                  {u.medals.map((m: any) => {
                    const Icon = m.tier === "diamond" ? Gem : Medal;
                    return (
                      <div
                        key={m.base_code}
                        title={`${m.title} · ${TIER_LABELS[m.tier] || m.tier}`}
                        className={`${TIER_MEDAL_CLS[m.tier] || "text-foreground"} drop-shadow-glow`}
                      >
                        <Icon className="w-5 h-5" />
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        <Dialog open={!!selectedUserId} onOpenChange={(open) => !open && setSelectedUserId(null)}>
          <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-3">
                {selectedUser?.image_url ? (
                  <img src={selectedUser.image_url} alt={selectedUser.name} className="w-10 h-10 rounded-full object-cover" />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold">
                    {selectedUser?.name?.charAt(0)?.toUpperCase() || "?"}
                  </div>
                )}
                <div className="min-w-0">
                  <p className="font-bold truncate">{selectedUser?.name}</p>
                  <p className="text-xs text-muted-foreground font-normal">
                    {selectedUser?.dienstnummer ? `#${selectedUser.dienstnummer} · ` : ""}
                    {ownedSetForSelected.size} Medaillen insgesamt
                  </p>
                </div>
              </DialogTitle>
            </DialogHeader>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
              {groupedDefs.map((g: any) => {
                const ownedTiers = g.tiers.filter((t: any) => ownedSetForSelected.has(t.code));
                const highest = ownedTiers[ownedTiers.length - 1];
                return (
                  <div
                    key={g.base}
                    className={`rounded-lg p-3 border ${
                      highest
                        ? `border-border bg-background/40`
                        : "border-border/50 bg-background/20 opacity-60"
                    }`}
                  >
                    <p className="text-sm font-bold text-foreground leading-tight mb-2">{g.title}</p>
                    <div className="flex items-center justify-between gap-1">
                      {g.tiers.map((t: any) => {
                        const earned = ownedSetForSelected.has(t.code);
                        const Icon = t.tier === "diamond" ? Gem : Medal;
                        return (
                          <div
                            key={t.code}
                            className={`flex flex-col items-center gap-0.5 flex-1 ${
                              earned ? TIER_MEDAL_CLS[t.tier] || "text-foreground" : "text-muted-foreground/30"
                            }`}
                            title={`${TIER_LABELS[t.tier] || t.tier} · ab ${t.threshold}`}
                          >
                            <Icon className={`w-5 h-5 ${earned ? "drop-shadow-glow" : ""}`} />
                            <span className="text-[8px] tabular-nums font-semibold">{t.threshold}</span>
                          </div>
                        );
                      })}
                    </div>
                    <p className="text-[10px] mt-1.5 text-muted-foreground tabular-nums">
                      {ownedTiers.length} / {g.tiers.length} freigeschaltet
                    </p>
                  </div>
                );
              })}
            </div>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
};

export default MedalWallCard;