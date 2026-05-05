import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ChevronUp, ChevronDown, Layers } from "lucide-react";
import { toast } from "sonner";

const DEFAULT_NAV = [
  { to: "/", label: "Home", emoji: "🏠" },
  { to: "/gambling", label: "Gambling", emoji: "🎰" },
  { to: "/verfolgung", label: "10-80", emoji: "🚔" },
  { to: "/einsatz", label: "Einsatz", emoji: "🚨" },
  { to: "/protokolle", label: "Protokolle", emoji: "📄" },
  { to: "/familien", label: "Familien", emoji: "👥" },
  { to: "/statistik", label: "Statistik", emoji: "📊" },
  { to: "/member", label: "Member", emoji: "👤" },
  { to: "/fluglizenzen", label: "Fluglizenzen", emoji: "✈️" },
  { to: "/fluglizenz-member", label: "Lizenz-Inhaber", emoji: "🛩️" },
  { to: "/bewerbungssperre", label: "Sperre", emoji: "🚫" },
  { to: "/aufstellungsprotokoll", label: "Aufstellung", emoji: "📋" },
  { to: "/uebungen", label: "Übungen", emoji: "🎯" },
  { to: "/lernen", label: "Lernen", emoji: "📚" },
  { to: "/achievements", label: "Achievements", emoji: "🏆" },
  { to: "/search-rescue", label: "Search & Rescue", emoji: "🚁" },
  { to: "/ortskunde", label: "Ortskunde", emoji: "🗺️" },
];

export default function NavOrderSection() {
  const qc = useQueryClient();
  const [order, setOrder] = useState<string[]>(DEFAULT_NAV.map(n => n.to));

  const { data } = useQuery({
    queryKey: ["nav-order-admin"],
    queryFn: async () => {
      const { data } = await supabase.from("nav_order").select("nav_key, sort_order").order("sort_order");
      return data || [];
    },
  });

  useEffect(() => {
    if (!data) return;
    if (data.length === 0) return;
    const known = data.map(d => d.nav_key);
    const missing = DEFAULT_NAV.map(n => n.to).filter(k => !known.includes(k));
    setOrder([...known, ...missing]);
  }, [data]);

  const save = useMutation({
    mutationFn: async (newOrder: string[]) => {
      // Upsert each
      const rows = newOrder.map((k, i) => ({ nav_key: k, sort_order: i }));
      const { error } = await supabase.from("nav_order").upsert(rows, { onConflict: "nav_key" });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["nav-order-admin"] });
      qc.invalidateQueries({ queryKey: ["nav-order"] });
      toast.success("Reihenfolge gespeichert");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const move = (idx: number, dir: -1 | 1) => {
    const next = [...order];
    const j = idx + dir;
    if (j < 0 || j >= next.length) return;
    [next[idx], next[j]] = [next[j], next[idx]];
    setOrder(next);
    save.mutate(next);
  };

  const labelOf = (key: string) => DEFAULT_NAV.find(n => n.to === key) || { emoji: "📌", label: key };

  return (
    <div className="bg-card border border-border rounded-lg p-5 space-y-3">
      <h2 className="text-sm font-bold text-primary uppercase tracking-wider flex items-center gap-2">
        <Layers className="w-4 h-4" /> Navigation-Reihenfolge
      </h2>
      <p className="text-xs text-muted-foreground">Verschiebe die Reiter in der Sidebar nach Belieben.</p>
      <div className="space-y-1">
        {order.map((key, idx) => {
          const item = labelOf(key);
          return (
            <div key={key} className="flex items-center gap-2 px-3 py-2 bg-background rounded border border-border">
              <span className="text-lg">{item.emoji}</span>
              <span className="flex-1 text-sm">{item.label}</span>
              <span className="text-xs text-muted-foreground font-mono">{key}</span>
              <Button size="icon" variant="ghost" disabled={idx === 0} onClick={() => move(idx, -1)}>
                <ChevronUp className="w-4 h-4" />
              </Button>
              <Button size="icon" variant="ghost" disabled={idx === order.length - 1} onClick={() => move(idx, 1)}>
                <ChevronDown className="w-4 h-4" />
              </Button>
            </div>
          );
        })}
      </div>
    </div>
  );
}